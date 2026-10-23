---
title: "Text model and region rule"
description: "Gemini 3.8 Flash for the brand read and post plan, Gemini 3.5 Flash-Lite for replies and translations, both on the free tier through the AI SDK; visitors from the EEA, Switzerland and the UK are turned away from public launch."
status: draft
date: "2026-10-23"
---

# Text model and region rule

## Context and Problem Statement

Decision 0001 put the app on Vercel Hobby in Singapore, at $0 with no card on
file anywhere. The Global Plan uses Gemini's free tier for every text call:

- the brand profile, which also reads the site's photos for the visual style
  (one call, with images);
- the post plan: six captions, hashtags, alt text and image prompts (one
  call);
- review replies, a warm and a short version (one call per review);
- the owner's-language view of a caption or reply (one small call each time
  it is opened).

Gemini's free tier comes with two conditions. Google may use what is sent to
it and have people review it, so no personal data goes in. And an app on the
free tier must not be made available to users in the European Economic Area,
Switzerland or the United Kingdom.

Which Gemini models should the app call, through which SDK, and how does the
app keep visitors from those regions away?

## Decision Drivers

- $0: free tier only, billing never enabled on the Google project.
- Good captions and brand reads first: they decide whether owners post.
- Daily capacity: free limits are per model and per Google project, so the
  cheap, frequent calls shouldn't use up the expensive ones.
- Structured output checked by the zod schemas from decision 0001, and image
  input for the style read.
- Text calls sit behind one interface, so a free Workers AI text model can
  replace Gemini if its free tier changes (Global Plan, Risks).
- The free-tier terms: no app users in the EEA, Switzerland or the UK; no
  personal data sent.

## Considered Options

Models:

1. Gemini 3.8 Flash for the brand profile and post plan; Gemini 3.5
   Flash-Lite for review replies and the owner's-language view.
2. Gemini 3.8 Flash for every call.
3. Gemini 3.5 Flash-Lite for every call.

SDK:

1. Vercel's AI SDK (`ai` with `@ai-sdk/google`).
2. Google's Gen AI SDK (`@google/genai`).

Region rule:

1. Turn away visitors whose IP country is in the EEA, Switzerland or the UK,
   using Vercel's `x-vercel-ip-country` header, with a developer pass.
2. Ask visitors to confirm where they are, with no IP check.
3. No region check; rely on the passphrase forever.

## Decision Outcome

Chosen: models option 1, SDK option 1, region option 1.

**Models**, because the two calls that shape every post get the strongest free
Flash model, while the short, frequent calls run on a separate model and so
draw on a separate daily quota.

| Call | Model | Why |
|---|---|---|
| Brand profile and style read | `gemini-3.8-flash` | Reads pages and photos; mistakes here show in every post |
| Post plan | `gemini-3.8-flash` | Six captions and image prompts in one structured call |
| Review replies | `gemini-3.5-flash-lite` | Short output, called often |
| Owner's-language view | `gemini-3.5-flash-lite` | A translation, called each time a view is opened |

- Both are stable models, take text and images, support structured output
  and thinking, and are free on the free tier.
- The model IDs live in one config module next to the text-model interface.
  A swap is a one-line change, made only after the eval set runs on the new
  model and its score goes in the spec's journal.
- Thinking level and prompt details are settled per call in each spec.

**Free limits.** Google no longer publishes the free-tier numbers. They show
in AI Studio for the project, per model, and can change. Daily quotas reset at
midnight Pacific time, not 00:00 UTC. The numbers below are read from AI
Studio before this decision is approved, and read again before public launch.

| Model | Requests per minute | Tokens per minute | Requests per day |
|---|---|---|---|
| `gemini-3.8-flash` | to read in AI Studio | to read in AI Studio | to read in AI Studio |
| `gemini-3.5-flash-lite` | to read in AI Studio | to read in AI Studio | to read in AI Studio |

`platform/usage-counters` sizes the daily pool from these numbers: a new
brand spends 2 Flash requests, a cached brand 1, a reply 1 Flash-Lite
request.

**SDK**, because the AI SDK checks structured output against our zod schemas,
streams into Next.js route handlers, and has a Workers AI provider, which
makes the fallback in the Global Plan a provider swap. The key is read from
`GOOGLE_GENERATIVE_AI_API_KEY`, a server-only environment variable on Vercel.
The scaffold spec pins the versions.

**Region rule**, because the header costs nothing, needs no extra service, and
covers the terms' requirement for an app open to the public:

- **During the pilot** (phases 0 to 3), the passphrase link is the only way
  in, and only Sen's and Svarga's owners have it. No region check runs.
- **From public launch** (`platform/quotas-abuse`, phase 4), `proxy.ts` reads
  `x-vercel-ip-country` on every request. If the country is on the blocked
  list, the visitor sees "not available in your region yet", in their chosen
  language, and the request never reaches a model.
- **Blocked list:** the 27 EU countries, Iceland, Liechtenstein, Norway,
  Switzerland and the United Kingdom, plus the EU territories with their own
  ISO codes (AX, GF, GP, MQ, RE, YT, MF) and, to be safe, Gibraltar, Jersey,
  Guernsey and the Isle of Man (GI, JE, GG, IM). One constant, unit-tested.
- **No header** (local development, previews off Vercel): the check lets the
  request through.
- **Developer pass:** a signed, httpOnly cookie, set by visiting a private URL
  that holds a secret from the environment, skips the check. It is for the
  developer only. Developing and testing from France is allowed: the terms
  restrict making the app available to users there, not building it.

### Consequences

- Good, because the brand read and post plan get the best free Flash model,
  where quality shows most.
- Good, because replies and translations use another model's quota, so a busy
  day of replies doesn't stop post runs.
- Good, because a model or provider change stays in one module and is checked
  by the eval set first.
- Good, because the region check is free and runs before any model call.
- Bad, because the free-tier numbers aren't published and can shrink at any
  time. The usage bar and the daily pool must read them from config, not
  hard-code them, and the "back tomorrow" message must cover a Google 429.
- Bad, because Gemini's daily reset (midnight Pacific: 15:00 in Da Nang and
  16:00 in Bali in winter, an hour earlier during US summer time) differs from
  Workers AI's 00:00 UTC. The usage bar shows two reset times, or the pool
  resets at the later one. `platform/usage-counters` decides.
- Bad, because free-tier content can be read by Google's reviewers. Only
  public site content, the owner's brand edits and review text go in; the
  reviewer's name stays in the browser, as the Global Plan says.
- Bad, because the AI SDK adds a layer over Google's API, so a new Gemini
  feature may reach `@google/genai` first.
- Bad, because an IP country check is beaten by a VPN. The terms ask us not to
  make the app available there, and a check on every request is a reasonable
  effort; a visitor who hides their location is outside our control.

### Confirmation

- No billing account is linked to the Google project that holds the API key.
  The scaffold spec lists how to check it.
- The free-tier table above is filled from AI Studio before this decision is
  approved.
- The only code that imports `@ai-sdk/google` is the text-model module; the
  model IDs are its constants.
- From public launch, a Playwright test with `x-vercel-ip-country: FR` sees
  the "not available in your region yet" page, and one with `VN` gets through.
- Unit tests check the blocked list and the developer pass.

## Pros and Cons of the Options

- **3.8 Flash and 3.5 Flash-Lite, by call:** best quality where it shows,
  and two separate daily quotas. Two models to evaluate.
- **3.8 Flash for every call:** one model to evaluate. Replies and
  translations spend the scarcest quota.
- **3.5 Flash-Lite for every call:** the most requests a day. Weaker brand
  reads and captions, the product's main quality lever.
- **AI SDK:** zod-checked structured output, streaming helpers for Next.js,
  providers for Gemini and Workers AI behind one API. One more layer;
  provider options lag Google's newest features a little.
- **Google Gen AI SDK:** Google's own, newest features first. Structured
  output takes JSON Schema, so zod schemas need converting; switching to
  Workers AI means rewriting the calls.
- **IP country check:** free, automatic, and on every request. Beaten by a
  VPN.
- **Ask the visitor:** no IP lookup. Easy to click through, so a weak effort
  to keep the app from those regions.
- **No check, passphrase only:** nothing to build. Fine for the pilot, but it
  can't last past public launch.

## More Information

Checked on 2026-10-23:

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing):
  `gemini-3.8-flash`, `gemini-3.6-flash` and `gemini-3.5-flash-lite` are free
  of charge on the free tier, and free-tier content is used to improve
  Google's products.
- [Gemini models](https://ai.google.dev/gemini-api/docs/models): 3.8 Flash and
  3.5 Flash-Lite are stable; both take text, images, video, audio and PDF,
  with structured output, thinking and a 1,048,576-token input limit
  ([3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash),
  [3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)).
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits):
  limits apply per project, not per API key; daily quotas reset at midnight
  Pacific time; free-tier numbers are shown in AI Studio only.
- [Gemini API terms](https://ai.google.dev/gemini-api/terms) (updated
  2026-04-28): only Paid Services may be used when making an app available to
  users in the EEA, Switzerland or the UK; free-tier content may be read by
  human reviewers, so no personal data should be sent; users of the API must
  be 18 or older.
- [Gemini available regions](https://ai.google.dev/gemini-api/docs/available-regions):
  Vietnam, Indonesia, Singapore and France are listed.
- [AI SDK Google provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai):
  structured output with zod, image input, `thinkingLevel` for Gemini 3, and
  `GOOGLE_GENERATIVE_AI_API_KEY`.
- npm's latest versions: `ai` 7.0.152, `@ai-sdk/google` 4.0.104 (peer `zod`
  `^3.25.76 || ^4.1.8`), `@google/genai` 2.31.0.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers):
  `x-vercel-ip-country` is the ISO 3166-1 alpha-2 code of the visitor's IP.
- Global Plan, "Decisions" (0003), "Running at $0" and "Risks".

A new decision replaces this one if Gemini's free tier or terms change, or
if the app takes users in Europe through a paid path.
