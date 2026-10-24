# Search essence: journal

## Calls made along the way

- 2026-10-24: Search tool check (plan Task 0), terms reading. Tavily's
  [terms](https://www.tavily.com/terms) (last updated 2026-05-04) grant use
  "solely for Customer's internal business purposes" and bar making the
  Services "available to any third party" without written consent
  (section 2). Section 3.2 says integration with Customer Applications (1.2:
  software "that Customer interfaces with the Services, including via any
  Tavily API") doesn't violate it, and 3.5 covers "end users who are third
  parties outside of Customer's organization". Reading: Shopfront is a
  Customer Application calling Tavily from its own server, the owners never
  get the key or the API, so it fits 3.2 and 3.5; but "internal business
  purposes" leaves room for doubt, so the spec's rule applies and Tavily is
  asked in writing.
- 2026-10-24: The developer has a Tavily API key, and called the check
  done for the MVP: Tavily is allowed on the terms reading above, with no
  email to Tavily and no record of the plan's credits or of the stop-not-bill
  setting. Verdict: yes. To revisit before public launch (phase 4).
- 2026-10-24: Recorded the essence search on sen, svarga, karsa-spa,
  orient-spa and phin-coffee (`pnpm eval:search --record`), 3.0 to 4.9 s
  each:
  `essence search: 5/5 answered · prompt search-1 · model gemini-3.5-flash-lite`
- 2026-10-24: `pnpm test:e2e` couldn't start on port 3000, which another
  project's Next server held; it ran on a free port through a throwaway
  config, not committed: 26 passed.

## RED

Task 1, the first tests of this work:

`Tests  6 failed | 54 passed (60)`

## GREEN

`pnpm check` after Task 9:

`Tests  598 passed (598)`
