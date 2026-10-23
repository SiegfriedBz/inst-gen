# Roadmap

The ordered list of what to build next. Each item is one decision or one spec,
built on its own branch and merged by its own PR to `develop`. The reasoning
behind every item is in the Global Plan:
<https://claude.ai/artifact/ReKNqpcM4hb94LxWroSEoX>.

**Next item:** the first one whose status is not `done`, unless it waits on an
earlier item. Update its status in the same PR that ships it.

Statuses: `todo`, `in progress` (spec or decision written), `done` (merged).

## What we're building

inst-gen turns a business's website link into ready-to-post Instagram posts,
each with a matching story, and drafts replies to its Google Maps reviews. It
is free for owners and runs at $0, on free tiers that stop rather than bill.
The MVP pilots with two new massage spas, behind a private passphrase link:
Sen (Da Nang, sendanangmassage.com) and Svarga (Bali, svargabalimassage.com).

Settled on 2026-10-23:

- No database in the MVP. Brand, drafts and images live in the owner's
  browser; the server keeps only usage counters (Upstash Redis).
- Hosting on Vercel Hobby, functions in Singapore; allowed because the MVP is
  free and non-commercial (decision 0001). Images from Workers AI, text from
  Gemini (free tiers, never a card on file).
- Portrait posts (1080×1350) with a story crop (1080×1920). Captions in
  English, each ending with a WhatsApp call to action.
- App screens and the owner guide in English, Indonesian and Vietnamese. Every
  caption and reply can be read in the owner's language.
- Owners download and post themselves: no direct publishing.
- A usage bar on every screen shows what's left today and when it resets, in
  the owner's time zone. Brand-panel edits re-run captions only; images change
  only when the owner taps regenerate.
- Images come from a free model that makes portrait images natively (decision
  0004). Gemini's image models have no free API tier.

## Phase 0: Foundations

Gate: CI green, and a page live on the production URL.

| # | Item | Kind | Status |
|---|---|---|---|
| 0.1 | App stack and hosting | decision 0001 | done |
| 0.2 | App tooling: lint, format, tests, i18n library | decision 0002 | todo |
| 0.3 | Text model and region rule | decision 0003 | todo |
| 0.4 | Long-running work (streaming a ~1 minute run) | decision 0005 | todo |
| 0.5 | `harness/app-scaffold`: Next.js app, tooling in hooks and CI, deployed to Vercel behind the pilot passphrase | spec | todo |
| 0.6 | `platform/i18n`: screens in English, Indonesian, Vietnamese | spec | todo |

## Phase 1: Brand from a website

Gate: the right brand profile on 16 of the 20 saved site fixtures.

| # | Item | Kind | Status |
|---|---|---|---|
| 1.1 | `brand/extract-site`: site reader, brand profile, fixtures and first eval set | spec | todo |
| 1.2 | `brand/brand-panel`: editable panel, stored on the phone, re-read and forget | spec | todo |

## Phase 2: Posts and review replies (the MVP)

Gate: Sen and Svarga would each post at least 4 of their 6 drafts and send
most sample replies as written, with $0 spent.

| # | Item | Kind | Status |
|---|---|---|---|
| 2.1 | Image model: free, portrait-capable, after a bake-off on the eval set | decision 0004 | todo |
| 2.2 | `posts/generate-copy`: post plan, captions, hashtags, alt text | spec | todo |
| 2.3 | `posts/generate-images`: tall images, post and story crops | spec | todo |
| 2.4 | `posts/editor-download`: feed preview, edits, owner's-language view, ZIP | spec | todo |
| 2.5 | `reviews/reply-drafts`: warm and short replies, owner's-language view | spec | todo |
| 2.6 | `platform/usage-counters`: per-owner daily limits in Upstash Redis, the usage bar | spec | todo |
| 2.7 | `guide/owner-guide`: How-to page and printable PDF, three languages | spec | todo |

## Later phases

Each waits for the gate before it. Specs get written when the phase starts.

| Phase | What | Gate |
|---|---|---|
| 3 · Instagram enrichment | Meta access spike (decision 0006), then `brand/instagram-enrich` | Decision 0006 approved |
| 4 · Public launch | `platform/quotas-abuse` (bot check, region block with a developer pass, blocklist), privacy page, owner's own Gemini key, accounts | One soft-launch week at $0, no abuse |
| 5 · Paid tier (optional) | Better images, more posts, carousels | Owners ask to post from the app |
| 6 · Publishing (optional) | Meta App Review, scheduling, direct posting | — |
