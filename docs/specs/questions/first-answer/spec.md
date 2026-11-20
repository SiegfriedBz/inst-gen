---
title: "The first answer"
description: "In the Questions tab, a new box, 'First message from this guest', ticked by itself on a new conversation, makes the answer a first answer: it says hello, thanks the guest and says straight away that a therapist comes to them, ending on 😊 and the flower; it then asks which massage they'd like and gives the website, or, when the guest named one of the business's massages, gives its price for each length (60, 90, 120 min); it ends saying the owner is here to answer all their questions and make their booking easy, on 😊 and the flower, and never lists every massage; the website read keeps every length of a massage with its price, and 'Your business' shows them."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-20T13:32:42Z }
date: "2026-11-20"
---

# The first answer

## Goal

The maintainer pasted "can i get a massage" in the Questions tab, as a
guest's first message. The answer listed every one of Sen's massages with its
price. The maintainer, 2026-11-20, in their words:

1. "it generated an answer with a list of all possible massages, this is very
   bad"
2. "The first answer should contain the following / the first sentence saying
   hi or hello should end with a smile emoji and flower while saying straight
   that the massage will be delivered at their place / then ask what kind of
   massage they want, and mention they can visit the website to see all
   massages we offer / and say something like I m here to answer all your
   questions and ease your booking and end with a smile emoji and flower"
3. Asked what the first answer does when the first message already asks
   something specific, such as "How much is a Thai massage at my hotel
   tonight?": "same intro [...] and then prices for this specific massage
   (with different options 60 90 ... min)"
4. On the hello line: "and also say thank you"

They answered "YES" to four guesses: the closing line ends both kinds of first
answer; "What massages do you have and how much?" gets the website link, never
the full list; a massage without a name from the menu ("a relaxing massage",
"how much is a massage?") counts as no massage named; only the first answer
changes, and later answers keep their shape. And "YEss ok" to the app keeping
the 60, 90 and 120-minute prices, with Sen and Svarga tapping "Read it again"
once after this ships.

The app keeps one conversation at a time, so it can't always tell a guest's
first message: after the reset at 3pm (4pm in Bali), or when the owner
switches between two guests, a guest's next message would get the hello and
the closing again. Offered a box the owner ticks, "First message from this
guest", ticked by itself on a new conversation and unticked after "Paste the
next message", they answered "Yes, add the box".

Why it came out so (read in the code, 2026-11-20):

- Every answer is built the same way: nothing tells the model which answer
  opens the conversation.
- The prompt `answer-7` asks for "the answer to each thing the guest asked
  [...] with the list of treatments when you give one", one per line with its
  duration and price, and `reviews/better-replies-and-answers` ("The website,
  only when asked") says a guest who asks which massages there are gets them
  listed with their prices, and no link. "Can I get a massage" read as that
  question.
- The website read keeps one duration and one price per treatment
  (`brand/extract-site`: `{ name, description?, price?, duration?, source }`).
  Sen's and Svarga's sites give each massage at 60, 90 and 120 minutes, each
  with its price (Svarga's Balinese Lulur Scrub & Massage at 90 and 120); the
  reads kept the first.

Success: on the new made-up first messages ("Prompt and eval"), with Sen's and
Svarga's details, every first answer opens on the hello line and ends on the
closing, each with 😊 and the flower; none lists the massages; one that names
no massage asks which one and gives the website; one that names a massage
gives its price for every length the website gives. The maintainer would send
them as written.

## Behaviour

On the Questions tab, one box is added. What changes besides is the request,
what the model is asked and code's build of the answer; for every length's
price, the website read and "Your business" change too.

### The box: "First message from this guest"

- A checkbox, **"First message from this guest"**, with a short hint under it
  in small text, sits under "Make it the final answer" wherever that box shows
  (under the question, and with the answer for "Write another answer"), and
  works like it. When it is ticked,
  the answer is a **first answer**; otherwise it is a **later answer**,
  written as today (`questions/answer-drafts`, as
  `reviews/better-replies-and-answers` changed it), except that it now has
  every length's price ("Every length and its price").
- It is ticked by itself when a conversation starts: after "New
  conversation", after Google's reset has cleared the conversation
  (`platform/one-daily-reset`), or when the tab has none yet. "Paste the next
  message" unticks it.
- The owner can tick or untick it before "Write an answer": to untick it for a
  guest whose chat began before the reset, or to tick it for a new guest's
  message pasted after "Paste the next message".
- "Write another answer" writes the answer as the box is ticked now, as it
  does with "Make it the final answer": an owner who wants the other shape
  changes the box and taps the link.
- The box goes in the request (`first`). The conversation kept on the phone
  remembers how the box was ticked for its current answer, so it shows the
  same after a trip to the chat. A conversation saved before the change shows
  it unticked (developer's call: it is gone at the next reset).
- Both boxes may be ticked: a final first answer ("With 'Make it the final
  answer'").

Amended 2026-11-20, after the final review: an owner who ticked the box for a
new guest after "Paste the next message", without "New conversation", still
sent the previous guest's place, day and time with the message, so the hello
line or a final answer's call to book could name the wrong hotel, day or time.
Asked whether the screen should hide those details too, the maintainer
answered "Yes, hide it".
Approved by the maintainer, 2026-11-20T15:35:57Z.

- When the box is ticked, "Write an answer" and "Write another answer" send
  none of the details kept for the conversation: the answer starts from what
  this message tells, and its details replace the kept ones.
- After "Paste the next message", while the box is ticked, "What this guest
  has told you" doesn't show, nor its "New conversation" button and hint.
  Unticking the box shows them again. With an answer on screen, its details
  stay shown, ticked or not; the next answer's details replace them.
- Vitest: ticked after "Paste the next message", the box hides the kept
  details and the request holds none; unticked, they show and are sent;
  "Write another answer" with the box ticked sends none.

### The first answer

In the guest's language, as every answer is, in three paragraphs:

1. **The hello line.** Hi or hello, a thank-you for their message and,
   straight away, that a therapist comes to them where they're staying: their
   hotel or villa, or the place they named, as they put it. One or two short
   sentences, with no name (today's rule). It ends on 😊 and the business's
   flower, side by side, in place of its stop: "…comes to your hotel or villa
   😊🪷". Code chooses the flower as today: Sen 🪷, Svarga 🌼, anywhere
   else 🌸.
2. **The middle.**
   - **No massage named.** When the message names none of the business's
     massages, the middle asks, in a short question, which massage they'd
     like, and says in one short sentence that they can see all the massages
     on the website, with its address. It gives no list, no treatment's name
     and no price. This holds for a general ask ("can i get a massage"), the
     whole menu ("What massages do you have and how much?"), a massage in the
     guest's own words that isn't one of the business's ("a relaxing
     massage", "how much is a massage?"), and a massage the business doesn't
     offer.
   - **A massage named.** When the message names one or more of the
     business's massages, even in other words or another language as long as
     it is clearly that one ("thai massage" for Sen's "Thai Massage",
     "balinese massage" for Svarga's "Traditional Balinese Massage"), the
     middle gives each by its name as the details write it, with its price for
     every length the details give, one length per line, as the details write
     them (developer's call on the layout; the model writes it):

     ```text
     Thai Massage
     60 min: $19 VND 500k
     90 min: $27 VND 700k
     120 min: $35 VND 900k
     ```

     No other massage, and no website, unless the guest asks for photos or
     more details (today's rule).
   - **The rest of the message** (a day, a time, a card payment) is answered
     from the details in a short sentence, as today: for what the details
     don't answer, the team will check and reply, and "unanswered" is set.
3. **The closing.** One sentence in the first person ("I"), saying the writer
   is here to answer all their questions and make their booking easy, in the
   model's own words and the guest's language. It ends on 😊 and the flower,
   side by side: "…make your booking easy 😊🪷". It is the last line of every
   first answer.

A first answer holds exactly two 😊 and two flowers: one pair ends the hello
line, the other the closing, and the middle holds none. This replaces, for the
first answer only, `reviews/better-replies-and-answers`' "one of each at most"
("Emojis").

A first answer has no gentle offer: the hello line already says a therapist
comes to them, and the closing takes the offer's place at the end (developer's
call).

#### With "Make it the final answer"

The hello line, the middle, the call to book as today (it asks only for what
the guest hasn't told yet, or to confirm the booking), then the closing, last
(developer's call: the maintainer's closing ends every first answer). The call
to book holds no emoji.

#### Exceptions

Each is the developer's call, keeping a rule already approved:

- **A first message that mentions sex** gets today's answer: calm and short,
  the line on professional therapeutic massage, no emoji and no closing; a
  final one ends on its call to book, as today.
- **A place outside the areas the website lists**
  (`reviews/better-replies-and-answers`, "Only the areas the website lists"):
  the hello line says the business's therapists come to guests in its areas,
  never that they come to the guest's place; the middle says the team will
  check whether they can come there, and "unanswered" is set.
- **A business that doesn't go to its guests** (no service area): the hello
  line is the hello and the thank-you only.
- **No website known** (a request without `website`, from a page loaded before
  2.21): code removes the sentence that holds `{website}`, as today; the
  question on which massage stays.

### What the request carries

- **`first`**: true when the box is ticked. A request without it (a page
  loaded before the change) reads as false: a later answer, as today.
- **Every length of each treatment**, with its price ("Every length and its
  price").

### The model's answer

- A new part, **`closing`** (its text and its translation), on every call: the
  closing on a first answer; on any other, an empty text and a null
  translation.
- On a first answer, the call-to-action part holds the call to book when the
  answer is final, and is empty otherwise.

### Code's build

On a first answer, code puts together the hello line (the greeting part), the
middle (the answer part), the call to book on a final answer, and the closing,
each its own paragraph, and the translation the same way. Then it makes sure
of:

- **The emoji.** Code removes every emoji the model wrote in these parts, then
  ends the hello line and the closing each on 😊 and the business's flower, in
  place of a stop ("…to your villa." becomes "…to your villa 😊🌼"); "!" and
  "?" stay before them. The same in the translation.
- **The website**: `{website}` becomes the address, as today.
- **An empty part**: an empty greeting, middle or closing fails as
  `model_failed`, as an empty part does today; one more tap writes it again.
- The checks the owner sees (prices, durations, numbers) and the banned words,
  as today.
- The log line adds `first=`.

A later answer is built as today.

### Every length and its price

Changed from `brand/extract-site` (`offerings`) and `brand/brand-panel` (the
panel's fields):

- **The website read** keeps, for each treatment, every length its page gives,
  each with its price, as written: Sen's Thai Massage at 60 min $19 VND 500k,
  90 min $27 VND 700k and 120 min $35 VND 900k. A length with no price, or a
  price with no length, is kept as the page gives it. Up to 6 lengths a
  treatment (developer's call).
- Code checks each price on the treatment's page, as it does today, and drops
  one it doesn't find. The structured data the read finds (schema.org offers)
  gives a price with no length, as today.
- **"Your business"** shows each treatment's lengths with their prices, one
  per line under its name ("60 min · $19 VND 500k"). The edit form gives each
  treatment its lengths, each with today's "Duration" and "Price" fields, a
  button that adds one and a way to remove one (new strings, in English,
  Indonesian and Vietnamese; developer's call on the words).
- **A profile saved before the change** keeps its one length per treatment:
  today's duration and price become its first length. Nothing is lost and
  nothing is asked. Sen and Svarga get the other lengths when the owner taps
  "Read it again" once, after the change ships (the maintainer agreed,
  2026-11-20). "Read it again" replaces the owner's own changes, after its
  confirmation, as today (`brand/brand-panel`, "Re-read my website").
- **Who reads them.** The answer request carries each treatment's lengths with
  their prices; the answer prompt gives them; the answer's checks and the
  posts' checks know every length's duration and price, so a 90-minute price
  from the website is never flagged. Posts still never give a price (2.17b).
  Review replies get the treatments' names only, as today.
- **Later answers** that list several massages give each, on its own line,
  with its lengths and prices (developer's call: today's shape, one massage a
  line, with what the details now hold).

### Strings

New strings, in `messages/en.json`, `id.json` and `vi.json` (developer's call
on the words, beyond the box's label):

- the box's label, "First message from this guest", and its hint, which says
  the answer then says hello, thanks the guest and says a therapist comes to
  them;
- in the edit form of "Your business", the button that adds a length and the
  one that removes it;
- the owner guide's line below.

### The owner guide

In "Answering guests' questions" (`guide/owner-guide`), one sentence after the
one on "Make it the final answer": the first-message box is ticked for a new
conversation, and the answer then says hello, thanks the guest, says a
therapist comes to them, and asks which massage they'd like or gives its
prices; untick it when the guest has already had an answer. The guide's PDFs
are made again with `pnpm guide:pdf` (it needs port 3000: the maintainer runs
it if another app holds the port).

### Versions

- The answer prompt: `answer-8`.
- The read prompt: `brand-10`. The profile's `schemaVersion` becomes 4, with an
  upgrade from 3 as above.
- The read's other recorded sites still replay: a model answer in the old
  shape (one price and one duration) reads as one length (developer's call).
  Only Sen's and Svarga's reads are recorded again.

### Prompt and eval

- **Sites**: `pnpm eval:brand sen svarga --record`, two website reads from the
  app's daily pool (about 20 a day). The developer asks the maintainer first,
  never on a pilot day. The journal records Sen's Thai Massage and Svarga's
  Traditional Balinese Massage with every length. If the new reads break a
  replay of Sen's or Svarga's posts or replies, the developer comes back to the
  maintainer before recording anything else.
- **Questions** (`tests/fixtures/questions/`): a fixture gets `first` (missing
  reads as false). Five first messages are added, made up:
  - `sen-first-massage-en`: "can i get a massage" (the maintainer's own);
  - `sen-first-thai-en`: "How much is a thai massage at my hotel tonight?"
    (the maintainer's example);
  - `svarga-first-menu-en`: "Hi! What massages do you have and how much?";
  - `svarga-first-balinese-ru`: a guest asks in Russian what the Balinese
    massage costs at their villa in Seminyak;
  - `sen-first-final-en`: "Can I book a thai massage tomorrow at 3pm? We're at
    a hotel on My Khe beach.", with "Make it the final answer" ticked.
- `pnpm eval:answers --record`: the ten fixtures already there and the five
  new, 15 Flash-Lite requests a round from the app's daily pool. The developer
  asks the maintainer first, never on a pilot day. The journal records the
  five first answers as the owner sees them; their "before" is the
  maintainer's report under "Goal".
- A recording that fails a replay check below isn't kept: the developer
  changes the prompt, bumps its version and records again, each round with the
  maintainer's yes. The item doesn't ship while a check fails.
- The replay tests check every first-answer recording: the hello line ends on
  😊 and the flower; the closing comes last and ends on 😊 and the flower;
  exactly two of each, and no other emoji; for a message that names no
  massage, the website's address, and no treatment's name and no price; for
  one that names a massage, every length's price of that massage as the
  profile writes it, and no other massage's name. Later-answer recordings keep
  today's checks.

### Tests

- Vitest:
  - the tab: the box ticked on a new conversation, after the reset and on an
    empty tab, unticked after "Paste the next message"; the owner's tick or
    untick sent as `first`, for "Write an answer" and "Write another answer";
    kept with the conversation, and a record saved without it shown unticked;
  - the request: `first`; each treatment's lengths from the profile; a body
    without `first` read as false, and a treatment with the old `duration` and
    `price` read as one length;
  - the answer prompt: the first-answer rules only when `first`; each
    treatment's lengths; the `closing` field;
  - the answer's build: the order (hello line, middle, call to book when
    final, closing); 😊 and the flower ending the hello line and the closing,
    no other emoji, none in the middle, no stop before them, in the answer and
    its translation; an empty closing on a first answer fails; a first answer
    to a question that mentions sex, and a later answer, as today;
  - the answer's checks and the posts' checks: no line for a 90-minute price
    that a length gives;
  - the profile: version 4; a version-3 profile upgraded with its one length;
  - the read's checks: each length's price checked on its page;
  - "Your business": every length shown; a length added, changed and removed
    in the edit form, and saved;
  - the replay tests above.
  - the guide: the new sentence, in the three languages;
- Playwright: on the Questions tab, the box ticked on a new conversation and
  unticked after "Paste the next message"; the existing tests still pass;
  "Your business" shows a treatment's lengths (developer's call on where).

### The other specs and the roadmap

The PR that ships this item adds a "Changed by" line to
`questions/answer-drafts` ("The Questions tab, empty" and "The answer"),
`reviews/better-replies-and-answers` ("The website, only when asked" and
"Emojis"), `brand/extract-site` (`offerings`), `brand/brand-panel` (the panel's
fields) and `guide/owner-guide` ("What it says"), and marks 2.22 `done`.

## Acceptance criteria

```gherkin
Scenario: The box is ticked for a new conversation
  Given Sen's owner taps "New conversation"
  Then "First message from this guest" is ticked
  When they write an answer and tap "Paste the next message"
  Then "First message from this guest" is unticked

Scenario: A first message that names no massage
  Given Sen's owner starts a new conversation, with "First message from this guest" ticked
  When they paste "can i get a massage" and write an answer
  Then it opens with hello, a thank-you, and that a therapist comes to the guest's hotel or villa, ending on "😊🪷"
  And it asks which massage they'd like and gives "https://sendanangmassage.com"
  And it names no treatment and gives no price
  And it ends on one sentence where "I" am here to answer all their questions and make their booking easy, ending on "😊🪷"

Scenario: A first message that names a massage
  Given Sen's profile gives Thai Massage at 60, 90 and 120 min with their prices
  When the owner pastes "How much is a thai massage at my hotel tonight?" as the first message
  Then the answer opens on the same hello line
  And it gives Thai Massage with its 60, 90 and 120-minute prices, one per line
  And it names no other massage
  And it says the team will check about tonight
  And it ends on the closing, with "😊🪷"

Scenario: The whole menu, asked first
  Given Svarga's guest's first message is "Hi! What massages do you have and how much?"
  When the answer comes
  Then it asks which massage they'd like and gives "https://svargabalimassage.com"
  And it lists no massage

Scenario: A later answer keeps today's shape
  Given the owner tapped "Paste the next message" after a first answer
  When they paste "Which massages do you have?" and write an answer, the box unticked
  Then it lists Svarga's massages, each with its lengths and prices
  And it ends on a gentle offer, with one 😊 and 🌼 last

Scenario: Another answer follows the box
  Given a first answer is on screen
  When the owner taps "Write another answer" with the box still ticked
  Then the new answer is a first answer too
  When they untick the box and tap "Write another answer"
  Then the new answer is a later answer

Scenario: A guest whose chat began before the reset
  Given the reset has cleared the conversation, and the box is ticked by itself
  When the owner unticks it and writes an answer to the guest's next message
  Then the answer is a later answer, with no hello line and no closing

Scenario: A final first answer
  Given the first message is "Can I book a thai massage tomorrow at 3pm? We're at a hotel on My Khe beach."
  And the owner ticked "Make it the final answer"
  When the answer comes
  Then its call to book asks the guest to confirm the booking
  And the closing comes last, ending on "😊🪷"

Scenario: A first message about sex
  Given a guest's first message asks Sen for a "happy ending"
  When the answer comes
  Then it says Sen offers only professional therapeutic massage
  And it holds no emoji and no closing

Scenario: Code places the emoji
  Given the model writes the hello line "Hello, thank you for your message! A therapist comes to your hotel. 🌸✨"
  When code builds Sen's first answer
  Then the hello line ends "comes to your hotel 😊🪷"
  And the answer holds two 😊 and two 🪷, and no other emoji

Scenario: Every length, read from the website
  Given Sen's website gives Thai Massage at 60, 90 and 120 min
  When the owner taps "Read it again"
  Then "Your business" shows Thai Massage with its three lengths and their prices

Scenario: A profile saved before keeps its length
  Given a profile saved with Thai Massage at "60 min" for "$19 VND 500k"
  When the app loads it
  Then Thai Massage has one length, 60 min at $19 VND 500k

Scenario: A 90-minute price isn't flagged
  Given Sen's profile gives Thai Massage at 90 min for $27 VND 700k
  When an answer says "90 min: $27 VND 700k"
  Then no check line shows for that price or that duration
```

## Known limits

- Whether the guest named a massage, and which, is the model's call, in any
  language: code doesn't check it. The replay tests check the recordings.
- Whether a message is the guest's first is the owner's call, with the box.
  The box guesses from the conversation: after the reset it is ticked even for
  a guest whose chat began before it, and after "Paste the next message" it is
  unticked even for a new guest. The owner changes it then.
- Until the owner taps "Read it again", Sen's and Svarga's answers give one
  length per massage. "Read it again" replaces the owner's own changes in
  "Your business", after its confirmation.
- The closing is in the model's own words, and may read a little differently
  each time.
- A later answer that lists every massage, now with every length, is longer
  than today's.

## Out of scope

- The shape of later answers (the maintainer: only the first answer changes).
- Review replies and posts: unchanged, except that the posts' checks read
  every length.
- More than one conversation kept at a time.
- Booking a length or a price in the app.
