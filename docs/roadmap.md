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
  free and non-commercial (decision 0001). Text from Gemini's free tier,
  never a card on file; images from a paid Gemini model (decision 0004).
- Portrait posts (1080×1350) with a story crop (1080×1920). Captions in
  English, each ending with a WhatsApp call to action.
- App screens and the owner guide in English, Indonesian and Vietnamese. Every
  caption and reply can be read in the owner's language.
- Owners download and post themselves: no direct publishing.
- A usage bar on every screen shows what's left today and when it resets, in
  the owner's time zone. Brand-panel edits re-run captions only; images change
  only when the owner taps regenerate.
- Images come from Nano Banana 2.1 at 9:16, in a prepaid Google project of
  their own, capped at $8 a month (decision 0004, 2026-10-25): the free
  Workers AI models drew people badly.

## Phase 0: Foundations

Gate: CI green, and a page live on the production URL.

| # | Item | Kind | Status |
|---|---|---|---|
| 0.1 | App stack and hosting | decision 0001 | done |
| 0.2 | App tooling: lint, format, tests, i18n library | decision 0002 | done |
| 0.3 | Text model and region rule | decision 0003 | done |
| 0.4 | Long-running work (streaming a ~1 minute run) | decision 0005 | done |
| 0.5 | `harness/app-scaffold`: Next.js app, tooling in hooks and CI, deployed to Vercel behind the pilot passphrase; styling in decision 0007 | spec | done |
| 0.6 | `platform/i18n`: screens in English, Indonesian, Vietnamese | spec | done |

## Phase 1: Brand from a website

Gate: the right brand profile on 16 of the 20 saved site fixtures.

| # | Item | Kind | Status |
|---|---|---|---|
| 1.1 | `brand/extract-site`: site reader, brand profile, fixtures and first eval set | spec | done |
| 1.2 | `brand/brand-panel`: editable panel, stored on the phone, re-read and forget | spec | done |
| 1.3 | `brand/search-essence`: enrich the brand essence with what people search for; a check that a free search tool is allowed comes first | spec | done |

## Phase 2: Posts and review replies (the MVP)

Gate: Sen and Svarga would each post at least 4 of their 6 drafts and send
most sample replies as written, with $0 spent on everything but images
(at most $8 a month, decision 0004).

| # | Item | Kind | Status |
|---|---|---|---|
| 2.1 | Image model: portrait-capable, after a bake-off on the eval set; paid, at most $8 a month | decision 0004 | done |
| 2.2 | `posts/generate-copy`: post plan, captions, hashtags, alt text | spec | done |
| 2.3 | `posts/generate-images`: tall images, post and story crops | spec | done |
| 2.4 | `posts/editor-download`: feed preview, edits, owner's-language view, saving to the phone | spec | done |
| 2.5 | `platform/home-tabs`: two tabs on the home screen, captions that follow business edits, the language switch at the top right | spec | done |
| 2.6 | `posts/suggestions`: today's attempts of six suggestions, saved in two steps, cleared at 3am; a faster language switch | spec | done |
| 2.7 | `reviews/reply-drafts`: warm and short replies, owner's-language view | spec | done |
| 2.8 | `platform/usage-counters`: per-owner daily limits in Upstash Redis, the usage bar | spec | done |
| 2.8b | `platform/one-daily-reset`: suggestions and review drafts clear at Google's reset, the same moment the limits come back; one time on screen | spec | in progress |
| 2.9 | `guide/owner-guide`: How-to page and printable PDF, three languages | spec | todo |

## Later phases

Each waits for the gate before it. Specs get written when the phase starts.

| Phase | What | Gate |
|---|---|---|
| 3 · Instagram enrichment | Meta access spike (decision 0006), then `brand/instagram-enrich` | Decision 0006 approved |
| 4 · Public launch | `platform/quotas-abuse` (bot check, region block with a developer pass, blocklist), privacy page, owner's own Gemini key, accounts | One soft-launch week at $0, no abuse |
| 5 · Paid tier (optional) | Better images, more posts, carousels | Owners ask to post from the app |
| 6 · Publishing (optional) | Meta App Review, scheduling, direct posting | — |
| Google Maps connection (optional) | Fetch new reviews and post replies through the Business Profile API, instead of copy and paste (`reviews/reply-drafts`, "Out of scope") | Owners ask for it after the pilot |
