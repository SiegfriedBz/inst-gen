# Usage counters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, AGENTS.md) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count every model, search and image call per owner and app-wide in Upstash Redis, refuse kindly past the spec's limits, and show what's left in a one-line usage bar under the home tabs.

**Architecture:** A server-only `lib/usage/` meter takes counts atomically from a `UsageStore` (Redis through `@upstash/redis`, or memory off Vercel) before each route calls a model, and gives the owner's count back on failures that aren't the owner's. `GET /api/usage` answers what's left; a client `UsageProvider` reads it, the `UsageBar` shows it, and each section disables its button at 0 and shows the refusal line for a 429.

**Tech Stack:** Next.js 16 route handlers, `@upstash/redis` 1.39.0 (REST), zod, next-intl, Vitest, Playwright.

**Spec:** `docs/specs/platform/usage-counters/spec.md`

## Global Constraints

- Per owner a day: reads 3, attempts 3, rewrites 5, translations 30, newImages 10, replies 20; `dev` has none.
- Day: resets at 00:00 `America/Los_Angeles`; month: 1st 00:00 UTC. Daily keys expire after 2 days (172,800 s), monthly after 40 (3,456,000 s).
- `TEXT_DAILY_REQUESTS` default `gemini-3.5-flash-lite=500,gemini-3.8-flash=20`; `IMAGE_PRICE_USD=0.0504`; `IMAGE_MONTH_CAP_USD=8` (158 images pass, the 159th is refused); `SEARCHES_PER_MONTH=300`.
- Refusals: `limit_reached`, `pool_empty`, `images_month` → 429; `usage_unavailable` → 503; body `{ error, resetsAt }`. The search route answers a full month as `503 { error: "search_unavailable" }`.
- Owner's count given back on `model_busy`, `model_timeout`, `model_failed`, `image_blocked`, `image_timeout`, `image_failed`, `images_paused`, `search_busy`, `search_failed`; never on `aborted`; pools and months never given back.
- Redis keys hold only owner id, action, model id, date. Each Redis call cut at 2 s. Redis error: text goes ahead, images `usage_unavailable`.
- On Vercel (`VERCEL_ENV` set) without `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`: the gate's `misconfigured` 503. Elsewhere: memory store, logged once.
- Every visible string goes in `messages/en.json`, `id.json` and `vi.json` in the same commit, worded as the spec's Strings table.
- Exact dependency versions (`package.json` pins every one). Stage files by path. Conventional Commits with a scope from `commitlint.config.mjs` (`web` for shared code here, `posts`, `reviews`, `brand`, `deps`, `docs`).

## Review Focus

- A resumed run (decision 0005: a lost plan, rewrite, read or image step is asked again, up to twice) is a new request and is counted again; at 0 it must end on the refusal line, not on `model_failed` or a spinner. Task 7 tests a resumed plan answered 429.
- The phone's clock is not Pacific: a phone at 23:30 in Bali on the day of a US time change must show the right reset hour. Task 1 tests the March and November change days.
- Two tabs or two phones of one owner: the server is the truth; a stale bar showing 1 left must still show the refusal line after a 429. Task 7 tests a 429 while the bar says 1 left.
- A streamed plan that fails after its first post (an error line mid-stream) must still give the attempt back. Task 4 tests an error line after one post line.
- `TEXT_DAILY_REQUESTS` with spaces, an empty value or a bad number must not crash the server. Task 1 tests these.

---

### Task 1: The clock and the limits

**Files:**
- Create: `lib/usage/day.ts`, `lib/usage/limits.ts`
- Test: `tests/unit/usage-day.test.ts`, `tests/unit/usage-limits.test.ts`

**Interfaces:**
- Produces:
  - `USAGE_ZONE = 'America/Los_Angeles'`
  - `usageDay(now: Date): string` — the Pacific date, `YYYY-MM-DD`.
  - `nextReset(now: Date): Date` — the next 00:00 Pacific.
  - `usageMonth(now: Date): string` — `YYYY-MM` in UTC.
  - `nextMonth(now: Date): Date` — the next 1st, 00:00 UTC.
  - `OWNER_LIMITS = { reads: 3, attempts: 3, rewrites: 5, translations: 30, newImages: 10, replies: 20 } as const`; `type LimitedAction = keyof typeof OWNER_LIMITS`.
  - `UNLIMITED_OWNERS = ['dev'] as const`; `isLimited(ownerId: string): boolean`.
  - `type Env = Record<string, string | undefined>`.
  - `textPools(env?: Env): Map<string, number>` — parsed `TEXT_DAILY_REQUESTS`, default as in Global Constraints; bad entries skipped and logged once with `console.error('usage: TEXT_DAILY_REQUESTS entry ignored: …')`.
  - `imageMonthMax(env?: Env): number` — `Math.floor(cap / price + 1e-9)`; 158 with the defaults.
  - `searchesPerMonth(env?: Env): number` — default 300.

- [ ] **Step 1: Write the failing tests**

`usage-day.test.ts`:
- `usageDay(new Date('2026-11-15T07:59:00Z'))` is `'2026-11-14'`; at `08:00Z` it is `'2026-11-15'` (PST).
- `usageDay(new Date('2026-07-15T06:59:00Z'))` is `'2026-07-14'`; at `07:00Z`, `'2026-07-15'` (PDT).
- `nextReset(new Date('2026-11-15T03:00:00Z')).toISOString()` is `'2026-11-15T08:00:00.000Z'`; from `'2026-07-15T08:00:00Z'` it is `'2026-07-16T07:00:00.000Z'`.
- Change days: `nextReset(new Date('2026-03-08T12:00:00Z'))` is `'2026-03-09T07:00:00.000Z'`; `nextReset(new Date('2026-11-01T12:00:00Z'))` is `'2026-11-02T08:00:00.000Z'`.
- `usageMonth(new Date('2026-10-31T23:59:59Z'))` is `'2026-10'`; `nextMonth` of it is `'2026-11-01T00:00:00.000Z'`; `nextMonth(new Date('2026-12-05T00:00:00Z'))` is `'2027-01-01T00:00:00.000Z'`.

`usage-limits.test.ts`:
- `textPools({})` maps `gemini-3.5-flash-lite` to 500 and `gemini-3.8-flash` to 20.
- `textPools({ TEXT_DAILY_REQUESTS: ' a=5 , b=7 ' })` has exactly `a → 5`, `b → 7`.
- `textPools({ TEXT_DAILY_REQUESTS: 'a=5,b=x,=3,c' })` has only `a → 5`, and `console.error` was called; `textPools({ TEXT_DAILY_REQUESTS: '' })` is the default.
- `imageMonthMax({})` is 158; `imageMonthMax({ IMAGE_PRICE_USD: '0.1', IMAGE_MONTH_CAP_USD: '8' })` is 80; a bad number falls back to the default.
- `searchesPerMonth({})` is 300; `isLimited('dev')` false, `isLimited('sen')` true.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-day.test.ts tests/unit/usage-limits.test.ts`
Expected: FAIL, cannot resolve `@/lib/usage/day`.

- [ ] **Step 3: Implement `lib/usage/day.ts` and `lib/usage/limits.ts`**

Pacific dates come from `Intl.DateTimeFormat('en-CA', { timeZone: USAGE_ZONE, year, month, day })`. For `nextReset`, take tomorrow's Pacific date (y, m, d+1) and find its midnight:

```ts
// Midnight never falls inside a US time change (they happen at 02:00), so one
// correction by the zone's offset at the guess is exact.
function zonedMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - offsetMs(guess));
}
// offsetMs(t): the zone's wall clock at t, read with Intl as UTC fields, minus t.
```

Head both files with a comment pointing to the spec's "The owner's day: midnight Pacific" and "What is counted".

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/usage-day.test.ts tests/unit/usage-limits.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/usage/day.ts lib/usage/limits.ts tests/unit/usage-day.test.ts tests/unit/usage-limits.test.ts
git commit -m "feat(web): usage day, month and limits (roadmap 2.8)"
```

### Task 2: The store, Upstash and the configuration check

**Files:**
- Create: `lib/usage/store.ts`, `lib/usage/config.ts`
- Modify: `lib/pilot/runtime-config.ts`, `package.json`, `pnpm-lock.yaml`, `.env.example`
- Test: `tests/unit/usage-store.test.ts`, `tests/unit/usage-config.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 but `Env`.
- Produces:
  - `type Take = { key: string; max: number | null; ttlSeconds: number }` — `max: null` counts without a limit.
  - `type UsageStore = { take(items: Take[]): Promise<{ ok: true } | { ok: false; full: number }>; giveBack(key: string): Promise<void>; read(keys: string[]): Promise<number[]> }` — `take` is all-or-nothing: if any `count + 1 > max`, nothing changes and `full` is that item's index.
  - `memoryStore(now?: () => number): UsageStore` — honours `ttlSeconds`.
  - `redisStore(redis: Pick<Redis, 'eval' | 'decr' | 'mget'>): UsageStore` — `take` is one `EVAL` of `TAKE_SCRIPT` with the keys and `[max or -1, ttl]` pairs as args; returns `0` for ok or `index + 1` for the full one. Each call raced against a 2 s timeout that throws `UsageStoreError`.
  - `class UsageStoreError extends Error`.
  - `getUsageStore(env?: Env): UsageStore` — one per process: Redis with `new Redis({ url, token, retry: false })` when both Upstash variables are set; else memory, logging `usage: Upstash isn't configured, counting in memory` once.
  - `resetUsageStoreForTests(): void`.
  - `usageConfigProblem(env: Env): string | null` — `'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set on Vercel'` when `VERCEL_ENV` is set and either is missing.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add --save-exact @upstash/redis@1.39.0`
Expected: `package.json` has `"@upstash/redis": "1.39.0"`; the lockfile changes.

- [ ] **Step 2: Write the failing tests**

`usage-store.test.ts` (memory store):
- two items with room: `take` is `{ ok: true }` and `read` gives `[1, 1]`;
- second item at `max`: `{ ok: false, full: 1 }` and neither count moved;
- `max: null` never refuses;
- 5 `take`s of `max: 3` started together with `Promise.all`: exactly 3 ok;
- `giveBack` lowers by one, never below 0;
- a key past its `ttlSeconds` (injected clock) reads 0.

Redis store, with a fake client recording calls: `take` sends one `eval` whose keys are the items' keys and args `['3', '172800', '-1', '3456000']` for `[{max:3,…},{max:null,…}]`; a reply of `2` maps to `{ ok: false, full: 1 }`; a client that never answers makes `take` reject with `UsageStoreError` after 2 s (fake timers).

`usage-config.test.ts`: `usageConfigProblem({})` null; `({ VERCEL_ENV: 'production' })` the message; with both variables, null; `getPilotConfig` with valid pilot variables, `VERCEL_ENV=preview` and no Upstash is `{ ok: false }` (reset its cache with `vi.resetModules()`).

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-store.test.ts tests/unit/usage-config.test.ts`
Expected: FAIL, cannot resolve `@/lib/usage/store`.

- [ ] **Step 4: Implement the store and the check**

`TAKE_SCRIPT` (exact copy):

```lua
for i = 1, #KEYS do
  local max = tonumber(ARGV[i * 2 - 1])
  if max >= 0 and (tonumber(redis.call('GET', KEYS[i]) or '0') + 1) > max then
    return i
  end
end
for i = 1, #KEYS do
  redis.call('INCR', KEYS[i])
  redis.call('EXPIRE', KEYS[i], tonumber(ARGV[i * 2]))
end
return 0
```

`giveBack` in Redis: `DECR`, then `SET` to 0 if it went negative (a racing expiry). In `runtime-config.ts`, after `parsePilotConfig`, if `usageConfigProblem(process.env)` returns a problem, cache `{ ok: false, problem }`; the existing log line prints it.

- [ ] **Step 5: Add the variables to `.env.example`**

After `TAVILY_API_KEY`, a commented block: `UPSTASH_REDIS_REST_URL=https://example-usage.upstash.io`, `UPSTASH_REDIS_REST_TOKEN=made-up-token`, with "Usage counters (docs/specs/platform/usage-counters). Free plan, AWS Singapore, no card. Without them, off Vercel, counts live in memory." Then `TEXT_DAILY_REQUESTS=`, `IMAGE_PRICE_USD=`, `IMAGE_MONTH_CAP_USD=`, `SEARCHES_PER_MONTH=`, each empty with "empty: the default" in the comment. Remove the `IMAGE_OWNERS` block in Task 4.

- [ ] **Step 6: Run them to see them pass**

Run: `pnpm vitest run tests/unit/usage-store.test.ts tests/unit/usage-config.test.ts tests/unit/pilot-config.test.ts tests/unit/pilot-gate.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml lib/usage/store.ts lib/usage/config.ts lib/pilot/runtime-config.ts .env.example tests/unit/usage-store.test.ts tests/unit/usage-config.test.ts
git commit -m "feat(web): usage store in Upstash Redis or memory (roadmap 2.8)"
```

### Task 3: The meter

**Files:**
- Create: `lib/usage/codes.ts`, `lib/usage/meter.ts`
- Test: `tests/unit/usage-meter.test.ts`

**Interfaces:**
- Consumes: Task 1's day and limits, Task 2's `UsageStore`, `UsageStoreError`, `getUsageStore`; `TEXT_MODELS` from `lib/ai/text-model.ts`.
- Produces:
  - `codes.ts` (browser-safe): `USAGE_CODES = ['limit_reached', 'pool_empty', 'images_month', 'usage_unavailable'] as const`; `type UsageCode`; `isUsageCode(value: unknown): value is UsageCode`; `USAGE_STATUS: Record<UsageCode, number>` (429, 429, 429, 503).
  - `type MeteredAction = LimitedAction | 'searches' | 'firstImages'`.
  - `type Ticket = { ownerKey: string | null; ownerId: string; action: MeteredAction }`.
  - `takeUsage(input: { ownerId: string; action: MeteredAction; now?: Date; env?: Env; store?: UsageStore }): Promise<{ ok: true; ticket: Ticket } | { ok: false; code: UsageCode; resetsAt: string }>`.
  - `giveBackUsage(ticket: Ticket, store?: UsageStore): Promise<void>` — no-op when `ownerKey` is null; swallows store errors.
  - `GIVE_BACK_CODES: ReadonlySet<string>` — Global Constraints' list.
  - `usageRefusal(code: UsageCode, resetsAt: string): Response` — `Response.json({ error: code, resetsAt }, { status: USAGE_STATUS[code], headers: { 'cache-control': 'no-store' } })`.
  - `ownerKey(day, ownerId, action)`, `poolKey(day, modelId)`, `monthKey(month, 'images' | 'searches')` — `usage:2026-10-26:sen:attempts`, `usage:2026-10-26:pool:gemini-3.5-flash-lite`, `usage:2026-10:images`.

What each action takes (in this order, so `full` maps to a code):

| Action | Owner key (`max` = OWNER_LIMITS, skipped for `dev`) | App-wide |
|---|---|---|
| `reads` | yes | pool of `TEXT_MODELS.brand` |
| `searches` | no | pool of `TEXT_MODELS.light`, month `searches` |
| `attempts`, `rewrites` | yes | pool of `TEXT_MODELS.posts` |
| `translations`, `replies` | yes | pool of `TEXT_MODELS.light` |
| `firstImages` | no | month `images` (`imageMonthMax`) |
| `newImages` | yes | month `images` |

A model id missing from `textPools` has no pool item. Owner and pool keys use the 2-day TTL, month keys the 40-day one. `full` on an owner key → `limit_reached`, on a pool → `pool_empty`, on the image month → `images_month` (`resetsAt` = `nextMonth`), on the searches month → `limit_reached` with `nextMonth` (the search route maps it to `search_unavailable`). A `UsageStoreError` or any store throw: images → `usage_unavailable` (`resetsAt` = now + 5 min); text → `{ ok: true, ticket: { ownerKey: null, … } }`.

Every call logs one line: `usage owner=sen action=attempts outcome=taken|limit_reached|pool_empty|images_month|unavailable`, and `giveBackUsage` logs `outcome=given_back`. (This replaces the spec's field on each route's log line: those lines are written inside the runs, and the same facts join by owner and time. Record it in the journal.)

- [ ] **Step 1: Write the failing tests** (memory store, fixed `now`, `env: {}`)

- `attempts` for `sen` three times ok; the fourth `{ ok: false, code: 'limit_reached', resetsAt: nextReset(now).toISOString() }`;
- `svarga` still ok after `sen`'s three;
- `dev`: ten `attempts` ok, and the pool count is 10;
- pool of `gemini-3.5-flash-lite` at 500 (`env: { TEXT_DAILY_REQUESTS: 'gemini-3.5-flash-lite=2' }`): third take of any text action → `pool_empty`;
- 158 `firstImages` ok, the 159th → `images_month` with `resetsAt` `'2026-11-01T00:00:00.000Z'` for `now` in October;
- `newImages`: the eleventh → `limit_reached`;
- `searches`: past `SEARCHES_PER_MONTH: '2'` → `limit_reached`;
- `giveBackUsage` of a `replies` ticket: owner count back to 0, pool count still 1;
- a store whose `take` throws: `replies` ok with `ownerKey: null`; `newImages` → `usage_unavailable`;
- `usageRefusal('pool_empty', iso)`: status 429, body `{ error: 'pool_empty', resetsAt: iso }`;
- the log line for a refusal holds `outcome=limit_reached` and no other content.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-meter.test.ts`
Expected: FAIL, cannot resolve `@/lib/usage/meter`.

- [ ] **Step 3: Implement `codes.ts` and `meter.ts`** as the interface and table say.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/usage-meter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/usage/codes.ts lib/usage/meter.ts tests/unit/usage-meter.test.ts
git commit -m "feat(web): usage meter, take and give back (roadmap 2.8)"
```

### Task 4: Counting in the routes

**Files:**
- Create: `lib/usage/stream.ts`
- Modify: `app/api/brand/read/route.ts`, `app/api/brand/search/route.ts`, `app/api/posts/plan/route.ts`, `app/api/posts/rewrite/route.ts`, `app/api/posts/translate/route.ts`, `app/api/reviews/reply/route.ts`, `app/api/posts/image/route.ts`, `lib/posts/image.ts` (`imageBodySchema`), `lib/posts/image-access.ts`, `app/page.tsx`, `.env.example`, `playwright.config.ts`
- Test: `tests/unit/usage-routes.test.ts`; update `tests/unit/posts-image-route.test.ts` and any test using `IMAGE_OWNERS` or `imagesOn(ownerId, …)`

**Interfaces:**
- Consumes: Task 3's `takeUsage`, `giveBackUsage`, `GIVE_BACK_CODES`, `usageRefusal`; `getCurrentOwner`.
- Produces:
  - `giveBackOnError<L extends { type: string; code?: string }>(lines: AsyncGenerator<L>, ticket: Ticket): AsyncGenerator<L>` in `lib/usage/stream.ts` — passes every line on; on an `error` line whose code is in `GIVE_BACK_CODES`, gives the ticket back once.
  - `imageBodySchema` gains `first: z.boolean().default(true)`.
  - `imagesOn(env?: Env): boolean` — the key check only; `imageOwners` is deleted.

Each route, after the session (401 as the reply route does today, for the four that don't read the owner yet) and the body check, before any model call: `const usage = await takeUsage({ ownerId, action })`; refused → `return usageRefusal(usage.code, usage.resetsAt)`. Then:

| Route | Action | Give back |
|---|---|---|
| brand read | `reads` (after `prepareRead` succeeds: a bad URL or robots refusal spends nothing) | `giveBackOnError` on the stream |
| brand search | `searches`; a refusal answers `503 { error: 'search_unavailable' }` | on `SearchStepError` with a code in `GIVE_BACK_CODES` |
| posts plan | `attempts` | `giveBackOnError` |
| posts rewrite | `rewrites` | `giveBackOnError` |
| translate | `translations` | on `!out.ok` with a give-back code |
| reply | `replies` | same |
| image | `first ? 'firstImages' : 'newImages'`, after `images_off` | same |

`images_off` and `invalid_*` answers come before the take and spend nothing. In `app/page.tsx`, `imagesOn()` takes no owner. Delete `IMAGE_OWNERS` from `.env.example` and from `playwright.config.ts`'s `testEnv`.

- [ ] **Step 1: Write the failing tests**

`usage-routes.test.ts` mocks `@/lib/pilot/current-owner`, `@/lib/brand/deps` (replayers, as the existing route tests do) and `@/lib/usage/store` (`getUsageStore` → one `memoryStore()` reset in `afterEach`). For each of the seven routes:
- at the owner's limit (or the pool or month, for search and first images): 429 (search: 503 `search_unavailable`) with `{ error, resetsAt }`, and the replayer's model was not called;
- a success takes one (read the store's key);
- a model failure gives the owner's count back (busy replayer);
- plan: a stream with one `post` line then an `error` `model_timeout` line gives the attempt back once;
- `dev` passes the owner limit.
Image: `first: false` at 10 new images → 429 `limit_reached`; `first` omitted counts as first; without `GOOGLE_IMAGE_API_KEY` still 403 `images_off`, nothing counted; a throwing store → 503 `usage_unavailable`. Translate with a throwing store → 200.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-routes.test.ts`
Expected: FAIL: the routes answer 200 past the limits.

- [ ] **Step 3: Implement `giveBackOnError` and wire the seven routes**, delete the allowlist, update the image route test and the e2e environment.

- [ ] **Step 4: Run the route tests and the existing ones**

Run: `pnpm vitest run tests/unit/usage-routes.test.ts tests/unit/posts-image-route.test.ts tests/unit/brand-route.test.ts tests/unit/brand-search-route.test.ts tests/unit/posts-route.test.ts tests/unit/posts-translate-route.test.ts tests/unit/reviews-route.test.ts`
Expected: PASS (existing tests mock `@/lib/usage/store` the same way where they need it).

- [ ] **Step 5: Commit**

```bash
git add lib/usage/stream.ts app/api/brand/read/route.ts app/api/brand/search/route.ts app/api/posts/plan/route.ts app/api/posts/rewrite/route.ts app/api/posts/translate/route.ts app/api/reviews/reply/route.ts app/api/posts/image/route.ts lib/posts/image.ts lib/posts/image-access.ts app/page.tsx .env.example playwright.config.ts tests/unit/usage-routes.test.ts tests/unit/posts-image-route.test.ts
git commit -m "feat(web): count reads, attempts, images and replies in the routes (roadmap 2.8)"
```

(Add any other test file the step changed, by path.)

### Task 5: `GET /api/usage`

**Files:**
- Create: `lib/usage/answer.ts` (browser-safe schema), `lib/usage/read.ts` (server), `app/api/usage/route.ts`
- Test: `tests/unit/usage-read.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces:
  - `usageAnswerSchema` (zod) and `type UsageAnswer` — exactly the spec's JSON: `resetsAt`, `limited`, `left?` and `limits?` with `reads`, `attempts`, `newImages`, `replies`, `poolEmpty`, `images: { on, monthFull, backAt }`.
  - `readUsage(input: { ownerId: string; now?: Date; env?: Env; store?: UsageStore; imagesOn: boolean }): Promise<UsageAnswer>` — one `store.read` of every key; `left[a] = max(0, min(limit − owner count, pool max − pool count))` for text actions with a pool; `newImages` also capped by the month's room; `poolEmpty` true when any pool of `TEXT_MODELS`' ids is full; on a store error, everything full is `false` and `left` equals `limits` (fail open, as text does).
  - `GET /api/usage`: 401 without an owner; `Response.json(answer, { headers: { 'cache-control': 'no-store' } })`; no log line.

- [ ] **Step 1: Write the failing tests**: an owner with 1 attempt and 2 reads used → `left.attempts` 2, `left.reads` 1, `resetsAt` = `nextReset(now)`; `dev` → `limited: false`, no `left`; the pool full → every text `left` 0 and `poolEmpty: true`; 158 images → `images.monthFull: true`, `left.newImages` 0, `backAt` the 1st; `imagesOn: false` → `images.on: false`; the route without a session → 401, with one → the parsed answer validates against `usageAnswerSchema`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-read.test.ts`
Expected: FAIL, cannot resolve `@/lib/usage/read`.

- [ ] **Step 3: Implement `answer.ts`, `read.ts` and the route.**

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/usage-read.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/usage/answer.ts lib/usage/read.ts app/api/usage/route.ts tests/unit/usage-read.test.ts
git commit -m "feat(web): usage answer route (roadmap 2.8)"
```

### Task 6: The usage bar

**Files:**
- Create: `lib/usage/client.ts`, `components/usage/usage-provider.tsx`, `components/usage/usage-bar.tsx`, `components/usage/usage-message.tsx`
- Modify: `components/brand/brand-home.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/usage-bar.test.tsx`

**Interfaces:**
- Consumes: Task 5's `usageAnswerSchema`; Task 1's `nextReset`, `nextMonth`; Task 3's `UsageCode`.
- Produces:
  - `fetchUsage(deps?: { fetch: typeof fetch }): Promise<UsageAnswer | null>` — null on any failure.
  - `USAGE_EVENT = 'shopfront:usage'`; `noteUsage(): void` — dispatches it on `window` (no-op on the server).
  - `UsageProvider({ children })` — fetches on mount, on `USAGE_EVENT`, and on `visibilitychange` to visible.
  - `useUsage(): { usage: UsageAnswer | null; refresh(): void }`.
  - `UsageBar({ tab }: { tab: 'business' | 'posts' | 'reviews' })`.
  - `useUsageTime(): { time(iso: string): string; date(iso: string): string }` — next-intl `useFormatter().dateTime` with `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone`, `{ hour: '2-digit', minute: '2-digit' }` and `{ day: 'numeric', month: 'long' }`.
  - `UsageMessage({ code, action }: { code: UsageCode; action: LimitedAction })` — the refusal line: `limit_reached` → `usage.limit.<action>` with `{ limit: OWNER_LIMITS[action], time }`; `pool_empty` → `usage.poolEmpty`; `images_month` → `usage.imagesMonth` with `nextMonth(new Date())`; `usage_unavailable` → `usage.unavailable`. Times come from `usage.resetsAt`, or `nextReset(new Date())` while `usage` is null.

Bar rules as the spec's "The usage bar": `usage.left` with the tab's items joined by ", " (`usage.reads`; `usage.attempts` + `usage.newImages` when `images.on && !images.monthFull`; `usage.replies`), then ` · ` and `usage.resets`. A 0 item in `text-error`. `poolEmpty` → `usage.poolEmpty` on every tab; month full on the posts tab → the line, then " ", then `usage.imagesMonth`; `dev` → `usage.developer` · `usage.resets`. Classes: `mt-2 min-h-[18px] text-[13px] leading-snug text-ink-secondary`, empty while `usage` is null. In `brand-home.tsx`, wrap the returned tree in `UsageProvider` and put `<UsageBar tab={tab} />` right after `</TabsList>`.

- [ ] **Step 1: Add the spec's strings** to the three message files under a top-level `usage` object, keys and wording exactly as the spec's Strings table.

- [ ] **Step 2: Write the failing tests** (render with the English messages and `process.env.TZ = 'Asia/Ho_Chi_Minh'`, a fetch stub answering a fixed `UsageAnswer` with `resetsAt: '2026-11-15T08:00:00.000Z'`):
- posts tab: `Left today: 2 attempts, 10 new images · Resets at 15:00`;
- business: `Left today: 2 website reads · Resets at 15:00`; reviews: `Left today: 20 replies · Resets at 15:00`;
- `left.attempts: 0` → the `0 attempts` text has `text-error`;
- `images.on: false` → no "new images"; month full → `… No new images until November 1.`;
- `poolEmpty` → `Shopfront has used today's free writing. Back at 15:00.` on the reviews tab;
- `dev` → `No daily limits (developer) · Resets at 15:00`;
- the fetch failing → the line is empty; a `USAGE_EVENT` triggers a second fetch;
- in Vietnamese: `Còn lại hôm nay: 2 lần thử, 10 hình mới · Làm mới lúc 15:00`.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-bar.test.tsx`
Expected: FAIL, cannot resolve `@/components/usage/usage-bar`.

- [ ] **Step 4: Implement the client, provider, bar and message, and mount them.**

- [ ] **Step 5: Run them and the message checks**

Run: `pnpm vitest run tests/unit/usage-bar.test.tsx tests/unit/i18n-messages.test.ts tests/unit/brand-home.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/usage/client.ts components/usage/usage-provider.tsx components/usage/usage-bar.tsx components/usage/usage-message.tsx components/brand/brand-home.tsx messages/en.json messages/id.json messages/vi.json tests/unit/usage-bar.test.tsx
git commit -m "feat(web): usage bar under the home tabs (roadmap 2.8)"
```

### Task 7: At a limit, in each section

**Files:**
- Modify: `lib/brand/profile.ts` (`ERROR_CODES`, `ERROR_STATUS`), `lib/posts/batch.ts` (`POSTS_ERROR_CODES`, `POSTS_ERROR_STATUS`), `lib/posts/image.ts` (`IMAGE_ERROR_CODES`, `IMAGE_ERROR_STATUS`), `lib/posts/translate.ts`, `lib/reviews/reply.ts`; the clients `lib/brand/read-client.ts`, `lib/posts/client.ts`, `lib/posts/image-client.ts`, `lib/posts/translate-client.ts`, `lib/reviews/client.ts`; the screens `components/brand/brand-home.tsx`, `components/posts/posts-section.tsx`, `components/posts/post-card.tsx`, `components/posts/post-image.tsx`, `components/posts/caption-translation.tsx`, `components/reviews/reviews-section.tsx`
- Test: `tests/unit/usage-limits-ui.test.tsx`; update the client tests whose code lists change

**Interfaces:**
- Consumes: Task 3's `USAGE_CODES`, `USAGE_STATUS`, `isUsageCode`; Task 6's `useUsage`, `UsageMessage`, `noteUsage`.
- Produces: every route's error code list includes the usage codes it can answer (brand read, posts: `limit_reached`, `pool_empty`; image: `limit_reached`, `images_month`, `usage_unavailable`; translate, reply: `limit_reached`, `pool_empty`), with `USAGE_STATUS` statuses, so the clients' existing `isErrorCode` checks pass them through instead of turning them into `model_failed`.

Rules:
- Each client calls `noteUsage()` once its counted request settles, whatever the outcome (search too).
- `image-client.ts` sends `first: !savedImages.has(imageKey(batch.id, postId))`, read from the images store when the request leaves, so a resumed or retried first image stays first.
- Wherever a section shows `t(\`errors.${code}\`)` today, a usage code shows `<UsageMessage code={code} action={…} />` instead: brand read `reads`, plan `attempts`, rewrite `rewrites`, image `newImages`, translation `translations`, reply `replies`.
- Buttons, from `useUsage()` while `usage?.limited`: "Make 6 suggestions" disabled at `left.attempts === 0`; "Read my website" and "Re-read my website" at `left.reads === 0`; "Write 2 replies" and "Write 2 other replies" at `left.replies === 0`; "Create new image" at `left.newImages === 0` or `images.monthFull`. Each shows its `UsageMessage` with `limit_reached` (or `pool_empty` when `usage.poolEmpty`) under it, as the spec's "At a limit" places it.
- Image month full: posts-section asks for no attempt images; a card with no image shows a new `ImageState` `{ kind: 'month' }` whose line is `usage.imagesMonth` with the date.

- [ ] **Step 1: Write the failing tests**: with a mocked `UsageProvider` value, each button disabled at 0 with its English line (`You've made today's 3 attempts. More at 15:00.`, `You've read your website 3 times today. Again at 15:00.`, `You've written today's 20 replies. More at 15:00.`, `You've made today's 10 new images. More at 15:00.`); the pool empty disabling all three text buttons; a plan answered `429 { error: 'limit_reached' }` while the bar says 1 left shows the attempts line and fires `USAGE_EVENT`; a resumed plan answered 429 ends on that line, not a spinner; an automatic update answered `limit_reached` shows `Captions were updated 5 times today. Again at 15:00.` and "Update captions"; a translation answered `limit_reached` shows the translations line; month full → cards show `No new images until November 1.` and no image request is made; the image body's `first` is `true` for a post with no saved image and `false` for one with an image.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/usage-limits-ui.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the code lists, the clients and the screens.**

- [ ] **Step 4: Run all unit tests**

Run: `pnpm test`
Expected: PASS, no test skipped.

- [ ] **Step 5: Commit**

```bash
git add <each file the task changed, by path>
git commit -m "feat(posts): buttons and lines at the day's limits (roadmap 2.8)"
```

### Task 8: End to end, documents, check

**Files:**
- Create: `tests/e2e/usage.spec.ts`
- Modify: `docs/roadmap.md`, `AGENTS.md` (map row), `docs/specs/platform/usage-counters/journal.md`

- [ ] **Step 1: Write the e2e test** (phone viewport, `/api/usage` and `/api/posts/plan` mocked with `page.route`, signed in as Sen with a saved brand as the existing specs do): the bar on each tab; after a plan answered `429 { error: 'limit_reached', resetsAt }` and a usage answer with `left.attempts: 0`, "Make 6 new suggestions" is disabled and its line shows; at 320px in Vietnamese the bar causes no horizontal scroll (`document.documentElement.scrollWidth <= 320`).

- [ ] **Step 2: Run it**

Run: `pnpm test:e2e tests/e2e/usage.spec.ts`
Expected: PASS. Then `pnpm test:e2e` for the whole suite: PASS.

- [ ] **Step 3: Documents**: roadmap 2.8 → `done`; AGENTS.md map row after `lib/runs/`: `| \`lib/usage/\` | Usage counters: the Pacific day, the limits, the store (Upstash Redis or memory), the meter the routes call; in the browser, the usage answer and its bar |` and `components/usage/` as `| \`components/usage/\` | The usage bar and the lines shown at a limit |`; journal: the log-line call (Task 3), the RED and GREEN lines as printed.

- [ ] **Step 4: Run the full check**

Run: `pnpm check`
Expected: every step passes; the Vitest summary line goes in the journal's GREEN.

- [ ] **Step 5: Commit, push, open the PR to `develop`**

```bash
git add tests/e2e/usage.spec.ts docs/roadmap.md AGENTS.md docs/specs/platform/usage-counters/journal.md
git commit -m "docs(docs): usage counters done (roadmap 2.8)"
git push -u origin claude/inspiring-rubin-gxt2oq
```
