---
title: "Better replies and answers"
description: "Review replies and answers to guests' questions follow the posts' rules on words (no stop before an emoji, no em dash, no clichés); a business that goes to its guests never invites them to come to it, and a reply offers to come to them again; the model gets the treatment names and never takes a guest's words for one; a friendly reply or answer gets 😊 and the flower, and code keeps no other emoji but 🙏; every answer that isn't final ends on a gentle offer, the final one still asking for what's missing to book; an answer gives the website only when the guest asks for photos or more details."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-20T09:01:32Z }
date: "2026-11-20"
---

# Better replies and answers

## Goal

Svarga's owner pasted a one-line review in the "Reviews" tab: "Amazing
massage thank you very much". The warmer reply read:

> Thank you so much! 🙏 It is wonderful to hear that you loved the amazing
> massage. We would be thrilled to have you back with us at Svarga Bali
> Massage for another relaxing session. 🌼

The maintainer, 2026-11-20, in their words:

1. "The same 'instagram copy generation' rules should apply for these 2
   features: no point before an emoji...."
2. "is it possible to make the LLM less stupid !? like on the screen he just
   takes 'amazing massage' as it were a massage we list in the msssage menu,
   but we are not."
3. "the client should never be invited to 'come back to us' because these 2
   businesses, svarga and sen, are MOBILE, in-room massages"
4. "use like nice emojis like 😊 and a flower one when the answer is
   positive"
5. "The goal of all these massages is either to thank for having taken a
   massage OR to convert someone asking a question to book a massage, in a
   way as subtile and nice as possible - these are MASSAGE business, welness
   business, relaxing business"

They agreed to the list of changes this spec writes out, in chat ("Nothing,
write it up"). Then they asked:

6. "Also, in the Questions tab (not the Reviews tab), when people ask about
   what kind of massages we offer, does it make sense to suggets them to visit
   the website ?"

Told that the answer already lists the massages with their prices in the
chat, where guests book, that a link sends them away, and that a link helps
when a guest asks for photos or more details, they answered "Yes, add that".

Why the reply came out so (read in the code, 2026-11-20):

- The reply prompt `reply-2` says: "Invite them to come back to {business},
  warmly and briefly: the guest visits the business, never the reverse."
  `reviews/reply-drafts` added it on 2026-10-25, after a Russian test reply
  said "we will gladly come to you again" and was read as the visit's
  direction reversed. For Sen and Svarga, that reply was the right one.
- The prompt asks each reply to name "one thing they liked", and the request
  carries only the business's name and summary, not its treatments. "Amazing
  massage" was the one thing to name, and nothing told the model it isn't a
  treatment's name.
- Code's fix to posts for a stop before an emoji (`posts/day-and-night-copy`)
  and the posts' rules on words (`posts/short-captions`) never run on replies
  or answers.
- The made-up reviews the tests replay describe a visit to a spa: a calm
  place, clean facilities, motorbike parking, a cold room. Sen and Svarga have
  no place to visit.

Success: on the made-up reviews and questions ("Prompt and eval"), with Sen's
and Svarga's details, no reply or answer invites the guest to come to the
business or speaks of its place, none takes the guest's words for a
treatment's name, and none holds a "." right before an emoji. Every reply to
a review with no complaint, and every answer to a question that doesn't
mention sex, has 😊 and ends on the flower. Every answer ends on a gentle
offer, or on its call to book when it is the final one. The maintainer would
send most of them as written.

## Behaviour

Nothing changes on screen: no new button, field or string. What changes is
what the model is asked, what the requests carry, and code's checks.

### Both tabs

#### A business that goes to its guests

Code decides it, not the model: a business **goes to its guests** when its
profile has a service area. The brand read writes one only "for businesses
that come to the client" (`lib/brand/prompt.ts`), and Sen's and Svarga's
reads have one. Each prompt states it as a fact.

For a business that goes to its guests, a reply or an answer:

- never invites the guest to come, come back, return or visit, and never
  says the business hopes to welcome or see them again at its place, in any
  language;
- never speaks of a place of the business as where the guest was: its rooms,
  building, facilities, atmosphere or parking;
- says, where it fits, that the business comes to the guest: in a reply, that
  it would be glad to come to them again; in an answer, that a therapist comes
  to their hotel, villa or home, as the details write it.

A business with no service area keeps today's rule: a reply invites the
guest back to it.

#### The treatments, by their names

- Both prompts list the business's treatments. The reply request gets their
  names only (below); the answer request already has them with their
  durations and prices.
- A reply or an answer names a treatment only when the guest named one of
  the business's, as its details write it. Otherwise it says "your massage",
  or the like, in its own plain words.
- It never takes the guest's words for a treatment's name ("the amazing
  massage", "your special massage"), and never adds a detail that the guest
  didn't give and the details don't hold.

#### The posts' rules on words

The posts' rules that fit any text a guest reads, in both prompts, in the
app's own words:

- warm, calm and kind, the voice of a good host for a massage and wellness
  business; never pushy, never salesy;
- plain, concrete words, as the owner would write them; never a word that
  only adds intensity, such as completely, deeply, truly, ultimate or pure
  (`posts/short-captions`);
- never "Imagine…", a "not this, it's that" contrast, an em dash (—), three
  adjectives in a row, or these words: unwind, indulge, pamper, oasis,
  escape, melt away, soothe (`posts/short-captions`);
- never the posts' banned words, nor anything that suggests more than a
  professional treatment (`posts/generate-copy`): answers have the rule
  today, replies get it;
- no fact about the business that its details don't give: no years open,
  rating, award, discount or free extra;
- no sentence for the model to copy, in either prompt
  (`posts/day-and-night-copy`): each rule is described. The one exception is
  where the `{name}` placeholder and its honorific go ("chị {name}",
  "{name}님"), as today.

The posts' rules on hooks, paragraphs, the light, places, hashtags and story
texts stay with posts.

Code makes sure of, in each reply, answer and translation, as it does on
posts:

- **No stop before an emoji** (`posts/day-and-night-copy`): a "." right
  before an emoji goes, spaces or a line break between them allowed; "?", "!"
  and "..." stay. "…for another session. 🌼" becomes "…for another session
  🌼"; "Thank you so much! 🙏" stays.
- **Banned words**: a sentence that holds one goes whole, as in answers
  today; replies get it.

The evals print code's records for the developer to read back, as
`pnpm eval:posts` does (`lib/posts/variety.ts`): the clichés and em dashes a
reply or answer holds and, for a business that goes to its guests, the
English phrases that invite the guest to it ("come back", "visit us",
"welcome you back", "have you back", "see you again at"; developer's call on
the full list). Records change nothing. Other languages are read back.

#### Emojis

Three emoji only: 🙏 (replies), 😊, and the business's flower, chosen by
code from its country as today (Vietnam 🪷, Indonesia 🌼, anywhere else 🌸).

**A reply** to a review:

- with no complaint: 🙏 right after the thank-you sentence, one 😊 at the end
  of a sentence in the middle of the reply (the one on what they liked), in
  place of its stop, and the flower at the very end: one of each;
- with a complaint, even a small one: 🙏 and the flower, no 😊;
- abusive or fake: none, as today.

**An answer** to a question:

- one 😊 at the end of a sentence, in place of its stop (the greeting, or a
  sentence of the answer), and the flower at the very end: two at most;
- to a question that mentions sex: none, as today.

The model now says whether the review complains: a new field, **`complaint`**,
true when it complains about anything, even a small thing. Code then makes
sure of, in each reply, answer and translation:

- any flower becomes the business's (today's rule);
- any other emoji goes: replies keep 🙏, 😊 and the flower; answers keep 😊
  and the flower (as posts keep only flowers, `posts/story-text`);
- one of each at most: a second 🙏, 😊 or flower goes;
- no 😊 in the replies to a review that complains;
- no emoji at all on an abusive review or a question that mentions sex
  (today's rule);
- the flower at the very end of a text that may hold emoji and has none, as
  posts add it (`addFlower`).

An emoji code removes leaves its words tidy, as on posts (`stripEmojis`).
When it stood in place of a stop (a word right before it and another
sentence after it), a "." takes its place: "Sorry the therapist came late 😊
We hope…" becomes "Sorry the therapist came late. We hope…".

#### The guest's letters

Amended 2026-11-20, after the fourth recordings. A Korean question got its
answer in English in the second and the fourth recordings, and in Korean in
the third; a Russian review got its replies in Indonesian in the first. The
prompt alone doesn't hold it.
Approved by the maintainer, 2026-11-20T10:29:45Z.

- Code sees the letters a guest writes with. When most of the letters of a
  review or a question belong to one script other than the Latin alphabet
  (Korean, Cyrillic, Chinese, Japanese, Thai, Arabic, Hebrew, Greek,
  Devanagari), that script is the guest's.
- The answer request tells the model so: every part of the answer is written
  in those letters. The reply prompt stays as it is: its recordings already
  hold the right letters, and code's refusal below covers it.
- Code refuses a reply or an answer that holds none of those letters, as it
  refuses an empty one: the route answers `model_failed`, and the tab shows
  "Something went wrong while writing your answer. Try again." (or "your
  replies"). One more tap writes it again. The translations, in the owner's
  language, aren't checked.
- The replay tests keep their check on the Korean and the Russian fixtures.

### The Reviews tab

#### The replies

Changed from `reviews/reply-drafts` ("The replies"); the rest stays:

- **The thanks.** Each reply thanks the guest for their massage, and names
  what they liked only in their own terms ("The treatments, by their
  names").
- **The invitation**, warm and brief, ends each reply: for a business that
  goes to its guests, that it would be glad to come to them again, on their
  next stay or whenever they'd like another massage; for any other, to come
  back (today's rule).
- **Shape**: 3 or 4 short sentences, where today's prompt asks 2 to 4: the
  thanks; what they liked, the sorry for any complaint, or both; the
  invitation. That keeps a sentence in the middle for 😊. A review of a few
  words gets three short sentences in each reply: the thanks, that the
  business is glad they enjoyed their massage, the invitation; the warmer one
  says it more warmly.
- **Words and emojis**: as both tabs above.

#### What the request carries

The reply request adds:

- **`offerings`**: the names of the business's treatments, the first 20, each
  cut at 200 characters, as the answer request cuts them;
- **`goesToGuests`**: whether the profile has a service area.

The guest's name still never goes; nor do the treatments' prices and
descriptions, which a reply never gives. A page loaded before the change may
send a request without the two: the route reads it as no treatments and a
business that doesn't go to its guests (builder's call: a stale page gets
today's replies until it reloads, rather than an error).

#### The model's answer

It adds **`complaint`** (above). The route's log line adds `complaint=`.

### The Questions tab

#### The gentle offer

Changed from `questions/answer-drafts` ("Any other answer ends once it has
answered"):

- An answer that isn't final ends on a **gentle offer**: one short sentence
  that makes booking feel easy and welcome, from the details; for a business
  that goes to its guests, that a therapist can come to the guest's hotel,
  villa or home. One next step, easy to take (IG `references/voice-rules.md`:
  no hard sell, one next step; CH `marketing-psychology/SKILL.md`: make the
  first step easy).
- It never presses: no "book now", no deadline, no urgency or scarcity, no
  discount (CH `marketing-psychology/SKILL.md`: urgency only when it is
  real). It asks for no booking detail (the day, the time, where they're
  staying: the final answer does that), and names no day or time, since the
  details don't say what is free.
- It may be a statement or a short question the guest can answer yes to;
  never a question with no next step, such as "Any questions?" (IG
  `references/voice-rules.md`).
- The model writes it in the call-to-action field, on every call: the call to
  book when the answer is final, the gentle offer when it isn't. Code puts it
  last. On an answer that isn't final, an empty one leaves the answer without
  it and fails nothing; on a final answer, an empty one fails as
  `model_failed`, as today.
- An answer to a question that mentions sex gets no gentle offer: it stays
  calm and short. A final one still ends on its call to book a professional
  massage, as today.
- "Make it the final answer" and its hint, "It ends by asking the guest to
  book.", stay as they are: the final answer still asks only for what's
  missing to book.

The libraries were read for this rule at the commits `posts/marketing-copy`
pinned (decision 0009): IG `sergebulaev/instagram-skills` at `550d3cf`, CH
`coreyhaines31/marketingskills` at `96798cf`. Neither has a skill for chat
replies or review replies. CH `sms/references/whatsapp.md` adds only what
the app already does: short messages, one or two emoji.

#### The website, only when asked

- The answer request adds **`website`**: the address the business's details
  were read from (the profile's site address).
- An answer never sends the guest to the website, except when they ask to see
  photos, or want more about a treatment than its description in the details
  says. Then one short sentence, before the gentle offer or the call to book,
  says they'll find it on the website. Asked only which massages there are,
  the answer lists them with their prices, as today, and gives no link.
- The model writes `{website}`, exactly so, where the address goes, never an
  address of its own. Code puts the address there, in the answer and its
  translation, without its trailing "/" ("https://svargabalimassage.com"):
  never a page that doesn't exist. A request without `website` (a page
  loaded before the change) gets no such rule, and code removes a sentence
  that holds `{website}` then.

#### The answer

Changed from `questions/answer-drafts` ("The answer"):

- **Where it goes** is code's fact ("A business that goes to its guests"),
  from the service area the request already carries. The final answer's call
  to book asks where the guest is staying only for such a business, as
  today.
- **Treatments**, words and emojis: as both tabs above. The answer's two
  emoji at most are now 😊 and the flower.

#### Only the areas the website lists

Amended 2026-11-20, after the second recordings. An answer told a guest
staying in Uluwatu "A therapist can come to you in Uluwatu when you are
ready 🌼". The maintainer: "No, it should match the deserved areas. And this
maybe can not be inferred by the AI ?" It can't: the model knows only the
areas the website lists, and Svarga's "for villas further out we confirm any
small travel fee on WhatsApp" doesn't say where "further out" stops.
Approved by the maintainer, 2026-11-20T10:21:00Z.

- An answer says a therapist comes to a place only when the service area
  names it, or one of the neighbourhoods it lists: for Svarga, Canggu,
  Pererenan, Seminyak, Kerobokan and theirs; for Sen, My Khe, Son Tra, Hai
  Chau, Non Nuoc and theirs.
- For any other place, such as Uluwatu or a hotel named without its area, no
  part of the answer says a therapist comes there, promises the travel
  terms, or names it in the gentle offer. The answer says the team will check
  whether they can come there and reply, and the model sets "unanswered", so
  the tab shows its note: "Your business details don't answer all of this
  question. Check the answer before you send it." The gentle offer may name
  the areas the business covers instead.
- The replay test checks `svarga-uluwatu-en`: "unanswered", and no sentence
  that comes or travels to Uluwatu.

### Prompt versions

`reply-3` and `answer-2`.

### Prompt and eval

- **Reviews** (`tests/fixtures/reviews/`): each made-up review is rewritten
  to read like a massage at the guest's hotel, villa or apartment, keeping its
  business, language, screen language and name: no place, facilities,
  parking or spa building. Each complaint becomes one a mobile massage can
  get, such as a therapist 20 minutes late or an oil that smelled too strong
  (developer's call on the words). Two are added, made up:
  - `svarga-short-en`: praise in a few words, like the maintainer's example,
    with no name, on an English screen;
  - `sen-menu-en`: praise that names one of Sen's treatments, with an
    adjective of the guest's own.
- **Questions** (`tests/fixtures/questions/`): the eight stay, and two are
  added, both not final:
  - `sen-relaxing-en`: a guest asks what "a relaxing massage" costs at their
    hotel tonight. The answer gives Sen's treatments by their own names, and
    its gentle offer names no time;
  - `svarga-photos-en`: a guest asks to see photos of the four-hands massage
    before booking. The answer gives `{website}` once, and code puts
    Svarga's address there.
- `pnpm eval:replies --record` and `pnpm eval:answers --record`: 9 and 10
  Flash-Lite requests from the app's daily pool. The developer asks the
  maintainer first, never on a pilot day. The journal records, as the owner
  sees them, the new replies to `svarga-short-en` and `sen-complaint-en` and
  two new answers. Their "before" is the reply quoted under "Goal" and the
  `reply-2` and `answer-1` recordings as they stand, with no new request.
- A recording that fails a replay check below isn't kept. The developer
  changes the prompt, bumps its version and records that tab's fixtures
  again, each round with the maintainer's yes. The item doesn't ship while a
  check fails: the maintainer's "never" holds.
- The replay tests check every recording: no "." right before an emoji; only
  the allowed emoji, one of each at most, the flower last; no 😊 in the replies
  to a review that complains, and no emoji on an abusive review or a question
  that mentions sex; for Sen and Svarga, none of the English phrases that
  invite the guest to the business.

### Tests

- Vitest:
  - the reply prompt: the fact that the business goes to its guests and its
    invitation, or today's invitation for a business that doesn't; the
    treatment names; the `complaint` field; the emoji and word rules; no
    sentence to copy;
  - the reply request: `offerings` and `goesToGuests` from the profile; a
    body without them read as none and false; never the guest's name;
  - the reply checks: the stop before an emoji dropped in a reply and its
    translation, "!" and "?" kept; another emoji removed, and a "." put back
    when it ended a sentence; a second 🙏, 😊 or flower removed; 😊 removed on
    a complaint; the flower added at the end when missing; a sentence with a
    banned word removed; no emoji on an abusive review (today's);
  - the answer request: `website` from the profile; a body without it read
    as none;
  - the answer prompt: the business goes to its guests when it has a service
    area; the gentle offer on an answer that isn't final, the call to book on
    a final one; the emoji rule; the website rule only when a website is
    known;
  - the answer's build: the gentle offer kept last on an answer that isn't
    final, an empty one failing nothing; none on a question that mentions sex
    unless final; the stop before an emoji; another emoji removed; the flower
    added; `{website}` replaced by the address in the answer and its
    translation, or its sentence removed when no website is known;
  - the replay tests above.
- Playwright: nothing new on screen; the existing tests still pass.

### The other specs and the roadmap

The PR that ships this item adds a "Changed by" line to `reviews/reply-drafts`
("The replies") and `questions/answer-drafts` ("The answer"), and marks 2.21
`done`.

## Acceptance criteria

```gherkin
Scenario: A review of a few words
  Given Svarga's profile has a service area and its treatments, none named "Amazing massage"
  When the owner pastes "Amazing massage thank you very much" and writes 2 replies
  Then neither reply names "the amazing massage" nor any treatment
  And neither invites the guest to come back, nor speaks of Svarga's place
  And each ends saying Svarga would be glad to come to the guest again
  And each reply has three short sentences: the thanks with 🙏, that Svarga is glad they enjoyed their massage with 😊, and the invitation with 🌼

Scenario: A business guests visit keeps its invitation
  Given a business whose profile has no service area
  When the owner writes 2 replies to a review
  Then the request says it doesn't go to its guests
  And the prompt asks to invite the guest back to it

Scenario: No stop before an emoji
  Given the model ends a reply "…for another session. 🌼"
  When code checks the replies
  Then the reply ends "…for another session 🌼"
  And "Thank you so much! 🙏" keeps its "!"

Scenario: 😊 and the flower on a happy review
  Given the model says the review holds no complaint
  And it writes "Thank you! 🙏 So glad you enjoyed your massage 😊 We would love to come to you again ✨"
  When code checks the replies
  Then "✨" goes and the reply ends on Svarga's flower
  And it holds one 🙏, one 😊 and one flower

Scenario: No 😊 after a complaint
  Given the model says the review complains
  And a reply reads "Sorry the therapist came late 😊 We hope to come to you again 🌼"
  When code checks the replies
  Then the reply reads "Sorry the therapist came late. We hope to come to you again 🌼"
  And no reply or translation holds 😊

Scenario: A gentle offer ends an answer that isn't final
  Given Sen's owner pastes "Do you come to hotels near My Khe?" with "Make it the final answer" off
  When the answer comes
  Then it ends on one short sentence offering a therapist at the guest's hotel
  And that sentence asks for no day, time or place, and names no time
  And the answer holds 😊 and ends on 🪷

Scenario: The final answer still asks for what's missing
  Given Svarga's guest has said they stay in Seminyak
  When the owner ticks "Make it the final answer" and writes an answer
  Then it ends asking for the day and the time only

Scenario: A question about sex gets no offer and no emoji
  Given a guest asks Sen for a "happy ending" and the answer isn't final
  When the answer comes
  Then it says Sen offers only professional therapeutic massage
  And it ends with no gentle offer and holds no emoji

Scenario: The website, only when a guest asks for photos
  Given Svarga's guest asks "Do you have photos of the four hands massage?"
  When the answer comes
  Then one sentence gives "https://svargabalimassage.com", which code put in place of {website}
  And the answer still ends on its gentle offer

Scenario: No website for a question the chat answers
  Given Sen's guest asks "Which massages do you have?"
  When the answer comes
  Then it lists Sen's massages with their prices
  And it holds no link

Scenario: Treatments by their own names
  Given Sen's guest asks "How much is a relaxing massage at my hotel tonight?"
  When the answer comes
  Then it names only treatments from Sen's details, as they write them
```

## Known limits

- Most of these rules are the model's to follow. Code fixes the stop, the
  emoji, the flower and the banned words; its records catch English clichés
  and English invitations to the business only. Replies and answers in other
  languages are read back by the developer, then by the owner.
- A business that has a place and also goes to its guests counts as going to
  its guests: its replies offer to come to the guest. The owner can edit.
- Whether a review complains is the model's call: a 😊 can follow a complaint
  it missed.
- The gentle offer doesn't see the conversation's earlier answers: two
  answers in a row may end on much the same offer. "Write another answer" or
  an edit fixes it.
- The "." put back for a removed emoji is a Latin stop, also in a Chinese or
  Japanese reply.
- Whether a guest asked for photos or details is the model's call. A link
  the model writes itself, instead of `{website}`, isn't checked: the owner
  reads the answer before sending it.
- Flash-Lite stays (decision 0003). Flash, the stronger model, has about 20
  free requests a day for the whole app against Flash-Lite's 500. If prompt
  changes can't get the recordings through the checks, the developer comes
  back to the maintainer: a stronger model would be a new decision.

## Out of scope

- Posts, the owner guide and the screens: unchanged.
- Replies in the owner's own voice, learned from their past replies.
- Fetching reviews from Google Maps (the roadmap's "Google Maps connection").
