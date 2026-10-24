# Search Essence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (this repo runs plans inline, AGENTS.md "Plans") to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every brand read, look up what people search for around the business's trade and town (Tavily, free plan) and add search terms, moments and place symbols to the essence, marked as coming from search.

**Architecture:** A new route `POST /api/brand/search` takes the trade, the place and the current essence, runs three Tavily searches in parallel, then one Gemini Flash-Lite structured call through the existing text-model module; code checks the answer. The browser asks for it after a `final` read line (or once on load when `searchedAt` is null), merges the answer into the profile as saved when it arrives, and stores it. The profile moves to `schemaVersion: 2`.

**Tech Stack:** Next.js route handler (Node runtime), AI SDK `generateText` with `Output.object` and zod, plain `fetch` to Tavily, IndexedDB via `idb`, next-intl, Vitest, Playwright.

**Spec:** `docs/specs/brand/search-essence/spec.md`

## Global Constraints

- $0: Tavily free Researcher plan only, no card; Gemini free tier only (decision 0003).
- Model: `TEXT_MODELS.light` (`gemini-3.5-flash-lite`); `maxRetries: 0`; no retries anywhere in the step.
- Tavily per query: `search_depth: "basic"`, `auto_parameters: false`, `max_results: 5`, `topic: "general"`, `exclude_domains: [<site's domain>]`, `country: "vietnam" | "indonesia"` only when the body's `country` is `VN` / `ID`.
- Three queries, from `category`, `town`, and `area` or the first area of `serviceArea`. Never the business's name; no query aimed at reviews.
- Limits: `searchTerms` ≤ 8 phrases of ≤ 6 words; search `moments` ≤ 3; search `placeSymbols` ≤ 2; totals stay within `LIMITS.moments` (6) and `LIMITS.placeSymbols` (5).
- `SEARCH_PROMPT_VERSION = 'search-1'`, bumped with every prompt change.
- The step gives up at 20 s (`search_failed`).
- Error codes and statuses: `search_unavailable` 503, `search_busy` 503, `model_busy` 503, `search_failed` 502; bad body 400 `search_failed`.
- The only module that calls Tavily is `lib/search/tavily.ts`; the only one that imports `@ai-sdk/google` stays `lib/ai/text-model.ts`.
- Every visible string in `messages/en.json`, `id.json`, `vi.json` in the same commit. Search content stays in English.
- The log line never holds snippets, model output or anything about the owner.
- Tests never call the network. Stage files by path. Commit scope `brand` (or `docs` for docs-only commits).

## Review Focus

1. **The owner edits "Your feeling" while search runs, or between a failed search and its retry days later.** The answer must merge into the profile saved at arrival time, keep every owner value first, and never wipe an edit. Pinned in Task 7 (`mergeSearch` keeps owner items) and Task 8 (sheet open → merge waits).
2. **The model cites a result URL in another form** (trailing slash, `http` vs `https`, a `#fragment`). A sensible person expects it kept, not dropped. Pinned in Task 5 (`matches a result URL written differently`).
3. **Two searches fire for one profile** (the `final` event and the load or visibility effect, or two tabs). One request per owner at a time. Pinned in Task 8.
4. **A saved v1 profile with owner edits** loads as v2 with its edits and `ownerEdited` intact. Pinned in Task 1.
5. **The site already filled every moment slot** (6) or every symbol slot (5): search adds none and still sets `searchedAt`. Pinned in Task 7.

---

### Task 0: The search tool check (developer, before any code)

**Files:**
- Create: `docs/specs/brand/search-essence/journal.md` (from `docs/templates/journal.md` if present, else the shape of `docs/specs/brand/extract-site/journal.md`)

- [ ] **Step 1: Ask the developer to do the check in the spec's "Before any code" section** (Tavily account without a card; stop-not-bill confirmed in the dashboard; terms section 2 verdict, emailing Tavily support if unclear).
- [ ] **Step 2: Record in `journal.md`**: date, plan name, credits shown, stop-not-bill result, terms verdict with any reply quoted.
- [ ] **Step 3: Gate.** If the verdict isn't a clear yes, run the same check on Exa; if neither passes, stop and tell the developer. No later task starts before a yes.
- [ ] **Step 4: Commit**

```bash
git add docs/specs/brand/search-essence/journal.md
git commit -m "docs(brand): record the search tool check (roadmap 1.3)"
```

### Task 1: Profile version 2

**Files:**
- Modify: `lib/brand/profile.ts` (schema, `LIMITS`, `upgradeProfile`)
- Modify: `lib/brand/checks.ts:347-388` (`finalise` writes v2)
- Modify: `lib/brand/store.ts` (`loadBrand` upgrades before parsing)
- Modify: `lib/brand/edit.ts` (`FeelingValues.searchTerms`, `UNSOURCED_FIELDS`, `unsourced`)
- Modify: `tests/unit/helpers/brand.ts` (both helpers to v2), `tests/unit/brand-home.test.tsx:126` and `tests/unit/brand-store.test.ts:69` (their "invalid" profile becomes `schemaVersion: 3`), `tests/unit/brand-checks.test.ts:422`
- Test: `tests/unit/brand-profile.test.ts`, `tests/unit/brand-store.test.ts`, `tests/unit/brand-edit.test.ts`

**Interfaces:**
- Produces:
  - `profileSchema` with `schemaVersion: z.literal(2)`, `essence.searchTerms: z.array(maxWords(LIMITS.searchTermWords)).max(LIMITS.searchTerms)`, `searchedAt: z.iso.datetime().nullable()`, `searchPromptVersion: text.nullable()`.
  - `LIMITS` gains `searchTerms: 8`, `searchTermWords: 6`, `searchMoments: 3`, `searchSymbols: 2`.
  - `upgradeProfile(raw: unknown): unknown` in `lib/brand/profile.ts`: an object with `schemaVersion: 1` comes back as v2 with `essence.searchTerms: []`, `searchedAt: null`, `searchPromptVersion: null`; anything else comes back unchanged.
  - `UNSOURCED_FIELDS` gains `'essence.searchTerms'`; `FeelingValues` gains `searchTerms: string[]`.
- `modelProfileSchema` does not change: the brand read's model never fills search fields.

- [ ] **Step 1: Write the failing tests**

```ts
// brand-profile.test.ts
it('upgrades a v1 profile to v2 with empty search fields', () => {
  const { searchedAt, searchPromptVersion, ...rest } = senProfile();
  const { searchTerms, ...essence } = rest.essence;
  const v1 = { ...rest, schemaVersion: 1, essence };
  const up = profileSchema.parse(upgradeProfile(v1));
  expect(up.schemaVersion).toBe(2);
  expect(up.essence.searchTerms).toEqual([]);
  expect(up.searchedAt).toBeNull();
  expect(up.searchPromptVersion).toBeNull();
});
it('refuses a search term over 6 words', () => {
  const p = senProfile();
  p.essence.searchTerms = ['one two three four five six seven'];
  expect(profileSchema.safeParse(p).success).toBe(false);
});
// brand-store.test.ts
it('loads a saved v1 profile as v2 and keeps its owner edits', async () => {
  // put a v1 record with hours.source "owner" and ownerEdited ['tone'] straight into the db
  const result = await loadBrand('sen');
  expect(result.kind).toBe('saved');
  // record.profile.schemaVersion === 2, hours.source === 'owner', ownerEdited === ['tone']
});
// brand-edit.test.ts
it('records an edit to search terms as an owner edit', () => {
  // applySection(profile, 'feeling', {...values, searchTerms: ['hotel massage da nang']})
  // changedUnsourced(before, after) contains 'essence.searchTerms'
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run tests/unit/brand-profile.test.ts tests/unit/brand-store.test.ts tests/unit/brand-edit.test.ts`
Expected: FAIL (`upgradeProfile` is not exported; `searchTerms` unknown).

- [ ] **Step 3: Implement** the schema, `LIMITS`, `upgradeProfile`, `finalise` (writes `schemaVersion: 2`, `essence.searchTerms: []`, `searchedAt: null`, `searchPromptVersion: null`), `loadBrand` (`profileSchema.safeParse(upgradeProfile(record.profile))`), and the edit changes (`sectionValues('feeling')` returns `searchTerms`; `build` writes `searchTerms: words(v.searchTerms)`). Update the test helpers to v2 and the "invalid" fixtures to `schemaVersion: 3`.
- [ ] **Step 4: Run the whole suite**

Run: `pnpm test`
Expected: PASS, including `brand-fixtures-replay.test.ts` (the brand read now finalises to v2).

- [ ] **Step 5: Commit**

```bash
git add lib/brand/profile.ts lib/brand/checks.ts lib/brand/store.ts lib/brand/edit.ts tests/unit/helpers/brand.ts tests/unit/brand-profile.test.ts tests/unit/brand-store.test.ts tests/unit/brand-edit.test.ts tests/unit/brand-home.test.tsx tests/unit/brand-checks.test.ts
git commit -m "feat(brand): profile version 2 with search terms and searchedAt"
```

### Task 2: The search tool module

**Files:**
- Create: `lib/search/search-tool.ts` (interface, types, error), `lib/search/tavily.ts` (the Tavily client), `lib/search/replay.ts` (replay and record)
- Modify: `.env.example` (add `TAVILY_API_KEY=` with a comment like the Gemini key's: "Tavily key for the essence search (docs/specs/brand/search-essence). Free Researcher plan, no card. Without it search is skipped.")
- Test: `tests/unit/search-tavily.test.ts`

**Interfaces:**
- Produces:

```ts
export type SearchResult = { title: string; url: string; content: string };
export type SearchOptions = { country: 'vietnam' | 'indonesia' | null; excludeDomains: string[] };
export interface SearchTool {
  search(query: string, options: SearchOptions, signal: AbortSignal): Promise<SearchResult[]>;
}
export class SearchError extends Error {
  constructor(readonly kind: 'unavailable' | 'busy' | 'failed', message: string, options?: { cause?: unknown });
}
export function tavilySearchTool(deps?: { fetch?: typeof fetch; apiKey?: string }): SearchTool; // lib/search/tavily.ts
export type SearchRecording = { queries: { query: string; results: SearchResult[] }[] };
export function replaySearchTool(recording: SearchRecording, opts?: { error?: SearchError['kind'] }): SearchTool;
export function recordingSearchTool(inner: SearchTool, onResult: (query: string, results: SearchResult[]) => void): SearchTool;
```

- `tavilySearchTool`: `POST https://api.tavily.com/search`, `Authorization: Bearer <key>`, JSON body with the Global Constraints' fields, keeps only `title`, `url`, `content` of each result. The key defaults to `process.env.TAVILY_API_KEY`, read at call time.

- [ ] **Step 1: Write the failing tests** (a fake `fetch` records the request)

```ts
it('sends a basic search with the fixed options', async () => {
  // search('massage spa Da Nang', { country: 'vietnam', excludeDomains: ['sendanangmassage.com'] })
  // body equals { query, search_depth: 'basic', auto_parameters: false, max_results: 5,
  //   topic: 'general', country: 'vietnam', exclude_domains: ['sendanangmassage.com'] }
  // header authorization === 'Bearer test-key'
});
it('leaves country out when it is null', /* body has no 'country' key */);
it('keeps only title, url and content', /* a result with score, favicon → only the three */);
it('is unavailable without a key', /* rejects SearchError kind 'unavailable', fetch not called */);
it.each([429, 432, 433])('is busy on %i', /* rejects kind 'busy' */);
it('fails on any other status', /* 500 → kind 'failed' */);
it('passes the abort signal to fetch', /* init.signal === signal */);
```

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/search-tavily.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the three files.
- [ ] **Step 4: Run and see them pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/search/search-tool.ts lib/search/tavily.ts lib/search/replay.ts .env.example tests/unit/search-tavily.test.ts
git commit -m "feat(brand): Tavily search tool behind a SearchTool interface"
```

### Task 3: Building the queries

**Files:**
- Create: `lib/brand/search/queries.ts`
- Test: `tests/unit/brand-search-queries.test.ts`

**Interfaces:**
- Consumes: `SearchOptions` (Task 2).
- Produces:

```ts
export type SearchBody = {
  siteUrl: string; category: string; town: string;
  area: string | null; serviceArea: string | null; country: 'VN' | 'ID' | null;
  essence: { feeling: string[]; placeSymbols: string[]; senses: string[]; moments: string[]; searchTerms: string[] };
};
export const searchBodySchema: z.ZodType<SearchBody>; // category and town non-empty
export function buildQueries(body: SearchBody): [string, string, string];
export function searchOptions(body: SearchBody): SearchOptions; // domain = siteUrl host without "www."
```

- Wording is the builder's within the spec's three rules; the place part is `area ?? firstArea(serviceArea)` (text before the first `(`, `;` or `,`), then `town`.

- [ ] **Step 1: Write the failing tests**

```ts
const sen: SearchBody = { siteUrl: 'https://www.sendanangmassage.com/', category: 'massage spa',
  town: 'Da Nang', area: 'Son Tra', serviceArea: null, country: 'VN',
  essence: { feeling: [], placeSymbols: [], senses: [], moments: [], searchTerms: [] } };
it('builds three queries that hold the trade or the town', () => {
  const q = buildQueries(sen);
  expect(q).toHaveLength(3);
  expect(q[0]).toContain('massage spa'); expect(q[0]).toContain('Da Nang');
  expect(q[1]).toContain('Da Nang');
  expect(q[2]).toContain('Son Tra');
});
it('uses the first service area when there is no area', /* serviceArea 'Canggu (Batu Bolong); Seminyak' → q[2] contains 'Canggu', not 'Batu Bolong' */);
it('never aims at reviews', /* no query matches /review|tripadvisor|rating/i */);
it('maps the country and excludes the site domain', () => {
  expect(searchOptions(sen)).toEqual({ country: 'vietnam', excludeDomains: ['sendanangmassage.com'] });
  expect(searchOptions({ ...sen, country: null }).country).toBeNull();
});
it('refuses a body without a town', () => {
  expect(searchBodySchema.safeParse({ ...sen, town: '' }).success).toBe(false);
});
```

The body carries no name, so "never the business's name" holds by construction; the schema is `.strict()` so a `name` field is refused (test it).

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/brand-search-queries.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/brand/search/queries.ts`.
- [ ] **Step 4: Run and see them pass.**
- [ ] **Step 5: Commit**

```bash
git add lib/brand/search/queries.ts tests/unit/brand-search-queries.test.ts
git commit -m "feat(brand): build the three essence search queries"
```

### Task 4: The model step

**Files:**
- Create: `lib/brand/search/prompt.ts`
- Modify: `lib/ai/text-model.ts` (add `searchEssence` to `TextModel` and to `geminiTextModel`), `lib/ai/replay.ts` (`replayTextModel` takes an optional search answer; `recordingTextModel` records it)
- Test: `tests/unit/brand-search-prompt.test.ts`, `tests/unit/ai-text-model.test.ts`

**Interfaces:**
- Consumes: `SearchBody` (Task 3), `SearchResult` (Task 2).
- Produces:

```ts
// lib/brand/search/prompt.ts
export const SEARCH_PROMPT_VERSION = 'search-1';
export function searchPrompt(): string;
export function searchUserText(body: SearchBody, results: SearchResult[]): string; // results headed "### Result: <url>"
export const searchModelAnswerSchema: z.ZodObject<{ searchTerms: string[]; moments: { value: string; source: string }[]; placeSymbols: string[] }>; // loose, no limits
export type SearchModelAnswer = z.infer<typeof searchModelAnswerSchema>;
// lib/ai/text-model.ts
export type SearchModelInput = { system: string; text: string };
interface TextModel { searchEssence(input: SearchModelInput, signal: AbortSignal): Promise<SearchModelAnswer>; }
```

- `geminiTextModel().searchEssence` uses `generateText` with `Output.object({ schema: searchModelAnswerSchema })`, model `TEXT_MODELS.light`, `thinkingLevel: 'low'`, `maxRetries: 0`, and maps errors through the existing `toModelError` (429/503 → `busy`).
- The prompt asks for what the spec's model-step table says: search terms people would type, lower case, English, no hashtags, no business names; moments as a result says them, each with one of the result URLs; place symbols not already in the essence. It lists the current essence and says to add, not repeat. Never describe people; never copy names of people.

- [ ] **Step 1: Write the failing tests**

```ts
it('heads each result by its URL and lists the current essence', () => {
  const text = searchUserText(sen, [{ title: 'T', url: 'https://vietnam.travel/da-nang', content: 'Surf at My Khe' }]);
  expect(text).toContain('### Result: https://vietnam.travel/da-nang');
  expect(text).toContain('Surf at My Khe');
});
it('has the version search-1', () => expect(SEARCH_PROMPT_VERSION).toBe('search-1'));
// ai-text-model.test.ts, with the AI SDK mocked as the file already does for streamBrandProfile:
it('searchEssence calls the light model with no retries', /* model id 'gemini-3.5-flash-lite', maxRetries 0 */);
it('searchEssence turns a 429 into a busy ModelError', /* kind 'busy' */);
```

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/brand-search-prompt.test.ts tests/unit/ai-text-model.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the prompt module, `searchEssence`, and the replay and record support. Fakes elsewhere in the tests that implement `TextModel` gain a `searchEssence` that throws.
- [ ] **Step 4: Run `pnpm test` and `pnpm typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/brand/search/prompt.ts lib/ai/text-model.ts lib/ai/replay.ts tests/unit/brand-search-prompt.test.ts tests/unit/ai-text-model.test.ts
git commit -m "feat(brand): essence search prompt and model call"
```

(Add any other test file touched for the `TextModel` fakes by path.)

### Task 5: Checking the model's answer

**Files:**
- Create: `lib/brand/search/checks.ts`
- Test: `tests/unit/brand-search-checks.test.ts`

**Interfaces:**
- Consumes: `SearchModelAnswer` (Task 4), `SearchResult` (Task 2), `SearchBody` (Task 3), `Dropped` (`lib/brand/checks.ts`), `normaliseText` (`lib/brand/normalise.ts`), `LIMITS`.
- Produces:

```ts
export type CheckedSearch = {
  searchTerms: string[]; moments: { value: string; source: string }[];
  placeSymbols: string[]; dropped: Dropped[];
};
export function checkSearchAnswer(answer: SearchModelAnswer, ctx: { results: SearchResult[]; essence: SearchBody['essence'] }): CheckedSearch;
```

- Rules, in order: trim and drop empty items; a moment whose `source` matches no result URL is dropped (`reason: 'source not a result'`), matching after normalising scheme to https, removing `www.`, a trailing `/`, and the fragment; the kept moment's `source` is the result's own URL; drop a moment, symbol or term already in `ctx.essence` (by `normaliseText`) (`reason: 'already in essence'`); drop a term equal to a result title's part before its first ` | `, ` - `, ` – `, `: ` or ` · ` (normalised) (`reason: 'business name'`); lower-case terms and strip a leading `#`; drop a term over `LIMITS.searchTermWords` words (`reason: 'too long'`); trim to `searchTerms` 8, `searchMoments` 3, `searchSymbols` 2 (each cut item recorded, `reason: 'over limit'`). Every `field` is `essence.searchTerms`, `essence.moments` or `essence.placeSymbols`.

- [ ] **Step 1: Write the failing tests**

```ts
it('drops a moment whose source is not a result', /* dropped [{ field: 'essence.moments', reason: 'source not a result' }] */);
it('matches a result URL written differently', /* source 'http://www.vietnam.travel/da-nang/#top' vs result 'https://vietnam.travel/da-nang' → kept, source === the result URL */);
it('drops what the essence already holds', /* essence.placeSymbols ['Lotus flowers'], answer ['lotus  flowers'] → dropped */);
it('drops a term that is a result title\'s name part', /* title 'Sen Massage | Da Nang', term 'sen massage' → dropped 'business name' */);
it('lower-cases terms and strips a hashtag', /* '#Hotel Massage Da Nang' → 'hotel massage da nang' */);
it('trims to 8 terms, 3 moments and 2 symbols', /* 10/5/4 in → 8/3/2 out, 7 'over limit' drops */);
it('never throws on an empty answer', /* all empty → all empty, dropped [] */);
```

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/brand-search-checks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `checkSearchAnswer`.
- [ ] **Step 4: Run and see them pass.**
- [ ] **Step 5: Commit**

```bash
git add lib/brand/search/checks.ts tests/unit/brand-search-checks.test.ts
git commit -m "feat(brand): check the essence search answer"
```

### Task 6: The server step, its log line and the route

**Files:**
- Create: `lib/brand/search/run.ts`, `lib/brand/search/log.ts`, `app/api/brand/search/route.ts`
- Modify: `lib/brand/deps.ts` (add `defaultSearchDeps()`)
- Test: `tests/unit/brand-search-run.test.ts`, `tests/unit/brand-search-route.test.ts`

**Interfaces:**
- Consumes: Tasks 2 to 5.
- Produces:

```ts
// lib/brand/search/run.ts
export const SEARCH_ERROR_CODES = ['search_unavailable', 'search_busy', 'model_busy', 'search_failed'] as const;
export type SearchErrorCode = (typeof SEARCH_ERROR_CODES)[number];
export const SEARCH_ERROR_STATUS: Record<SearchErrorCode, number>; // 503, 503, 503, 502
export type SearchAnswer = CheckedSearch & { searchedAt: string; searchPromptVersion: string };
export type SearchDeps = { tool: SearchTool; model: TextModel; now?: () => Date; timeoutMs?: number; log?: (entry: SearchLog) => void };
export class SearchStepError extends Error { constructor(readonly code: SearchErrorCode) }
export async function runSearch(body: SearchBody, deps: SearchDeps, signal: AbortSignal): Promise<SearchAnswer>;
// lib/brand/search/log.ts
export type SearchLog = { host: string; results: number; searchMs: number | null; modelMs: number | null; totalMs: number; outcome: 'answered' | 'aborted' | SearchErrorCode; error?: string };
export function formatSearchLog(log: SearchLog): string; // "brand search host=… results=… search_ms=… model_ms=… total_ms=… outcome=…[ error="…"]"
```

- `runSearch`: one `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs ?? 20_000)])`; the three queries run with `Promise.all`; results deduplicated by URL; when there are none, the model isn't called and the answer is empty lists with `searchedAt` set; otherwise `deps.model.searchEssence`, then `checkSearchAnswer`. Errors: `SearchError` `unavailable` → `search_unavailable`, `busy` → `search_busy`; `ModelError` `busy` → `model_busy`; the timeout or anything else → `search_failed`. It logs exactly once, in a `finally`, as `read.ts` does; `error` uses `describeModelError` for model errors and the `SearchError` message (status and Tavily's message only) for search errors.
- The route: `runtime = 'nodejs'`, `maxDuration = 60`; parses with `searchBodySchema` (400 `search_failed` on a bad body); answers `Response.json(answer)` with `cache-control: no-store`, or `{ error: code }` with its status. It sits behind `proxy.ts` like `/api/brand/read`.

- [ ] **Step 1: Write the failing tests** (`replaySearchTool` and `replayTextModel` from Tasks 2 and 4)

```ts
it('answers checked additions with searchedAt and the prompt version', /* searchedAt === now().toISOString(), searchPromptVersion 'search-1' */);
it('runs the three queries in parallel with the options', /* tool sees 3 queries, each with excludeDomains ['sendanangmassage.com'] */);
it('skips the model when nothing is found', /* empty recording → model.searchEssence not called, lists empty */);
it.each([
  ['unavailable', 'search_unavailable'], ['busy', 'search_busy'],
])('maps a %s search to %s', /* rejects SearchStepError with code */);
it('maps a busy model to model_busy');
it('gives up at the timeout with search_failed', /* hanging tool, timeoutMs 50 */);
it('logs one line without snippets', /* log called once; formatSearchLog output has no result content */);
// route
it('answers 400 search_failed on a body without a town');
it('answers 503 search_unavailable without TAVILY_API_KEY');
```

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/brand-search-run.test.ts tests/unit/brand-search-route.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the step, the log, the deps and the route (mock `@/lib/brand/deps` in the route test as `brand-route.test.ts` does).
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/brand/search/run.ts lib/brand/search/log.ts lib/brand/deps.ts app/api/brand/search/route.ts tests/unit/brand-search-run.test.ts tests/unit/brand-search-route.test.ts
git commit -m "feat(brand): POST /api/brand/search runs the essence search"
```

### Task 7: The browser side: body, request and merge

**Files:**
- Create: `lib/brand/search-client.ts`
- Test: `tests/unit/brand-search-client.test.ts`

**Interfaces:**
- Consumes: `SearchBody` (Task 3), `SearchAnswer`, `SearchErrorCode` (Task 6), `Profile` v2 (Task 1), `saveBrand`/`loadBrand` (`lib/brand/store.ts`).
- Produces:

```ts
export function searchBody(profile: Profile): SearchBody | null; // null when town or category is missing
export function needsSearch(profile: Profile): boolean; // town set and searchedAt null
export function mergeSearch(profile: Profile, answer: SearchAnswer): Profile;
export type SearchOutcome = { kind: 'answered'; answer: SearchAnswer } | { kind: 'error'; code: SearchErrorCode } | { kind: 'signedOut' };
export async function requestSearch(profile: Profile, deps?: { fetch: typeof fetch; signal?: AbortSignal }): Promise<SearchOutcome>;
```

- `searchBody`: `country` from the E.164 `contact.whatsapp`, else `contact.phone` (`+84` → `VN`, `+62` → `ID`), else the site host ending (`.vn`, `.id`), else `null`; `essence.moments` as their values.
- `mergeSearch`: every value already in the profile stays, in order, first; search items go after, only into free places under `LIMITS.moments` and `LIMITS.placeSymbols`, and `LIMITS.searchTerms`; an item already there by `normaliseText` isn't added; sets `searchedAt` and `searchPromptVersion`; the result passes `profileSchema`.
- `requestSearch`: a network `TypeError` or an unknown error body becomes `search_failed`; 401 is `signedOut`.

- [ ] **Step 1: Write the failing tests**

```ts
it('takes the country from the WhatsApp number', /* +84… → 'VN'; Svarga +62… → 'ID' */);
it('falls back to the site domain, then null', /* no phone, siteUrl https://spa.vn/ → 'VN'; https://spa.com/ → null */);
it('returns no body without a town', /* town null → null */);
it('puts search moments after the site\'s and the owner\'s', /* site moment, owner moment, then search moment */);
it('adds no moment when the site filled all 6, and still sets searchedAt');
it('adds no symbol when 5 are there');
it('keeps an owner search term and appends after it without repeats', /* ['hotel massage da nang'] owner + answer ['Hotel massage Da Nang', 'spa near my khe'] → ['hotel massage da nang', 'spa near my khe'] */);
it('maps a 503 search_busy answer and a network failure', /* {kind:'error',code:'search_busy'}; TypeError → 'search_failed' */);
```

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/brand-search-client.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/brand/search-client.ts`.
- [ ] **Step 4: Run and see them pass.**
- [ ] **Step 5: Commit**

```bash
git add lib/brand/search-client.ts tests/unit/brand-search-client.test.ts
git commit -m "feat(brand): ask for the essence search and merge its answer"
```

### Task 8: The panel

**Files:**
- Modify: `components/brand/brand-home.tsx` (trigger, single flight, wait for the sheet, save), `components/brand/panel.tsx` (the new row, "seen on"), `components/brand/source-note.tsx` and `lib/brand/display.ts` (a source on another host), `components/brand/section-sheet.tsx` (search terms chips in "Your feeling")
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/brand-home.test.tsx`, `tests/unit/brand-panel.test.tsx`, `tests/unit/brand-display.test.ts`, `tests/unit/brand-section-sheet.test.tsx`

**Interfaces:**
- Consumes: Task 7.
- Produces:
  - `sourceOf(source, kind, siteUrl?: string)` returns `{ kind: 'elsewhere'; host: string; href: string }` for an http(s) source whose host (without `www.`) differs from `siteUrl`'s; `SourceNote` takes `siteUrl` and shows it as a link "seen on {host}".
  - `Panel` takes `search: 'running' | 'failed' | 'empty' | null`.
- New keys, English copy fixed by the spec; Indonesian and Vietnamese written by the implementer:
  - `brand.panel.fields.searchTerms`: "What people search for"
  - `brand.panel.searching`: "Looking up what people search for…"
  - `brand.panel.searchFailed`: "We couldn't look this up today. We'll try again next time."
  - `brand.panel.searchEmpty`: "Nothing found for your town."
  - `brand.panel.notFoundYet`: "Not found yet"
  - `brand.source.elsewhere`: "seen on {host}"
  - `brand.source.search`: "from what people search for"
  - `brand.edit.hints.upTo8` (or the sheet's existing hint key with `{count}`): "Up to 8"
- `BrandHome`:
  - After a `final` event with `kept`, and once after load when `needsSearch(saved)`, calls `requestSearch`. A ref holds the one search in flight; a second trigger while one runs does nothing.
  - On `answered`, if `editing === 'feeling'` the answer is held in a ref and applied when the sheet closes (after `saveEdit` or cancel). It is applied with `mergeSearch` to the current `savedRef.current`, then saved with `saveBrand(ownerId, merged, now, ownerEdited)`.
  - On `error` it sets `search` to `'failed'`, except `search_unavailable`, which sets `null`. On `signedOut` it goes to `/enter`.
  - An answer with three empty lists sets `'empty'`.
  - A re-read or a forget aborts the search in flight.

- [ ] **Step 1: Write the failing tests**

```ts
// brand-display.test.ts
it('shows a source on another host as seen on', () => {
  expect(sourceOf('https://vietnam.travel/da-nang', 'fact', 'https://sendanangmassage.com/'))
    .toEqual({ kind: 'elsewhere', host: 'vietnam.travel', href: 'https://vietnam.travel/da-nang' });
  expect(sourceOf('https://www.sendanangmassage.com/contact', 'fact', 'https://sendanangmassage.com/').kind).toBe('page');
});
// brand-panel.test.tsx
it('shows search terms as chips with their note', /* 'What people search for', 'hotel massage da nang', 'from what people search for' */);
it('shows the searching line, the failed line and the empty line', /* per search prop */);
it('shows Not found yet with Add for empty search terms, and no warning');
// brand-home.test.tsx (fetch mocked as the file already does for the read)
it('searches after a final read and shows the additions', /* POST /api/brand/search once; 'seen on vietnam.travel' appears; saved profile has searchedAt */);
it('searches once on load when searchedAt is null, and not when set');
it('sends one search when the load and a final event both ask');
it('waits for the feeling sheet to close before merging', /* answer arrives while sheet open; owner saves feeling ['calm']; after close the profile has feeling ['calm'] and the search terms */);
it('keeps the panel on a failed search and shows the line', /* 503 search_busy → panel unchanged + searchFailed text; saved searchedAt still null */);
it('shows nothing about search without a key', /* 503 search_unavailable → no search line */);
it('skips search without a town', /* no request */);
```

- [ ] **Step 2: Run and see them fail.** Run: `pnpm vitest run tests/unit/brand-display.test.ts tests/unit/brand-panel.test.tsx tests/unit/brand-home.test.tsx tests/unit/brand-section-sheet.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the components and the messages in all three languages.
- [ ] **Step 4: Run `pnpm check`.** Expected: PASS, including `i18n-messages.test.ts`.
- [ ] **Step 5: Commit**

```bash
git add components/brand/brand-home.tsx components/brand/panel.tsx components/brand/source-note.tsx components/brand/section-sheet.tsx lib/brand/display.ts messages/en.json messages/id.json messages/vi.json tests/unit/brand-display.test.ts tests/unit/brand-panel.test.tsx tests/unit/brand-home.test.tsx tests/unit/brand-section-sheet.test.tsx
git commit -m "feat(brand): show what people search for in the brand panel"
```

### Task 9: Recordings, the phone test and the developer's verdict

**Files:**
- Create: `scripts/eval-search.ts`; `tests/fixtures/sites/{sen,svarga,<3 more>}/search.json`; `tests/unit/brand-search-replay.test.ts`; `tests/e2e/brand-search.spec.ts`
- Modify: `package.json` (script `"eval:search": "tsx scripts/eval-search.ts"`), `lib/brand/fixtures.ts` (`loadFixture` reads `search.json` when present: `{ promptVersion, modelId, queries: SearchRecording['queries'], answer: SearchModelAnswer }`), `tests/e2e/helpers/brand-stream.ts` (`fulfilSearch(page, answer | { status, error })`), `AGENTS.md` (Commands table: `pnpm eval:search`), `docs/specs/brand/search-essence/journal.md`, `docs/roadmap.md` (1.3 → `done`)

**Interfaces:**
- Consumes: everything above.

- `pnpm eval:search [slug…] [--record]`: for each fixture with a `recording.json`, builds the profile from the replayed brand read, then runs `runSearch` with the real Tavily and Gemini (`recordingSearchTool` and `recordingTextModel` when `--record`), and prints, side by side, the 1.1 essence and the added items. It spends 3 Tavily credits and 1 Flash-Lite request per fixture; say so in its header comment, as `eval-brand.ts` does.

- [ ] **Step 1: Write the failing replay test**: for each fixture with a `search.json`, `runSearch` with `replaySearchTool` and `replayTextModel` gives an answer that passes `checkSearchAnswer` unchanged in shape, has at least one search term, and whose moments' sources are all result URLs.
- [ ] **Step 2: Write the failing Playwright test** at the phone viewport: read with `fulfilRead`, search with `fulfilSearch` (delayed 500 ms): the searching line shows, then "hotel massage da nang" and "seen on vietnam.travel"; a second test with `{ status: 503, error: 'search_busy' }` keeps the panel and shows the failed line.
- [ ] **Step 3: Implement** the script, the fixture loading and the helper; run `pnpm eval:search sen svarga <3 more> --record` (the developer's keys in `.env.local`), and commit the five `search.json` files.
- [ ] **Step 4: Run** `pnpm check` and `pnpm test:e2e`. Expected: PASS. Also `pnpm eval:brand` on a few fixtures is not needed: search doesn't touch the read, and `brand-fixtures-replay.test.ts` already passed in Task 1.
- [ ] **Step 5: Developer's verdict.** Show the developer the five essences, before and after. Copy into `journal.md` the verdict, the prompt version and the summary line the script prints. If the verdict asks for prompt changes, bump `SEARCH_PROMPT_VERSION`, re-record, and record the new line.
- [ ] **Step 6: Mark roadmap 1.3 `done`** in `docs/roadmap.md`, and add `pnpm eval:search` to the AGENTS.md Commands table.
- [ ] **Step 7: Commit**

```bash
git add scripts/eval-search.ts package.json lib/brand/fixtures.ts tests/fixtures/sites/sen/search.json tests/fixtures/sites/svarga/search.json tests/unit/brand-search-replay.test.ts tests/e2e/brand-search.spec.ts tests/e2e/helpers/brand-stream.ts AGENTS.md docs/specs/brand/search-essence/journal.md docs/roadmap.md
git commit -m "test(brand): record essence searches, phone test, and mark roadmap 1.3 done"
```

(Add the three other fixtures' `search.json` by path.)
