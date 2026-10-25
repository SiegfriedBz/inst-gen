---
title: "Search essence"
description: "After a brand read, a short server step looks up what people search for around the business's trade and town through Tavily's free plan, and adds search terms, moments and place symbols to the essence, each marked as coming from search; a check that the free plan allows this comes before any code."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T18:46:49Z }
date: "2026-10-24"
---

# Search essence

## Goal

1.1 reads the essence from the business's own website. A poor site gives a
poor essence: Sen's site says little about why people book a massage in Da
Nang, and nothing about the words people type when they look for one. The
developer's verdict on 1.1 was that the essence must carry the place and the
reasons people come (lotus flowers and rest after sport for Sen; frangipani
and after-surf rest for Svarga), and the site alone often doesn't say it.

This spec adds a second, short step after every brand read: code searches
the web for the business's trade in its town, and a model reads the results
and adds to the essence what people look for there. Three things come back:

- **Search terms**: the words people use when they look for this kind of
  business in this town ("hotel massage Da Nang", "massage after surfing
  Canggu"). 2.2 uses them for hashtags and caption wording.
- **Moments**: why people need the business, as the web says it ("after
  hiking Ba Na Hills", "after a day of surfing at Echo Beach"), each with the
  page it came from.
- **Place symbols**: what the town is known for, when the site gave too few.

Success: on Sen and Svarga, the developer judges the enriched essence closer
to the business than 1.1's alone, and the owner sees in the panel which parts
came from search.

Why now: 2.2 writes captions and hashtags from the essence; search terms and
moments have to exist before it.

## Behaviour

### Before any code: the search tool check

Gemini's own Google Search grounding is not on the free tier (checked
2026-10-24 on the [Gemini pricing page](https://ai.google.dev/gemini-api/docs/pricing):
"Not available" on the free tier for 3.8 Flash and 3.5 Flash-Lite), so it
would need billing, which decision 0003 rules out.

The tool is **Tavily's free Researcher plan**, chosen after comparing the
no-card options below. The first task of the plan is a check, done by the
developer, whose result goes in the journal before any other task starts:

1. Create a Tavily account without a card. Confirm in the dashboard that the
   plan is the free one and that, when credits run out, requests stop rather
   than bill ([pricing](https://www.tavily.com/pricing): "requests will stop
   until your credits reset or you upgrade").
2. Read Tavily's [terms](https://www.tavily.com/terms). Two points need a
   clear yes: section 2 licenses the API "solely for Customer's internal
   business purposes" and forbids making it "available to any third party";
   Shopfront calls it from its own server for the pilot owners, who never see
   the key or the API. If the terms leave it unclear, email Tavily support,
   describe Shopfront (free, non-commercial, two pilot businesses, about 30
   searches a month), and record the answer.
3. Record in the journal: the date, the plan, the credits shown, the
   stop-not-bill check, and the terms verdict with any reply quoted.

If Tavily is not allowed, the same check runs on **Exa** (free tier, $10 of
credit a month, no payment method, [pricing](https://exa.ai/pricing)), whose
stop-or-bill behaviour isn't stated on its pricing page and must be confirmed
the same way. Its client sits behind the same interface (below), so only that
module changes. If neither passes, the work stops, the spec goes back to the
developer, and nothing is built.

No-card options compared on 2026-10-24 (secondary sources, to be confirmed by
the check):

| Tool | Free amount | Card | When it runs out | Why not first |
|---|---|---|---|---|
| Tavily | 1,000 credits a month (1 per basic search) | No | Stops | Chosen |
| Exa | $10 a month, about 2,500 searches | No | Not stated | Fallback |
| Serper | 2,500 searches, once | No | Stops | Doesn't refill |
| Brave | $5 credit a month | Reported as required | Bills | Card on file |
| Gemini grounding | Paid tier only | Billing | Bills | Breaks $0 |
| Google Custom Search | Closed to new sign-ups | — | — | Unavailable |

### When search runs

- After every brand read or re-read that ends with a `final` line, the
  browser calls `POST /api/brand/search` with the new profile. The panel is
  already shown and editable; search fills in behind it.
- It runs only when the profile has a `location.town`. Without one there is
  nothing to search for; the step is skipped, with no message.
- A profile already saved with `searchedAt` set isn't searched again on
  load. A saved profile with `searchedAt: null` and a town (the search failed
  or the app closed during it) is searched once when the panel next opens.
- There is no "search again" button: a re-read searches again.

### The request

The route is reached only with a valid pilot session (`proxy.ts`, as for the
brand read). Body:

```json
{ "siteUrl": "https://sendanangmassage.com/", "category": "massage spa",
  "town": "Da Nang", "area": "Son Tra", "serviceArea": "…", "country": "VN",
  "essence": { "feeling": ["…"], "placeSymbols": ["…"], "senses": ["…"],
               "moments": ["after a surf at My Khe"], "searchTerms": [] } }
```

- The fields are checked with zod; `category` and `town` are required.
- `essence` holds the current values only, without sources. The model reads
  it so it adds instead of repeating, and the server's checks drop repeats
  against it.
- `country` is `"VN"`, `"ID"` or `null`. The browser works it out from the
  country code of the profile's WhatsApp or phone number (+84, +62), else
  from the site's domain ending (`.vn`, `.id`), else `null`.
- Nothing else from the profile is sent: no name, contact details or
  offerings. The queries carry only the trade and the place.

### The queries

Code builds **three queries** from `category`, `town` and, when set, `area`
or the first area named in `serviceArea`. The exact wording is the builder's,
within these rules:

- One query on the trade in the town ("massage spa Da Nang").
- One on why visitors come to the town or what they do there ("things to do
  in Da Nang"), which is where moments come from.
- One on how people look for the trade there, using the area or the way the
  service reaches the customer when the category says so ("hotel massage Son
  Tra Da Nang").
- **Never the business's name**, and no query aimed at reviews: review pages
  carry reviewers' names, which must not reach Gemini's free tier
  (decision 0003).

Each query is sent to Tavily with `search_depth: "basic"` (1 credit;
`auto_parameters` off, so it never becomes 2), `max_results: 5`,
`topic: "general"`, `country` set to `vietnam` or `indonesia` from the
body's `country` (left out when it is `null`), and `exclude_domains` holding the business's own domain (1.1 has
already read it). The three run in parallel. A read therefore costs **3
Tavily credits and 1 Gemini Flash-Lite request**.

Only each result's `title`, `url` and `content` (Tavily's snippet) are kept.
Results whose URL repeats are kept once.

### The model step

One structured call to `TEXT_MODELS.light` (`gemini-3.5-flash-lite`,
decision 0003) through the existing text-model module, which gains a
`searchEssence` method next to `streamBrandProfile`. It isn't streamed: the
answer is short.

Input: the category, town and area, the profile's current essence (so the
model adds instead of repeating), and the results as a list headed by their
URLs. The prompt has its own version constant, `SEARCH_PROMPT_VERSION`
(`search-1`), bumped with every change, as `BRAND_PROMPT_VERSION` is.

Output, checked by code:

| Field | Limit | Rule |
|---|---|---|
| `searchTerms` | up to 8 phrases, ≤ 6 words each | What people would type to find this trade in this town, in English, from the queries and results; lower case, no hashtags, no business names |
| `moments` | up to 3, each a short phrase with a `source` | Why people need the trade there, as a result says it; `source` must be one of the result URLs, or the moment is dropped |
| `placeSymbols` | up to 2 | Only ones the essence doesn't already hold; interpretation, no source |

Code then:

- drops a moment or symbol that matches one already in the essence (case and
  spacing ignored), and a search term that holds a business name from the
  results' titles when the model let one through (best effort: a term equal
  to a result title's first words is dropped);
- trims to the limits, as 1.1's checks do, and never refuses the whole
  answer for one bad item;
- records each drop in the response's `dropped`, with the same
  `{ field, reason }` shape as 1.1.

### What the profile gains

`schemaVersion` goes from 1 to 2 (1.1 said new fields come with a new
version):

| Field | Type | What it holds |
|---|---|---|
| `essence.searchTerms` | string[], ≤ 8 | From search; empty until search has run |
| `searchedAt` | ISO datetime or `null` | When search last succeeded |
| `searchPromptVersion` | string or `null` | `SEARCH_PROMPT_VERSION` of that search |

- Moments from search go into `essence.moments` after the site's own, so the
  site's come first; the total stays within `LIMITS.moments` (6), and search
  moments only fill free places. Their `source` is the result's URL, on
  another host than `siteUrl`.
- Place symbols from search go after the essence's own, within
  `LIMITS.placeSymbols` (5).
- A stored version-1 profile is read as version 2 with
  `essence.searchTerms: []`, `searchedAt: null` and
  `searchPromptVersion: null`, then searched once as above.
- A re-read rebuilds the profile from scratch (1.2), so its search additions
  go with it and the new search replaces them.
- Owner edits work as in 1.2: an edited search moment gets
  `source: "owner"`.

The route answers `{ searchTerms, moments, placeSymbols, dropped, searchedAt,
searchPromptVersion }`. The owner may have edited the essence since the
request left (rows stay editable, and a retry can come days later), so the
browser merges the answer **into the profile as saved when the answer
arrives**, not into the one it sent:

- Search only adds, never replaces or removes. Whatever the essence holds
  then (from the site or typed by the owner) stays where it is and comes
  first; search items go after it, into the places still free under the
  limits. A place the owner freed by deleting an item may be filled.
- An item already there, in any form, isn't added twice (case and spacing
  ignored).
- A search item the owner later removes doesn't come back: once a search
  succeeds, `searchedAt` is set and search doesn't run again until the next
  re-read.
- If the "Your feeling" sheet is open when the answer arrives, the merge
  waits until the sheet closes and then applies to what it saved, so a Save
  from that sheet can't wipe the search additions (1.2's save writes the
  whole profile).
- The merged profile is saved to IndexedDB in one transaction.

### Failures

Search is an extra: the brand read has already succeeded, so a failed search
never shows an error screen or changes what the panel holds.

| Case | Route answers | What the owner sees |
|---|---|---|
| `TAVILY_API_KEY` not set | `503 { error: "search_unavailable" }` | Nothing |
| Tavily answers 429 or 432 (credits used up) | `503 { error: "search_busy" }` | A muted line under "What people search for": "We couldn't look this up today. We'll try again next time." |
| Gemini 429 or 503 | `503 { error: "model_busy" }` | The same line |
| Any other error, or the step passes 20 s | `502 { error: "search_failed" }` | The same line |
| All three queries return no result | `200` with empty lists, and `searchedAt` set | "Nothing found for your town." |

`searchedAt` stays `null` after a failure, so the next opening tries once
more. No retries inside the step: a retry spends free credits.

Each search writes one log line, like the brand read's (`read-log.ts`):
host, number of results, Tavily ms, model ms, total ms, outcome, and the
error message when there is one. Never the snippets or the model's output.

### The panel

In "Your feeling" (1.2), a new row **"What people search for"** shows
`essence.searchTerms` as chips, editable like the other chip lists (add,
remove, reorder), with the hint "Up to 8".

- While search runs: the row shows "Looking up what people search for…" with
  a small spinner, and the other rows stay editable. Search additions appear
  when the answer comes.
- Under each moment from search, the source line reads "seen on
  {host}" (for example "seen on vietnam.travel"), linking to the page in a
  new tab. 1.2's rule shows "from /path" for a source on the site's own host;
  a source on another host uses this line instead.
- Place symbols from search say "our suggestion", as 1.2 already does for
  place symbols.
- Search terms carry one line under the row: "from what people search for".
- An empty row reads "Not found yet" with an "Add" link, as 1.2's empty
  fields do; it gets no warning, since phase 2 can work without it.

Every new string ("What people search for", "Looking up what people search
for…", "seen on {host}", "from what people search for", "Up to 8", "We
couldn't look this up today. We'll try again next time.", "Nothing found for
your town.", "Not found yet") goes in `messages/en.json`, `id.json` and
`vi.json` in the same commit. The search content itself stays in English, as
1.1's does.

### Configuration

- `TAVILY_API_KEY`: a server-only environment variable on Vercel, from the
  free account, with a line in `.env.example` like the Gemini key's. Without
  it the app works and search is skipped (`search_unavailable`).
- The only code that calls Tavily is one module behind a `SearchTool`
  interface (`search(query, options, signal)` returning `{ title, url,
  content }[]`), as `TextModel` is for Gemini, so tests replay recordings and
  Exa can replace Tavily in that module alone.

### Tests and evaluation

- Unit tests (Vitest) for: query building (the three rules, no name, no
  review query, the country); merging (site moments first, the limits,
  duplicates, a v1 profile read as v2); the checks (a moment whose source
  isn't a result is dropped; trims); the route's error answers; the log line.
- The search calls and model answers for Sen, Svarga and three more of 1.1's
  site fixtures are recorded once next to each fixture (`search.json`, the
  same way as 1.1's `recording.json`) and replayed in tests, which never
  call the network.
- The 1.1 eval doesn't change and must still pass 16 of 20: search never
  touches the brand read.
- The developer judges the enriched essence of those five fixtures against
  1.1's alone, with the prompt version, and the verdict goes in the journal.
  There is no score: whether an essence "feels like the business" is a
  judgement.
- A Playwright test at the phone viewport, with search mocked: after a read,
  the row shows the spinner, then search terms and a "seen on" moment; with
  search failing, the panel stays as it was plus the muted line.

## Acceptance criteria

```gherkin
Scenario: The check comes before any code
  Given the search tool check is not recorded in the journal
  When the plan's first task starts
  Then the developer records the plan, the stop-not-bill check and the terms verdict
  And no other task starts until it says yes

Scenario: A read is followed by a search
  Given Sen's owner reads sendanangmassage.com and it ends with a final line
  And the profile's town is "Da Nang"
  When the panel shows the profile
  Then the browser posts the trade and the place to /api/brand/search
  And "What people search for" shows "Looking up what people search for…"
  And the other rows stay editable

Scenario: Search adds to the essence
  Given the search answers 3 search terms, 2 moments and 1 place symbol
  When the answer arrives
  Then the search terms show as chips under "What people search for"
  And the moments appear after the site's own, each with "seen on" and its host
  And the profile is saved with schemaVersion 2 and searchedAt set

Scenario: Queries never name the business
  Given a profile named "Sen Massage" with category "massage spa" in "Da Nang"
  When the queries are built
  Then there are three queries
  And none contains "Sen"
  And none is aimed at reviews

Scenario: A moment without a result page is dropped
  Given the model returns a moment whose source is not one of the result URLs
  When code checks the answer
  Then the moment is dropped
  And dropped records the field and the reason

Scenario: Search never pushes out the site's moments
  Given the site gave 5 moments
  When search returns 3 moments
  Then the profile holds the 5 site moments and 1 search moment

Scenario: No town, no search
  Given a profile whose town is null
  When the read ends
  Then no search request is made

Scenario: A failed search changes nothing
  Given Tavily's credits are used up
  When the search runs
  Then the route answers 503 with "search_busy"
  And the panel keeps what it held
  And the row shows "We couldn't look this up today. We'll try again next time."
  And searchedAt stays null

Scenario: A failed search is tried once more on the next opening
  Given a saved profile with a town and searchedAt null
  When the owner opens the app
  Then the search runs once

Scenario: An old profile becomes version 2
  Given a saved profile with schemaVersion 1
  When the app loads it
  Then it has schemaVersion 2, empty searchTerms and searchedAt null
  And search runs once

Scenario: No key, no search
  Given TAVILY_API_KEY is not set
  When the search route is called
  Then it answers 503 with "search_unavailable"
  And the panel shows nothing about search
```

## Known limits

- **Credits.** 1,000 Tavily credits a month at 3 a read is about 330 reads a
  month for the whole app, shared with evals. Plenty for two pilot owners;
  public launch (phase 4) needs another look. Per-owner limits and the usage
  bar are 2.8's.
- **Snippets can still hold names.** No review query is sent, but a travel
  page's snippet may quote a person. That text goes to Gemini's free tier,
  where reviewers may read it. It is public web text, as the site's own pages
  are; the risk is accepted for the pilot.
- **Tavily may train on our queries** (terms, section 6.5). The queries hold
  only a trade and a town.
- **The business-name filter on search terms is best effort.** The owner can
  delete a term in the panel.
- **No town, no search.** An owner who adds a town later gets search on the
  next re-read, not when saving the town.
- **English results.** Searches are in English, as captions are; what local
  people type in Vietnamese or Indonesian isn't covered.
- The secondary-source figures in the comparison table can change; the check
  confirms only Tavily's (and Exa's, if needed).

## Out of scope

- Using search terms in hashtags and captions: 2.2 `posts/generate-copy`.
- Per-owner daily limits on searches and the usage bar: 2.8
  `platform/usage-counters`.
- Searching for the business by name, its reviews or competitors.
- A "search again" button, and searching in the owner's language.
- Instagram as a source: phase 3.
