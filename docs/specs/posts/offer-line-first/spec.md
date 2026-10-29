---
title: "Offer line first"
description: "An offer post's caption always opens on its offer line, which code writes from the offer and the post's treatment: the prompt says it in one place, and code puts the line first, and makes it the story text, whenever the model gets it wrong."
status: draft
date: "2026-10-29"
---

# Offer line first

## Goal

With a special offer (2.11), the two offer posts must open on the offer:
"10% off our 90-minute Thai Massage, until Sunday 1 November." That line is
also their story text. 2.13 made it the hook of those posts ("On an offer
post, the first line stays 2.11's offer line, which is its hook"), but the
prompt never says so where it asks for a hook. Its caption rules ask every
caption to open on "a question or a promise […] such as "Long flight?"",
and the offer line's rule sits in another paragraph further down.
Flash-Lite follows the hook rule. On Svarga's offer plan, 3 of 4 recordings
on 28 Oct went wrong (`docs/specs/posts/day-and-night-images/journal.md`):
once both offer captions left the offer out, twice they opened "Long
flight? 🌸 10% off our …". The owner would get offer posts that bury the
offer, or have none, and story texts that don't match. The replay test
refuses these recordings, so Svarga's offer fixture is still `posts-6`.

The maintainer chose (2026-10-29) that **code makes sure**. The prompt states
one order. Code already knows each offer post's exact line: the offer gives
the percentage or the free treatment and the last day, and the post's
set-up gives its treatment. So whenever the model gets the line wrong, code
writes it, puts it first, and makes it the story text.

Success: every offer post the owner gets opens on its exact offer line, and
its story text is that line. On Sen's and Svarga's recordings, the replay
test passes on the first try.

## Behaviour

### The offer line

Code writes each offer post's line, in 2.11's words, from the batch's offer
and the post's treatment:

- a discount: "10% off our 90-minute Thai Massage, until Sunday 1 November."
- a free extra: "Free Foot Massage with a 90-minute Thai Massage, until
  Sunday 1 November."

The percentage, the free treatment and the last day come from the offer as
given, and "90-minute" from `OFFER_LIMITS.minutes`. The post's treatment is
its set-up's treatment when that is one of the offer's treatments (set-ups 1
and 2 always are, 2.12). Otherwise it is the first of the offer's treatments
that the caption names (case ignored). When neither gives one, code can't
write the line: the post is left as the model wrote it, 2.11's checks flag
it as today, and a `dropped` entry records `post-n: no treatment for the
offer line`.

### What the model gets

The plan prompt becomes `posts-9`. Without an offer, the plan and rewrite
prompts stay word for word as `posts-8`.

With an offer:

- The caption rules say the order in the same place as the hook: on an offer
  post, **the offer line is the hook**. The caption starts with it, word for
  word, and nothing comes before it. A question or a promise may follow it
  ("10% off our 90-minute Thai Massage, until Sunday 1 November. 🌸 Long
  flight?").
- The plan's "### Special offer" block gives the two lines in full, one per
  offer post, from set-ups 1 and 2: "Post 1's offer line: 10% off our
  90-minute Traditional Balinese Massage, until Sunday 1 November." The
  model no longer fills in a template.
- Each offer post's story text is its offer line, followed by one flower for
  a spa, as 2.13 says.
- The rewrite prompt says the same of a post marked `offer: true`: its
  caption still starts with its offer line, word for word, and its story
  text is that line. The rewrite's "### Special offer" block gives each such
  post's line in full, by its id ("post-1's offer line: …"), from the post's
  set-up as above (developer's call: a batch made before `posts-9` may hold
  an offer caption that doesn't open on the line, so the model needs the
  line to copy).

The rest of 2.11's rules stay: the offer as given, never a bigger discount,
never a price, never "today only", and the other four posts never mention
it.

### Code's checks

On each post that carries the offer, in the plan (as each post streams in)
and in every rewrite, before the spa's emoji fixes and the flags:

1. **The caption.** If it already starts with the offer line, it is kept.
   Otherwise code removes every sentence that states the offer and puts the
   line first, followed for a spa by 🌸, then a space and the rest of the
   caption:
   - "Long flight? 🌸 10% off our 90-minute Thai Massage, until Sunday 1
     November. Feel…" becomes "10% off our 90-minute Thai Massage, until
     Sunday 1 November. 🌸 Long flight? Feel…"
   - A caption with no offer at all gets the line added in front.

   A sentence states the offer when it names the last day (2.11's
   `mentionsDay`), holds the offer's percentage (a discount), or holds
   "free" with the free treatment's name (a free extra). Sentences end as
   2.13's story-text rule says: at ".", "!" or "?" before a space or the
   end; what follows, an emoji included, starts the next sentence.
2. **The story text.** It is kept when it is exactly the offer line,
   followed for a spa by any one of the five flowers (developer's call: the
   flower need not match the caption's). Otherwise it becomes the offer
   line, followed for a spa by one flower: the flower that follows the line
   in the caption if there is one, else 🌸. This comes after 2.13's story
   cleanup, and the offer line is never cut (developer's call). Cutting it
   would lose "until <last day>". With Sen's and Svarga's treatments the
   longest line, a free extra, is 116 characters with its flower, under
   2.13's 120. A longer one, from another business's long names, stays whole
   and goes over 120.

Each change is recorded in the batch's `dropped` list, field `offer`, never
shown to the owner:

- `post-1: offer line put first` (an offer sentence was removed or
  replaced),
- `post-1: offer line added` (the caption had none),
- `post-1: story text set to the offer line`.

The server's one log line per plan or rewrite gains `offer_fixes=`, the
count of those entries. It holds numbers only, as 2.13's counts do.
`pnpm eval:posts` prints them with the other `dropped` lines.

2.11's flags still run, on the fixed caption. A caption that went through
this fix no longer misses the last day.

### What doesn't change

The other four posts, posts without an offer, the badge, the images, the
owner's screens, strings and the owner guide all stay as they are.

### Tests and evaluation

- Unit tests (Vitest) for:
  - the offer line, discount and free extra;
  - the treatment, from the set-up, from the caption, and none;
  - a caption that is right, kept as is;
  - a hook before the offer line;
  - an offer line in other words;
  - a caption without the offer;
  - a non-spa caption (no flower added);
  - the story text replaced, kept when it is already right (with another
    flower than the caption's too), and never cut;
  - the `dropped` records and `offer_fixes=`;
  - a rewrite that loses its offer line;
  - the prompts with and without an offer (`posts-9`, the order stated
    once, the lines given in the plan's and the rewrite's text, no-offer
    prompts unchanged).
- The replay test checks more than today: each offer post's caption starts
  with its exact offer line, and its story text is that line and a flower.
- `pnpm eval:posts svarga --offer --record`, then
  `pnpm eval:posts sen --offer --record`: 2 Flash-Lite requests from the
  app's daily pool. Svarga's is run once more to see two in a row (1 more
  request). The developer asks the maintainer first, never on a pilot day.
  The journal records how many `offer` fixes code made in each plan; the
  aim is none, but the replay passes either way.
- `posts.json` for every slug stays on `posts-8`: its prompt is unchanged
  (developer's call).

## Acceptance criteria

```gherkin
Scenario: The model puts a hook before the offer
  Given a special offer of 10% off the 90-minute Thai Massage until Sunday 1 November
  And Sen's plan, whose post 1 has the Thai Massage set-up
  When the model writes post 1's caption "Long flight? 🌸 10% off our 90-minute Thai Massage, until Sunday 1 November. Feel light again."
  Then post 1's caption is "10% off our 90-minute Thai Massage, until Sunday 1 November. 🌸 Long flight? Feel light again."
  And its story text is "10% off our 90-minute Thai Massage, until Sunday 1 November. 🌸"
  And the batch's dropped list holds "post-1: offer line put first"

Scenario: The model leaves the offer out
  Given the same offer
  When the model writes post 2's caption without the offer
  Then post 2's caption opens on its offer line
  And the batch's dropped list holds "post-2: offer line added"
  And the caption has no "offer" flag for the last day

Scenario: The model gets it right
  Given the same offer
  When post 1's caption starts with its offer line and its story text is that line and 🌺
  Then the caption and the story text are kept as they are
  And the batch's dropped list has no "offer" entry for post 1

Scenario: A rewrite keeps the offer line first
  Given a batch with the offer, whose post 1 carries it
  When the owner edits the business and the rewrite opens post 1 on a hook
  Then post 1's rewritten caption opens on its offer line
  And its story text is that line and a flower

Scenario: The other posts don't change
  Given the same offer
  When the plan's post 3, a moment post, opens on "Long flight?"
  Then post 3 is kept as the model wrote it

Scenario: Svarga's offer plan
  Given Svarga's offer plan recorded with posts-9
  When the replay test runs it
  Then it passes on the first recording
  And each offer post's caption starts with its offer line, and its story text is that line and a flower
```

## Known limits

- The model's own sentences around the offer are kept. A caption may still
  say "this week only" or a wrong percentage elsewhere; 2.11's flags catch
  a wrong percentage, as today.
- A treatment name that already holds a duration ("Balinese Massage 60
  min") reads oddly after "90-minute". Neither pilot spa has one.
- An offer post's story text may run over 120 characters when its treatment
  names are long (above); neither pilot spa's are.
- Removing every sentence that names the last day may drop a sentence that
  said more than the offer. The owner reads each post before posting it.

## Out of scope

- The first line's length on the other posts (2.13's 125-character warning
  still fires on most captions); it is its own fix.
- A different wording of the offer line, or offers in other languages:
  captions stay in English, as 2.11 says.
