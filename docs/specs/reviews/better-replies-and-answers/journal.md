# Better replies and answers: journal

## Calls made along the way

- 2026-11-20: the maintainer agreed in chat to the list of changes ("Nothing, write it up"). It held three guesses, marked as such: a reply offers to come to the guest again; 🙏 stays after the thank-you; every answer ends on a gentle offer.
- 2026-11-20: the "come back" rule traces to `reviews/reply-drafts`' journal (2026-10-25): a Russian test reply, "we will gladly come to you again", was read as the visit reversed, and `reply-2` forced the guest to come to the business. For Sen and Svarga it was right.
- 2026-11-20: code, not the model, says whether a business goes to its guests: a service area in the profile, which the brand read writes only for a business that comes to the client. One rule for both tabs, and the model has nothing to guess.
- 2026-11-20: three emoji only (🙏 in replies, 😊, the flower), and code removes any other, as posts keep only flowers. The model flags a complaint so that code can take 😊 out of the replies to one.
- 2026-11-20: the gentle offer names no day or time: the app doesn't know which slots are free. The chat's example, "coming to their hotel tonight", was only an example.
- 2026-11-20: an answer to a question about sex gets no gentle offer unless it is final: it stays calm and short.
- 2026-11-20: a request from a page loaded before the change, without the treatment names or `goesToGuests`, gets today's replies rather than an error.
- 2026-11-20: Flash-Lite stays. The model did what `reply-2` told it; Flash has about 20 free requests a day for the whole app (decision 0003).
- 2026-11-20: the two marketing libraries (decision 0009) were read for the gentle offer at the pinned commits. Neither has a skill for chat or review replies; the rules used come from CH `marketing-psychology/SKILL.md` and IG `references/voice-rules.md`.

- 2026-11-20: the builder check's two points, settled in the spec before approval. A happy reply has three or four sentences, so 😊 always has a middle sentence: the maintainer asked for 😊 and a flower on every positive reply. A recording that fails a check is recorded again after a prompt fix, each round with the maintainer's yes, and the item doesn't ship until the checks pass. The journal's "before" costs no new request.

- 2026-11-20: the maintainer asked whether answers about the massages should send guests to the website. Told that the chat is where guests book and a link sends them away, they chose "Yes, add that" to giving the website only when a guest asks for photos or more details. The model writes a `{website}` placeholder, as replies do with `{name}`, so the address is always the site's own and never a made-up page.

- 2026-11-20, the recordings, each round with the maintainer's yes. The worktree had no Gemini key: the maintainer copied the key line into `.env.local` themselves (copying it for them was refused), and added €5 of credit to that project. About 79 Flash-Lite requests in five rounds, a few refused by Google as busy (503) or over the per-minute limit (429) and run again:
  - round 1 (`reply-3`, `answer-2`, 19): every reply offered to come to the guest again and said "your massage", but the Russian review got Indonesian replies, one reply said "your amazing massage" and "truly glad", the model put a stop after emoji ("review 🙏."), three answers copied "A therapist can come to your hotel, villa or home" from the prompt, and the answer about sex lost every stop. Code now drops a stop after an emoji, ends each part on its stop, puts a stop back where a removed last emoji stood, and turns a link on the business's own site into its address;
  - round 2 (`reply-4`, `answer-3`, 19): the Russian review got Russian, the menu's names came through ("your Four-Hands Massage"), but a Korean and a Russian question were answered in English and one short reply left the name out. The replay tests now check the guest's script;
  - round 3 (`reply-5`, `answer-4`, 19): every reply passed and was kept. The answer to a guest in Uluwatu said "A therapist can come to you in Uluwatu when you are ready 🌼" in round 2; the maintainer asked that answers match the served areas, and the spec gained "Only the areas the website lists". In round 3 that answer checked Uluwatu, then still closed on "A therapist can come to you where you are staying 🌼";
  - round 4 (`answer-5`, 10): Uluwatu right, but the Korean question got English again. The spec gained "The guest's letters": code tells the model the letters and refuses an answer or a reply without them;
  - round 5 (`answer-6`, 12): every answer passed. The Korean answer showed a false check line, "This price isn't on your website: VND 80", from "800k이며", a Korean ending glued to the price: the answer's checks now keep such a price whole.
- 2026-11-20: Google's free model still makes small slips the checks can't see: one round wrote "tolonginfokan" for "tolong infokan", and lists of more than two treatments sometimes come inline instead of one per line. The owner reads each answer before sending it.

### Before and after, as the owner sees them

- A review of a few words. Before, the maintainer's example under "Goal" ("Amazing massage thank you very much"): "Thank you so much! 🙏 It is wonderful to hear that you loved the amazing massage. We would be thrilled to have you back with us at Svarga Bali Massage for another relaxing session. 🌼" After, `svarga-short-en` ("Amazing massage, thanks a lot!"), short: "Thank you for your review 🙏 I am glad you enjoyed your massage 😊 We would be glad to come to you again whenever you would like another massage 🌼"; warm: "Thank you very much for your kind words 🙏 I am so glad that you enjoyed your massage 😊 We would be very glad to come to you again on your next stay 🌼".
- A review with a complaint, `sen-complaint-en`. Before (`reply-2`, the old made-up review of a spa visit): "Thank you, Tom R.! 🙏 Glad you enjoyed the hot stone massage. Sorry about the cold room and the wait. We hope to welcome you back to Sen Da Nang Massage soon. 🪷" After (`reply-5`, the review rewritten for a massage in the hotel room), short: "Thank you for your review, Tom R. 🙏 I am glad you enjoyed your Thai Massage. I am sorry about the delay and the oil scent. We would be glad to come to you again on your next stay 🪷".
- A guest outside the served areas, `svarga-uluwatu-en`. Before (`answer-1`): "Hello! / Our hours are Monday to Sunday 08:30-23:00, and our team will check and reply regarding your location and slot tonight. 🌼" After (`answer-6`): "Hello 😊 / Our team will check if we can come to Uluwatu and reply to you shortly. / We bring our treatments to villas and hotels in Canggu, Pererenan, Seminyak, and Kerobokan 🌼".
- A Korean guest, `sen-couple-ko`. Before (`answer-1`): "안녕하세요! / 네, 저희는 고객님의 호텔이나 아파트로 직접 방문하여 마사지를 제공합니다. 커플 마사지는 다음과 같습니다: / - Couple Massage, 60 min, $31 VND 800k 🪷", with no offer at the end. After (`answer-6`): "안녕하세요😊 / 커플 마사지는 60분에 31달러 VND 800k이며 다낭 내 호텔이나 빌라로 방문해 드립니다. / 다낭의 숙소에서 편안하게 테라피스트의 방문을 받으실 수 있습니다 🪷".

## RED

- Task 1, the emoji rule, sentences and notes: `Test Files  3 failed (3)`
- Task 2, the reply request: `Tests  4 failed | 9 passed (13)`
- Task 3, `reply-3` and its checks: `Tests  13 failed` (reviews-prompt and reviews-checks)
- Task 4, the answer request and `answer-2`: `Tests  9 failed | 6 passed (15)`
- Task 5, the answer's build: `Tests  8 failed` (questions-checks)
- Task 6, the recorded replies and answers before new recordings: `Tests  11 failed | 14 passed (25)`
- The guest's letters: `Tests  6 failed | 56 passed (62)`
- A price glued to a Korean ending: `Tests  2 failed (2)`

## GREEN

- Task 1: `Tests  106 passed (106)`
- Task 2: `Tests  20 passed (20)`
- Task 3: `Tests  29 passed (29)`
- Task 4: `Tests  15 passed (15)`
- Task 5: `Tests  20 passed (20)`
- The recorded replies and answers, round 5: `Tests  25 passed (25)`
- The guest's letters: `Tests  71 passed (71)`
- A price glued to a Korean ending: `Tests  26 passed (26)`
