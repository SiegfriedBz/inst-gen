---
title: "Marketing skill libraries"
description: "Marketing skill libraries are read when a prompt is written: the rules that fit go into the app's prompts and code's checks, in the app's own words and citing their file, and their checklists judge the recordings; their files are never sent to the model."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-07T12:00:41Z }
date: "2026-11-07"
---

# Marketing skill libraries

## Context and Problem Statement

The maintainer wants the app's captions and story texts to use general and
Instagram marketing skills (2026-11-07). They found two libraries of skills
written for AI agents, plain Markdown under the MIT license:

- `sergebulaev/instagram-skills` (IG): nine skills for captions, hooks,
  hashtags, carousels, profiles, AI-sounding text, trend scraping (Apify)
  and publishing (Publora), with Python helpers;
- `coreyhaines31/marketingskills` (CH): 53 skills, mostly for software
  companies, among them copywriting, copy editing, social, ad creative,
  offers, marketing psychology and WhatsApp.

The summary they found suggests two ways to put such a library in a Next.js
app: read its `SKILL.md` and `references/` files on the server and send them
as the system prompt, or upload them to Anthropic's Skills API and call
Claude. Both libraries can also be installed in Claude Code, as plugins, for
the developer.

How does the app use marketing skill libraries?

## Decision Drivers

- $0, on Gemini's free tier (decision 0003); the posts are written by
  `gemini-3.5-flash-lite`, within a function step of about 30 seconds.
- A small model follows a short prompt best. The plan prompt is about 7.5 KB
  (`posts-11`); the Markdown files read for this come to about 110 KB in IG
  and 370 KB in CH.
- The app's own rules must win: banned words, facts only from the profile,
  the offer line, the day or night light, flowers for spas, and no example
  for the model to copy (2.14b).
- Most of both libraries is written for someone else: creators with a
  personal voice (contrarian takes, confessions), software companies
  (sign-ups, paywalls, churn), Reels and carousels.
- Third-party text can carry instructions: IG's main file asks the reader to
  add a line asking for a GitHub star once a draft is approved, and links
  its publishing partner.
- Every change to the copy traces to a prompt version, a recording and an
  eval (2.2).

## Considered Options

1. Read the libraries when a prompt is written; put the rules that fit into
   the prompts and code's checks, in the app's own words, each citing its
   library, commit and file; judge the recordings with their checklists.
2. Send the libraries' files to the model with every plan, as its system
   prompt.
3. Anthropic's Skills API, with a Claude model.
4. Install the libraries in Claude Code, so the developer calls them while
   writing prompts.

## Decision Outcome

Chosen option: 1, because it brings the libraries' rules to every post at no
cost, keeps the prompt short enough for Flash-Lite, and leaves out what
doesn't fit a small local business. Their checklists become the eval's
rubric, so their ideas are also how the result is judged.

`docs/specs/posts/marketing-copy` is the first use: its rules name the file
each comes from.

### Consequences

- Good, because the prompt stays short and in one voice, and what it asks
  can be checked by code and replayed.
- Good, because nothing from a third party reaches the model: no template it
  could copy, no instruction it could follow.
- Good, because a rule that doesn't fit (a call to action in every caption, a
  contrarian hook) is left out, with the reason in the spec.
- Bad, because the libraries' updates don't reach the app on their own: a
  later version is read again, by hand, for a later item.
- Bad, because the rules are the developer's reading of the libraries: the
  journal's checklist scores are how a wrong reading shows.

### Confirmation

- No file from a skill library is in the repo's prompts, or read by the app
  at run time.
- Each borrowed rule in a spec names its library, its commit and its file.
- A prompt change that borrows from a library keeps its version and its
  recordings, as every prompt change does (2.2).

## Pros and Cons of the Options

- **Rules in the app's words:** short, fitted to the app, checkable. Needs
  the developer's judgment, and a new read when a library changes.
- **Files as the system prompt:** the whole library, with no reading. Even
  IG's caption files alone are many times the prompt's size, in a voice made
  for creators and software companies; its templates would be copied, its instructions followed, and
  its rules would compete with the app's.
- **Anthropic's Skills API:** loads only the skill a call needs. Needs a
  Claude model with a paid key, against decision 0003's $0 and free tier.
- **Installed in Claude Code:** the developer can call a skill by name. It
  changes nothing the app writes, and brings the libraries' publishing and
  scraping workflows, which the app doesn't use, into the agent. Reading the
  pinned files gives the same rules, with nothing installed.

## More Information

- IG read at commit `550d3cf` (2026-10-27); CH at `96798cf` (2026-11-06).
  Both MIT: rules restated in the app's words carry no notice; copied text
  would keep the library's copyright notice.
- The libraries' claims about Instagram's ranking (sends, saves, reach,
  posting times) cite no sources; the app doesn't rely on them.
