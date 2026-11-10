# Answers to guests' questions: journal

## Calls made along the way

- 2026-11-10: the maintainer skipped the questions and asked for the tab
  straight away. Before approving, they changed three things in the draft:
  each question is answered on its own; only an answer marked final ends with
  a call to book, by a box the owner ticks; and the booking details a guest
  gives (where they're staying, the day, the time) are kept for the
  conversation, so a final answer asks only for what's missing, with a button
  to start a new conversation.
- 2026-11-10: this branch starts from `develop` without 2.18 (short
  captions), which changes `lib/posts/checks.ts`. Nothing here touches that
  file: the answers read prices with their own copy of its amount reader
  (`lib/questions/flags.ts`), and the flower and emoji helpers are exported
  from `lib/reviews/checks.ts` instead. The roadmap row for 2.19 waits until
  `develop` holds 2.18's row, so the two rows never conflict.
- 2026-11-10: the model writes its call to action on every call, empty when
  the answer isn't final, rather than a part that may be missing: a plain
  shape for Gemini's structured output. Code leaves it out of an answer that
  isn't final.
- 2026-11-10: "Forget" (2.2) also clears the conversation, as it clears the
  review. The phone's store becomes version 7, with a `questions` store.
- 2026-11-10: two of the tab's tests failed for their own reasons: the
  language's name on a Vietnamese screen is "Tiếng Anh", and a tick made while
  the first answer was written hit a disabled box. Both tests now wait, and
  name the language as the browser does.
- 2026-11-10: `pnpm eval:answers --record`, 8 Flash-Lite requests with the
  maintainer's yes: all 8 came back.

## Evaluation

The 8 made-up questions, recorded with `answer-1`, each answer as code built
it:

- **Sen, English, final**: "Which massages do you have and how much? We're
  staying at a hotel near My Khe beach." The 8 treatments, one per line, each
  with its duration and price as the site writes them; then "Please let us
  know your hotel name, preferred day, and time to book your massage now 🪷".
  Kept: "a hotel near My Khe beach".
- **Sen, Korean**: the couple massage, 60 min, $31 VND 800k, and that the
  therapists come to the hotel. No call to book.
- **Sen, English, final, sex**: "Hello. We offer only professional
  therapeutic massage." first; three treatments with their prices, in one
  sentence; then the call to book. No emoji; the note shows.
- **Sen, Vietnamese, sex** ("massage đặc biệt cho nam", no word from code's
  list): the model flagged it; "Chào bạn, Chúng tôi chỉ cung cấp dịch vụ
  massage trị liệu chuyên nghiệp." No translation, as it's the screen's
  language.
- **Svarga, English**: open at 10 pm in Uluwatu? The hours, and "our team will
  check and reply regarding your location and slot tonight". Marked
  unanswered. Kept: Uluwatu, tonight, 10pm.
- **Svarga, Indonesian, final**: the Balinese massage, 60 min, IDR 250k, free
  travel to the Seminyak villa, then a call to book asking only the day and
  the time. Kept: Seminyak. No translation.
- **Svarga, Russian, sex**: "Здравствуйте. Мы предлагаем только
  профессиональный терапевтический массаж." No emoji; the note shows.
- **Svarga, English, final**, with "a villa in Pererenan" and "tomorrow"
  kept: "Our team will check if card payment is available and reply to you
  shortly." then "Please let us know what time you would like your massage
  tomorrow. 🌼" Marked unanswered.

| Check | Result |
|---|---|
| In the guest's language | 8 of 8 |
| A call to action at the end of each final answer, and none on the others | 4 of 4 final, 0 of 4 others |
| The call to action asks for no detail the guest gave | 4 of 4 |
| Only facts from the details (no check line) | 8 of 8 |
| The line on every question that mentions sex, and on none of the others | 3 of 3, 0 of 5 |
| The card question marked unanswered | yes |

Verdict: every check passes, and the maintainer would send at least 6 of the
8 as written (2026-11-10). Weak spots, for the next prompt: the sex answer
lists three treatments in one sentence, not one per line; the Russian
question's Indonesian translation came back in Russian; and the Vietnamese
greeting keeps the line's capital after its comma.

## RED

Task 1, the request, the removals and the word list:

```
 Test Files  3 failed (3)
      Tests  no tests
```

Tasks 2, 3, 4 and 6 failed the same way, on modules that didn't exist yet.
Task 5's tests failed on the missing route, the usage bar's "Left today: 20
answers" and `OWNER_LIMITS` without `answers`; Task 7's on the missing tab;
Task 8's:

```
 Test Files  1 failed (1)
      Tests  7 failed | 22 passed (29)
```

## GREEN

Task 1: `Tests  15 passed (15)`. Task 2: `Tests  21 passed (21)`, with the
review checks. Task 3: `Tests  5 passed (5)`. Task 4: `Tests  56 passed
(56)`. Task 5: `Tests  84 passed (84)`. Task 6: `Tests  29 passed (29)`.
Task 7: `Tests  10 passed (10)`. Task 8: `Tests  36 passed (36)`. Task 9, the
replay: `Tests  9 passed (9)`.

`pnpm check`, with the recordings:

```
 Test Files  123 passed (123)
      Tests  1865 passed (1865)
```

`pnpm test:e2e`: the Questions tab, its four tabs at 320px in English,
Indonesian and Vietnamese, and the usage bar on the new tab pass. The usage
spec's mocked answer gained `answers`; before it, the bar read nothing:

```
  6 passed (10.8s)
```
