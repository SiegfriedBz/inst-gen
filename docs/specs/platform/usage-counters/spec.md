---
title: "Usage counters"
description: "Per-owner daily limits (3 website reads, 3 attempts, 10 new images, 20 replies, plus hidden caps on caption updates and translations), app-wide daily pools per text model and monthly caps on images ($8) and searches, all counted in Upstash Redis and reset at midnight Pacific; a one-line usage bar under the tabs shows what's left and when it resets, in the phone's time zone; the IMAGE_OWNERS allowlist goes."
status: draft
date: "2026-10-26"
---

# Usage counters

## Goal

Every call the app makes spends something shared. Text runs on Gemini's free
tier: one daily quota per model for the whole Google project, shared with the
evals (decision 0003). Searches spend Tavily's 1,000 free credits a month
(`brand/search-essence`). Images spend the prepaid balance, capped at $8 a
month (decision 0004). Today nothing counts any of it. One owner on a busy
afternoon can empty the day's writing for the other spa, and images are
limited only by the `IMAGE_OWNERS` allowlist and the balance.

This item counts every call in **Upstash Redis** (decision 0001: the only
state shared across visitors) and turns that count into:

- **per-owner daily limits**, so a spa's day can't be spent by another spa;
- **app-wide pools and caps**, so the app refuses kindly before Google or
  Tavily refuses rudely, and the image spend never passes $8 a month;
- **a usage bar** on the home screen, so the owner sees what's left today and
  when it comes back, before tapping, not after.

The pilot's rule holds: "super easy to use". The bar is one quiet line, and
a limit reached says in plain words when it comes back.

## Behaviour

### The owner's day: midnight Pacific

Every daily count resets at **00:00 in `America/Los_Angeles`**, the moment
Gemini's free quotas reset (decision 0003). Since 2.1 (decision 0004) no
model resets at 00:00 UTC, so there is only one daily reset, and the per-owner
limits stay in step with the quota they protect.

- In winter that's 15:00 in Da Nang and 16:00 in Bali; during US summer
  time, 14:00 and 15:00. The IANA zone handles the change; no date is
  hard-coded.
- The app always shows it in the phone's own time zone ("Resets at 15:00"),
  never as Pacific time.
- This is not the 3am day of suggestions and reviews (`posts/suggestions`,
  `reviews/reply-drafts`): that one decides what stays **on screen**. This one
  decides what's **left**. The two don't meet on screen: the bar never
  mentions 3am.

(Builder's call: decision 0003 left this to this item, with "the pool resets
at the later one" as an option. With one model family and no Workers AI, one
reset suffices.)

Monthly counts (images, searches) reset on the **1st of the month at 00:00
UTC**.

### What is counted

| Action | Route | Per owner a day | App-wide |
|---|---|---|---|
| Read or re-read the website | `POST /api/brand/read` | **3** reads | text pool of `TEXT_MODELS.brand` |
| Essence search | `POST /api/brand/search` | — (part of a read) | text pool of `TEXT_MODELS.light`; **300 searches a month** |
| Make 6 suggestions (an attempt) | `POST /api/posts/plan` | **3** attempts | text pool of `TEXT_MODELS.posts` |
| Caption update after business edits | `POST /api/posts/rewrite` | 5 updates (not on the bar) | text pool of `TEXT_MODELS.posts` |
| Show in the owner's language | `POST /api/posts/translate` | 30 translations (not on the bar) | text pool of `TEXT_MODELS.light` |
| An attempt's first image of a suggestion | `POST /api/posts/image`, `first: true` | — (part of the attempt) | **image month: $8** |
| "Create new image" | `POST /api/posts/image`, `first: false` | **10** new images | **image month: $8** |
| Write 2 replies / 2 other replies | `POST /api/reviews/reply` | **20** replies | text pool of `TEXT_MODELS.light` |

- The per-owner numbers come from the Global Plan ("about 3 post runs, 10
  image regenerations and 20 review replies a day"); reads, updates and
  translations are the builder's call, sized so that two spas' full day fits
  well inside Flash-Lite's pool.
- They live in one module, `lib/usage/limits.ts`, as constants: changing one
  is a one-line change and its test.
- **"Try again"** on a failed first image is still a first image: it is
  covered by the attempt, not taken from the 10.

### The text pools

Gemini's free quota is per model, so the app keeps **one daily pool per model
id**, not per action. Today every text call runs on `gemini-3.5-flash-lite`
(`lib/ai/text-model.ts`: the brand read and post plan moved off Flash on
2026-10-24), so today all text shares one pool. If a model id in
`TEXT_MODELS` changes, its calls move to that model's pool without another
change.

- Pool sizes come from configuration, never hard-coded (decision 0003,
  "Consequences"): `TEXT_DAILY_REQUESTS`, a server variable of
  `model-id=number` pairs, comma-separated. Its default, in code, is
  `gemini-3.5-flash-lite=500,gemini-3.8-flash=20`, decision 0003's
  unconfirmed numbers. A model missing from the list has no app-wide pool:
  only per-owner limits and Google's own 429 apply.
- The pool counts **every request sent to Google**, whatever its outcome,
  because Google counts them. The per-owner counts don't (below).
- Evals don't go through the app and aren't counted; they can still empty
  Google's quota first. Google's own 429 stays `model_busy`, with its
  message, as today.

### When a count is taken and given back

For every counted route, after the session and the body are checked and
before any model or search call:

1. One atomic step in Redis (a single script) checks the owner's daily count
   and every app-wide count the action touches, and takes one from each only
   if **all** have room. Two taps at once can't both pass the last unit.
2. If one is full, nothing is taken, no call is made, and the route answers
   **429** with one of the codes below and `resetsAt`, the instant it comes
   back (ISO 8601, UTC).
3. If the call then fails for a reason that isn't the owner's
   (`model_busy`, `model_timeout`, `model_failed`, and their image and
   search equivalents), the **owner's** count is given back. App-wide counts
   are not: the request reached Google, Tavily or the paid image model.
4. A call the owner stops (the read's "Stop", a closed page: `aborted`) is
   spent, as `brand/brand-panel` already says.
5. A refused or failed check never changes the answer's shape for
   success: a counted success is answered exactly as today.

| Code | When | `resetsAt` |
|---|---|---|
| `limit_reached` | the owner's daily count for this action is used up | next midnight Pacific |
| `pool_empty` | the day's text pool for the call's model is used up | next midnight Pacific |
| `images_month` | another image would bring the month's estimate past $8 | 1st of next month, 00:00 UTC |

The search route keeps answering as `brand/search-essence` says when search
can't run: a full month answers `503 { error: "search_unavailable" }`, and
the panel shows nothing about search. The read itself goes on.

### The image month

- Each image request sent to the image model adds **$0.0504** (decision
  0004's 2K price for Nano Banana 2.1) to the month's estimate, before the
  call, and is never given back: a failed or lost image may still be billed.
- An image is refused with `images_month` when the estimate **plus one
  image** would be **more than $8.00**: 158 images a month pass ($7.96), the
  159th doesn't.
- The price and the cap are server variables with these defaults,
  `IMAGE_PRICE_USD=0.0504` and `IMAGE_MONTH_CAP_USD=8`, so a price change
  is a configuration change. Counted in whole images; the estimate is
  images × price.
- The prepaid balance stays the hard limit (decision 0004). This cap only
  makes the app stop first, kindly.

### The searches

The month counts searches, not credits: a search spends 3 Tavily credits, so
300 searches spend 900 of the 1,000, leaving 100 for `pnpm eval:search`
(builder's call). Tavily's own month may not start on the 1st; the evals'
margin covers the gap. `SEARCHES_PER_MONTH` (default `300`) is a server
variable.

### The developer

`dev` (app-scaffold's developer passphrase) has **no per-owner limits**, so
the developer can test the deployment. Its calls still count in the text
pools, the image month and the searches, like everyone's. Its bar says "No
daily limits (developer)". AGENTS.md's rule stands: no testing on a pilot
day.

### Images for every owner

The `IMAGE_OWNERS` allowlist goes, as decision 0004 and
`posts/generate-images` planned ("until 2.8 counts image spend"): with
`GOOGLE_IMAGE_API_KEY` set, every signed-in owner can make images, within the
limits above. Without the key, images stay off for everyone, as today
(`images_off`). `lib/posts/image-access.ts` keeps only the key check;
`IMAGE_OWNERS` leaves `.env.example`.

The image request body gets `first: boolean`: `true` for an attempt's six
images and their "Try again", `false` for "Create new image". The phone says
which; the server trusts it (known limit).

### Where the counts live

- One Upstash Redis database, on the free plan, AWS Singapore, no card
  (decision 0001), reached over its REST API with `@upstash/redis` (the plan
  pins the version). Server variables `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN`, added to `.env.example` with made-up values.
- Keys hold only an owner id, an action, a model id and a date; **no
  business content, no review, no IP**. For example
  `usage:2026-10-26:sen:attempts`, `usage:2026-10-26:pool:gemini-3.5-flash-lite`,
  `usage:2026-10:images`. Daily keys expire after 2 days, monthly keys after
  40, so nothing builds up.
- Production and preview deployments share the database (the free plan has
  one): they share Google's quota too, so they must share its pool.
- About 4 commands per counted request and 1 per usage read: far below the
  free plan's 500,000 a month.

**Without the Upstash variables:**

- On Vercel (`VERCEL_ENV` set), the app isn't configured: it answers like a
  bad `PILOT_PASSPHRASES` (app-scaffold's 503 page), and logs which variable
  is missing, never its value.
- Elsewhere (`pnpm dev`, `pnpm test:e2e`, Vitest), counts are kept in the
  server's memory, so the app works without an account. The server logs
  that once.

**If Redis fails during a request** (timeout, network): text calls go ahead
(fail open; they spend only free quota) and the route logs it; image calls
are refused with `usage_unavailable`, since they spend money. Each Redis call
is cut at 2 seconds.

### Reading what's left: `GET /api/usage`

Behind the pilot session like the other routes, `cache-control: no-store`.
It answers, for the signed-in owner:

```json
{
  "resetsAt": "2026-10-26T07:00:00.000Z",
  "limited": true,
  "left": { "reads": 2, "attempts": 3, "newImages": 10, "replies": 20 },
  "limits": { "reads": 3, "attempts": 3, "newImages": 10, "replies": 20 },
  "poolEmpty": false,
  "images": { "on": true, "monthFull": false, "backAt": "2026-11-01T00:00:00.000Z" }
}
```

- `left` is the owner's own count, but **0** for a text action whose model's
  pool is empty, so the bar never promises what the pool can't give.
- `limited` is `false` for `dev`; `left` and `limits` are then left out.
- `images.on` is false without the image key, as today's `images_off`.

### The usage bar

One line of small, muted text, **directly under the tab row**, on all three
tabs, wrapping on a narrow phone. It shows only what that tab spends, then
when it resets:

| Tab | English, example |
|---|---|
| Your business | Left today: 2 website reads · Resets at 15:00 |
| Create Posts | Left today: 3 attempts, 10 new images · Resets at 15:00 |
| Reviews | Left today: 20 replies · Resets at 15:00 |

- Numbers and the time are formatted for the screen's language and the
  phone's time zone with next-intl (`platform/i18n`: the bar is the first
  screen to show either).
- A count at **0** shows in the error colour; nothing else changes colour.
- Without images (`images.on` false), "new images" isn't on the posts tab's
  line.
- When the text pool is empty, the line becomes "Shopfront has used today's
  free writing. Back at {time}." on every tab.
- When the image month is full, the posts tab's line ends with "No new
  images until {date}." and "new images" goes from it.
- For `dev`: "No daily limits (developer) · Resets at 15:00".
- The bar is read from `GET /api/usage` when the home screen opens, after
  every counted request settles (success or not), and when the page becomes
  visible again. While the first read is on its way the line is empty, with
  its height kept, so nothing jumps. If it fails, the line stays empty; the
  buttons still work and the server still refuses past a limit.
- The bar is not a button and opens nothing (builder's call: it explains;
  the owner guide, 2.9, says more).

### At a limit

Each button that spends a count knows from the bar what's left. At **0**:

- **"Make 6 suggestions" / "Make 6 new suggestions"**: disabled, with
  "You've made today's {limit} attempts. More at {time}." under it.
- **"Re-read my website"**: disabled, with "You've read your website {limit}
  times today. Again at {time}." A first read at 0 (rare: three failed
  first reads are given back) shows the same.
- **"Create new image"**: disabled, with "You've made today's {limit} new
  images. More at {time}." under the card's links.
- **"Write 2 replies" / "Write 2 other replies"**: disabled, with "You've
  written today's {limit} replies. More at {time}."
- The pool empty: every text button disabled, with the pool line.
- The image month full: "Create new image" disabled, and an attempt's
  images aren't asked for: its cards show "No new images until {date}."
  where the image would be. Its captions still come.

The automatic **caption update** (2.5) and the **owner's-language view**
(2.4) have no button to disable: when the server answers `limit_reached`,
they show their existing error line, with "Captions were updated {limit}
times today. Again at {time}." or "Today's {limit} translations are used
up. More at {time}." 2.5's "Update captions" shows, as for any failed
update.

The phone's knowledge can be stale (two phones, a tab left open): the
server's 429 is the truth. Any of the codes above, answered by any route,
shows the matching line where that action's error shows today, and refreshes
the bar.

### Logs

Each counted route's existing log line gains the counts' outcome:
`usage=taken|given_back|limit_reached|pool_empty|images_month|unavailable`.
`GET /api/usage` logs nothing. Never a key's value beyond the counts, never
the Upstash token.

### Strings

New, in English, Indonesian and Vietnamese (the developer's translations;
the owners read them back during the pilot). `{time}` is the hour and minute
and `{date}` the day and month ("November 1", "1 tháng 11"), both formatted
by next-intl in the phone's time zone; `{limit}` is the limit's number.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `usage.left` | Left today: {items} | Sisa hari ini: {items} | Còn lại hôm nay: {items} |
| `usage.resets` | Resets at {time} | Direset pukul {time} | Làm mới lúc {time} |
| `usage.reads` | {count, plural, one {# website read} other {# website reads}} | {count} kali baca situs | {count} lần đọc trang web |
| `usage.attempts` | {count, plural, one {# attempt} other {# attempts}} | {count} percobaan | {count} lần thử |
| `usage.newImages` | {count, plural, one {# new image} other {# new images}} | {count} gambar baru | {count} hình mới |
| `usage.replies` | {count, plural, one {# reply} other {# replies}} | {count} balasan | {count} câu trả lời |
| `usage.developer` | No daily limits (developer) | Tanpa batas harian (pengembang) | Không giới hạn hằng ngày (nhà phát triển) |
| `usage.poolEmpty` | Shopfront has used today's free writing. Back at {time}. | Shopfront sudah memakai jatah menulis gratis hari ini. Kembali pukul {time}. | Shopfront đã dùng hết lượt viết miễn phí hôm nay. Quay lại lúc {time}. |
| `usage.imagesMonth` | No new images until {date}. | Tidak ada gambar baru sampai {date}. | Không có hình mới cho đến {date}. |
| `usage.limit.attempts` | You've made today's {limit} attempts. More at {time}. | Anda sudah membuat {limit} percobaan hari ini. Bisa lagi pukul {time}. | Bạn đã dùng {limit} lần thử hôm nay. Có thêm lúc {time}. |
| `usage.limit.reads` | You've read your website {limit} times today. Again at {time}. | Anda sudah membaca situs {limit} kali hari ini. Bisa lagi pukul {time}. | Bạn đã đọc trang web {limit} lần hôm nay. Đọc lại được lúc {time}. |
| `usage.limit.newImages` | You've made today's {limit} new images. More at {time}. | Anda sudah membuat {limit} gambar baru hari ini. Bisa lagi pukul {time}. | Bạn đã tạo {limit} hình mới hôm nay. Có thêm lúc {time}. |
| `usage.limit.replies` | You've written today's {limit} replies. More at {time}. | Anda sudah menulis {limit} balasan hari ini. Bisa lagi pukul {time}. | Bạn đã viết {limit} câu trả lời hôm nay. Có thêm lúc {time}. |
| `usage.limit.rewrites` | Captions were updated {limit} times today. Again at {time}. | Teks sudah diperbarui {limit} kali hari ini. Bisa lagi pukul {time}. | Chú thích đã được cập nhật {limit} lần hôm nay. Cập nhật lại được lúc {time}. |
| `usage.limit.translations` | Today's {limit} translations are used up. More at {time}. | {limit} terjemahan hari ini sudah habis. Bisa lagi pukul {time}. | Đã dùng hết {limit} bản dịch hôm nay. Có thêm lúc {time}. |
| `usage.unavailable` | Images are paused for a moment. Try again in a few minutes. | Gambar dijeda sebentar. Coba lagi beberapa menit lagi. | Tạo hình đang tạm dừng. Hãy thử lại sau vài phút. |

`images_month` on an image request reuses `usage.imagesMonth`.

### Other documents

The PR that ships this item:

- marks 2.8 `done` in the roadmap;
- adds the Upstash variables and the three configuration variables to
  `.env.example`, and removes `IMAGE_OWNERS`;
- adds the Upstash account's line to app-scaffold's account check, if it
  isn't there (it is: "Console → Account → Billing: Free plan, no payment
  method");
- leaves the other specs as they are: their "until 2.8" lines are now
  history, and the code wins on facts.

### Tests

- Vitest:
  - the day: `resetsAt` from instants around midnight Pacific, in winter and
    summer time, and the date key it gives (23:59 and 00:00 Pacific);
  - the month: the 1st at 00:00 UTC, and the image cap at its boundary (158
    images pass, the 159th is refused; with a changed price);
  - `TEXT_DAILY_REQUESTS` parsing: the default, a custom list, a model
    missing from it, a bad entry ignored and logged;
  - the atomic take: the owner's count and the pool both taken, neither when
    one is full, two takes racing for the last unit (memory store and a
    faked Redis client);
  - giving back: on `model_busy`, `model_timeout`, `model_failed`, not on
    `aborted`; the pool and the image month never given back;
  - each counted route: 429 with each code and `resetsAt`, the call not
    made, the log line's `usage=` field; `dev` past the owner limits but not
    past a pool; images without the key still `images_off`, without Redis
    `usage_unavailable`; text without Redis going ahead;
  - search: a full month answers `search_unavailable`;
  - `GET /api/usage`: 401 without a session, the answer for an owner, for
    `dev`, with an empty pool, with a full image month;
  - the configuration check: on Vercel without the Upstash variables, the
    503; off Vercel, the memory store;
  - the bar: each tab's line, a 0 in the error colour, without images, the
    pool line, the month line, `dev`'s line, the time in the phone's zone
    and the screen's language (with a time zone set), an empty line while
    loading or after a failure;
  - at a limit: each button disabled with its line; a 429 from the server
    showing the line and refreshing the bar; the caption update's and the
    translation's lines.
- Playwright at the phone viewport, routes mocked: the bar on each tab; make
  attempts until the third, see "Make 6 new suggestions" disabled with its
  line and the bar at 0; the bar with no horizontal scroll at 320px in
  Vietnamese.

## Acceptance criteria

```gherkin
Scenario: The bar shows what's left on the posts tab
  Given Sen's owner has made 1 attempt today and no new image
  When they open "Create Posts"
  Then the line under the tabs reads "Left today: 2 attempts, 10 new images · Resets at 15:00"

Scenario: The reset is shown in the phone's time zone
  Given the phone is in Asia/Makassar in November
  Then the bar reads "Resets at 16:00"

Scenario: The fourth attempt is refused kindly
  Given Sen's owner has made 3 attempts today
  Then "Make 6 new suggestions" is disabled
  And "You've made today's 3 attempts. More at 15:00." shows under it
  And when the plan route is called anyway, it answers 429 "limit_reached" and no model call is made

Scenario: A failed call gives the attempt back
  Given Sen's owner has 2 attempts left today
  When their next attempt fails with "model_timeout"
  Then the bar still reads "Left today: 2 attempts, 10 new images · Resets at 15:00"

Scenario: One spa can't spend another's day
  Given Svarga's owner has written 20 replies today
  When Sen's owner writes 2 replies
  Then Sen's replies are written

Scenario: The day comes back at midnight Pacific
  Given Sen's owner has made 3 attempts before 15:00 in Da Nang, in November
  When they open the app at 15:01
  Then the bar reads "Left today: 3 attempts"

Scenario: The image month stops at $8
  Given 158 images were made this month
  When an owner asks for one more image
  Then the image route answers 429 "images_month" and the image model isn't called
  And the card shows "No new images until November 1."

Scenario: Every owner can make images
  Given GOOGLE_IMAGE_API_KEY is set and IMAGE_OWNERS isn't
  When Sen's owner makes an attempt
  Then its six images are made

Scenario: The pool empty stops every text button
  Given the day's pool for gemini-3.5-flash-lite is used up
  Then every tab's line reads "Shopfront has used today's free writing. Back at 15:00."
  And "Write 2 replies" is disabled

Scenario: The developer isn't limited per owner
  Given dev has made 5 attempts today
  When dev makes another attempt
  Then it is made, and counted in the pool

Scenario: No Upstash on Vercel
  Given VERCEL_ENV is set and UPSTASH_REDIS_REST_URL isn't
  When any page is requested
  Then the app answers its "isn't configured" 503 page
```

## Known limits

- **The phone says which images are first.** A tampered phone could pass
  every image as `first: true` and skip the 10 a day; the image month still
  caps the money. Pilot owners are trusted; phase 4 (`platform/quotas-abuse`)
  revisits this.
- **The pool sizes are guesses** until AI Studio confirms them (decision
  0003). Too high, and Google's 429 (`model_busy`, "try again tomorrow")
  comes before the pool line; too low, and owners stop early.
- **Evals aren't counted.** An eval on a pilot day can empty Google's quota
  while the bar still shows room.
- **The image estimate is an estimate.** It counts every request at the 2K
  price; a refused or safety-blocked image may not be billed, so the real
  spend is at most the estimate.
- **Tavily's month may not start on the 1st**; 100 credits of margin cover
  the evals and the gap.
- **The reset falls in the afternoon** (15:00 or 16:00, an hour earlier in
  US summer), not overnight: an owner who works in the morning gets a full
  day, one who works around 15:00 may see their limits come back mid-task.
- **Two clocks.** Attempts and reviews leave the screen at 3am; counts come
  back at midnight Pacific. The bar shows only the second.
- **Shared database.** A preview deployment's tests spend the same day as
  production.
- **Redis down** lets text through uncounted and stops images for a moment.

## Out of scope

- Per-IP limits, a bot check, the region block and abuse counters: phase 4
  `platform/quotas-abuse`.
- An owner's own Gemini key, and more capacity: phase 4.
- A usage history, charts, or a page that explains the limits: the owner
  guide, 2.9 `guide/owner-guide`, explains them in words.
- Telling the maintainer when the prepaid balance or Tavily credits run low.
- Counting the evals' requests.
