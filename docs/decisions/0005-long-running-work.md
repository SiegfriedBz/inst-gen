---
title: "Long-running work"
description: "A run is a chain of short streamed requests driven by the browser, which saves each finished step in IndexedDB and, after an interruption, re-asks only for the missing steps; no workflow service, no server-side run state."
status: draft
date: "2026-10-23"
---

# Long-running work

## Context and Problem Statement

A run takes about a minute: the brand read (~20 s), then the post plan and
six images (~40 s more). The owner watches results arrive on her phone.

Phones pause a page that goes to the background. When Sen's owner switches to
WhatsApp or her screen locks, the browser usually drops the connection. A
single one-minute request then loses everything the server produces after
that moment, and starting again spends free quota that is scarce: about 20
Flash requests a day for the whole app (decision 0003).

Decision 0001 keeps no database: brand, drafts and images live in the
owner's browser, and the server keeps only usage counters.

How does a run survive the owner leaving the page halfway, without a new
service or server-side state?

## Decision Drivers

- An interruption costs at most the step that was in progress. A run doesn't
  have to finish while the page is away; it must pick up where it stopped
  when she comes back.
- No Gemini or Workers AI call is repeated for a step that already reached
  the browser.
- $0, no card on file, no new account (decision 0001).
- No drafts or images stored on the server (decision 0001).
- Results still appear as they are produced: captions one by one, images as
  each is ready.
- Every request stays well under Hobby's 300 s limit and 4.5 MB body limit.

## Considered Options

1. **Browser-driven steps.** The browser runs the job as a chain of short
   requests, each streaming its own output, saves each finished step in
   IndexedDB, and re-asks only for the missing steps after an interruption.
2. **One streamed request.** A single route handler runs the whole minute and
   streams progress.
3. **Vercel Workflows.** A durable workflow on Vercel runs the steps on the
   server; the browser reads the run's stream and results, and reconnects to
   them.
4. **Inngest.** A durable workflow on Inngest's free plan calls back into the
   app for each step; results are written somewhere the browser can fetch.
5. **A Postgres queue.** Jobs and results in a database, polled by the
   browser.

## Decision Outcome

Chosen option: 1, because it meets "lose at most the step in progress" with
what decision 0001 already chose (route handlers and IndexedDB), and keeps
drafts and images off the server.

**Steps.** A run is a short chain of route handlers, each a pure function of
its input, with no run state kept between them:

| Step | Input from the browser | Output | Typical time |
|---|---|---|---|
| Brand read | Website URL | Brand profile, streamed as it fills | ~20 s |
| Post plan | Brand profile | Six captions, hashtags, alt text and image prompts, streamed post by post | ~15 s |
| Image (×6, in parallel) | One image prompt | One tall image | ~5–10 s each |

The specs that build each step (`brand/extract-site`, `posts/generate-copy`,
`posts/generate-images`) set its route, schema and exact boundaries. A step
that would run longer than about 30 s is split.

**The run lives in the browser.** A run record in IndexedDB holds each step's
status (`pending`, `running`, `done`, `failed`) and its output. A step's
output is saved the moment it completes; a streamed step's partial output is
shown but not saved as done.

**Resume.** When the page loads or becomes visible again
(`visibilitychange`), the app looks for an unfinished run. Every step marked
`running` whose request is no longer alive goes back to `pending`, and the
pending steps are requested again, in order. Steps already `done` are never
re-requested. No confirmation is asked: the run simply carries on.

**Server side.** Each route handler passes `request.signal` to its model call,
so a dropped connection stops the work instead of finishing it for nobody.
Nothing about a run is stored on the server; the usage counters
(`platform/usage-counters`) are the only shared state.

**Screen kept awake.** While a run is in progress, the app holds a screen
wake lock (Screen Wake Lock API), requested when the owner taps to start and
again each time the page becomes visible. If the browser refuses it, the run
goes on without it. This makes a screen lock less likely; switching apps
still pauses the page, which resume covers.

### Consequences

- Good, because an interruption loses at most the steps in flight: one text
  step, or up to six image calls running in parallel.
- Good, because no new service, account or server-side store is added, and
  drafts never leave the owner's phone.
- Good, because each request is short (under 30 s), far from Hobby's 300 s
  limit, and an image response stays well under 4.5 MB.
- Good, because each step is a plain route handler, so a spec can test it on
  its own with recorded model calls.
- Bad, because the step that was in flight is lost and its model call has
  already counted against Google's or Cloudflare's daily quota. A lost post
  plan costs one of about 20 daily Flash requests.
  `platform/usage-counters` decides whether our own counters charge for a
  step the browser never received.
- Bad, because the browser holds the run's logic (order, retries, resume), so
  the client code is more than a single fetch, and needs tests of its own.
- Bad, because nothing runs while the page is away: a run only finishes
  with the owner's page open.
- Bad, because the browser sends each step its input (the brand profile, an
  image prompt), which the server must validate with zod like any other
  input.

### Confirmation

- Each spec that adds a step lists its route, its input and output schemas,
  and a time budget under 30 s.
- A Playwright test starts a run, takes the page offline after the brand read,
  brings it back, and checks that the run finishes with exactly one brand
  read request.
- A unit test of the run record checks that a `running` step with no live
  request becomes `pending` on resume, and that a `done` step is never
  re-requested.
- No route handler writes run data to Upstash or any other store.

## Pros and Cons of the Options

- **Browser-driven steps:** loses at most the steps in flight, no new
  service, no server-side drafts, short requests. The client holds the run
  logic; nothing progresses while the page is away.
- **One streamed request:** the simplest code, one fetch. A phone going to
  the background loses the whole run, and the restart spends the scarce
  Flash quota again.
- **Vercel Workflows:** runs to the end while the page is away, retries
  steps, and on Hobby includes 50,000 events and 1 GB of data written a
  month. But it stores every step's input and output, so drafts and images
  sit on Vercel for 1 day and up to 66 days, against decision 0001. A run's
  six images (roughly 1 MB each) would use the 1 GB written allowance in
  about 160 runs a month, unless images go to yet another store. More moving
  parts (Queues, a workflow runtime) for a minute-long job.
- **Inngest:** runs to the end while the page is away; free plan with
  50,000 executions a month, five concurrent steps and no card. A second
  service and account, a callback route to secure, and its results still
  need a store the browser can fetch from, which decision 0001 doesn't have.
- **Postgres queue:** durable and familiar, but it needs the database
  decision 0001 ruled out, plus a worker to run the jobs.

## More Information

Checked on 2026-10-23:

- [Vercel Functions limits](https://vercel.com/docs/functions/limitations):
  on Hobby, 300 s default and maximum, including the time spent streaming
  the response; 4.5 MB maximum request and response body.
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API):
  Baseline 2025; HTTPS only; the lock is released when the page is hidden and
  must be requested again when it is visible; a request can be refused, for
  example in power-saving mode.
- [Vercel Workflows](https://vercel.com/docs/workflows),
  [pricing and limits](https://vercel.com/docs/workflows/pricing) and
  [data retention](https://vercel.com/docs/workflows/retention): Hobby
  includes 50,000 events and 1 GB of data written a month; a normal step
  writes three events; run payloads are readable for 1 day after a run
  finishes on Hobby and kept for up to 66 days.
- [Inngest pricing](https://www.inngest.com/pricing): free plan with 50,000
  executions a month, five concurrent steps, 24-hour trace history, no credit
  card.
- Global Plan, "Decisions" (0005) and "Architecture" (Long work).

A new decision replaces this one if drafts move to a server (accounts, phase
4), or if a run has to finish while the owner's page is closed.
