---
title: "App stack and hosting"
description: "One Next.js 16 app on Vercel Hobby in Singapore, no database, usage counters in Upstash Redis on its free plan."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-23T20:17:38Z }
date: "2026-10-23"
---

# App stack and hosting

## Context and Problem Statement

inst-gen's MVP is a free tool built for two friends' massage spas, Sen (Da
Nang) and Svarga (Bali). Nobody pays for it, nobody is paid to build it, and
it shows no ads. It must run at $0 on free tiers that stop rather than bill,
with no card on file anywhere. If the MVP proves useful, a separate commercial
app will be built from it later, with its own stack decision.

A run reads a website, calls Gemini and Workers AI, and streams progress for
about a minute. Brand, drafts and images stay in the owner's browser; the only
state shared across visitors is the daily usage counters.

Which framework, host and shared store should the MVP run on?

## Decision Drivers

- $0, with no card on file, on free plans that stop when a limit is reached.
- Ship fast on the developer's daily stack (Next.js, TypeScript).
- A streamed run of about a minute must fit in one request.
- Fast for owners on phones in Vietnam and Indonesia.
- Allowed by the host's terms for a free, non-commercial project.
- As few services and accounts as possible.

## Considered Options

1. Next.js 16 on Vercel Hobby, counters in Upstash Redis.
2. Next.js 16 on Cloudflare Workers Free through OpenNext, counters in Upstash
   Redis.
3. A Vite single-page app with a Hono API on Cloudflare Workers Free, counters
   in a Durable Object.

## Decision Outcome

Chosen option: 1, because it runs Next.js with nothing to adapt, its 300 s
function limit covers a one-minute run with room to spare, and the Hobby
plan's non-commercial rule fits a free MVP for friends.

The stack:

- **Framework:** Next.js 16, App Router, TypeScript in strict mode.
- **Hosting:** Vercel Hobby, on its free `vercel.app` address, with no custom
  domain. Functions run in Singapore (`sin1`), the single region Hobby
  allows, closest to Da Nang and Bali.
- **State:** no database. Brand, drafts and images live in the owner's browser
  (IndexedDB). Usage counters live in one Upstash Redis database on the free
  plan, created in the AWS Singapore region, with no card on file.
- **Validation:** zod, one schema each for model output, browser storage and
  forms.

Text model, tooling, image model and long-running work are settled by
decisions 0003, 0002, 0004 and 0005.

### Consequences

- Good, because Next.js runs on Vercel as built: route handlers, streaming
  and Next.js 16's `proxy.ts` need no adapter.
- Good, because a run of about a minute fits under Hobby's 300 s function
  limit.
- Good, because when a Hobby limit is reached, the feature pauses; nothing is
  billed.
- Good, because Upstash works from any host, so the counters don't tie the app
  to Vercel.
- Bad, because the pilot passphrase must be built into the app: Vercel's
  password protection is a paid add-on for Pro.
- Bad, because a limit reached on Hobby pauses that feature for up to 30 days,
  so usage needs watching.
- Bad, because Hobby keeps runtime logs for 1 hour only, so a pilot problem
  must be looked at quickly or logged elsewhere.
- Bad, because the commercial app can't stay on Hobby: it will need Vercel Pro
  or another host, decided then.

### Confirmation

- `harness/app-scaffold` (roadmap 0.5) deploys this stack: the production URL
  is a `vercel.app` address and `vercel.json` sets `"regions": ["sin1"]`.
- No account used by the app (Vercel, Upstash, Cloudflare, Google) has a card
  on file. The scaffold spec lists each account and how to check it.
- The app takes no payment and shows no ads while it runs on Hobby. Charging
  owners means a new decision first.

## Pros and Cons of the Options

- **Next.js on Vercel Hobby:** native Next.js, 300 s functions, generous free
  limits (1,000,000 function invocations, 4 hours of active CPU and 100 GB of
  transfer a month). Non-commercial use only, one function region, password
  protection only on Pro.
- **Next.js on Cloudflare Workers Free via OpenNext:** commercial use allowed,
  and the same account as the Workers AI images. But only 10 ms of CPU per
  request, a 3 MiB compressed limit on the app, and no Node middleware under
  OpenNext. All of these could break a page or the passphrase gate and cost
  time to work around. It wins only once the app is commercial, which the MVP
  is not.
- **Vite + Hono on Cloudflare Workers Free:** small and fast on Workers, and
  a Durable Object would replace Upstash. But it leaves the developer's daily
  stack and rebuilds what Next.js gives for free (routing, streaming,
  server-side rendering), so the MVP ships later.

## More Information

Checked on 2026-10-23:

- [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines):
  Hobby is "restricted to non-commercial personal use only"; commercial means
  a deployment used for anyone's financial gain, such as taking payment,
  advertising a product or being paid to build the site.
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby): 300 s function
  limit, monthly included usage, pausing rather than billing, 1 hour of logs,
  password protection on Pro only.
- [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region):
  new projects default to `iad1`; Hobby gets a single region, set in
  `vercel.json`.
- [Upstash Redis pricing](https://upstash.com/pricing/redis): the free plan
  gives 500,000 commands a month, 250 MB and one database; adding a card
  switches it to pay-as-you-go, so none is added.
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
  and [OpenNext for Cloudflare](https://opennext.js.org/cloudflare): 10 ms of
  CPU per request on Free, 3 MiB compressed limit on Free, Next.js 16
  supported, Node middleware not yet.
- [Cloudflare self-serve terms](https://www.cloudflare.com/terms/): no
  personal-use restriction on free services.

A commercial version of the app will need a new decision that replaces this
one.
