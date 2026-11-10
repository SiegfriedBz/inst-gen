---
title: "Answers to guests' questions"
description: "A fourth home tab, 'Questions': the owner pastes a guest's question and gets one answer in the guest's language, from the business's own details, with its translation in the owner's language, from one Flash-Lite call. A question that asks for or mentions sex always gets 'we offer only professional therapeutic massage', and an answer the owner marks as final ends with a call to book; code makes sure of both."
status: draft
date: "2026-11-10"
---

# Answers to guests' questions

## Goal

Guests message the pilot spas before they book, mostly on WhatsApp and
Instagram, and in many languages. They ask which massages the spa offers,
what they cost, the hours, and whether a therapist comes to their hotel. Some
ask for sex. The maintainer asked for a tab that writes the answers, next to
"Reviews" (2026-11-10):

- answers to general questions, such as "Which massages do you offer?" and
  "What are the prices?";
- when a question asks for sex or mentions it, the answer must say the
  business offers only professional therapeutic massage;
- answers that end with a call to action, but not every one: a guest may
  ask several questions in a row. Each question is answered on its own, and
  the owner ticks a box when the answer should be the final one; only that
  answer ends with a call to book (the maintainer, 2026-11-10).

This item adds a fourth home tab, **"Questions"**. The owner pastes the
guest's message, taps one button, and gets **one answer ready to paste in the
chat**. It is written in the guest's language, with a translation in the
owner's own language so they know what they send. It works like "Reviews"
(2.7, 2.10): copy and paste, nothing to learn, on cheap and slow phones.

Success: on the made-up questions under "Prompt and eval", every answer is in
the guest's language and uses only facts from the business's details. Every
final answer ends with its call to action, and no other answer has one. Every
answer to a question that asks for or mentions sex says the business offers
only professional therapeutic massage. The maintainer would send most answers
as written.

## Behaviour

### The tabs

The bottom bar (2.10) gets a fourth tab, after the others: **Your business ·
Create Posts · Reviews · Questions**. Its icon is Phosphor's `ChatsCircle`
(developer's call: the header's guide link already uses `Question`). The app
still opens on the posts tab. The four tabs fit at 320px in all three
languages, with no horizontal scroll; a label may take two lines.

### The Questions tab, empty

Top to bottom:

1. One line: "Got a question from a guest? Copy it and paste it here. We write
   an answer in your guest's language, from your business details."
2. **"The guest's question"**, a text box of about 5 lines, at most 2,000
   characters, pasted as is. Under it, in small text: "Leave out the guest's
   name and phone number."
3. A checkbox, **"Make it the final answer"**, off at first, with "It ends by
   asking the guest to book." under it in small text.
4. The button **"Write an answer"**, full width, disabled while the question
   is empty (after trimming).

There is no name field: an answer greets the guest without a name, and the
owner can add one with "Edit the text" (developer's call: one field).

### While the answer is written

As in "Reviews": the button reads "Writing your answer…" and is disabled,
with "Keep this page open for a few seconds." under it. The box can't be
edited meanwhile. The call is cut at 20 seconds.

### The Questions tab, with an answer

Top to bottom:

1. **The question**, in a muted box: a small heading "The guest's question ·
   in {language}", the question as pasted, then, under a thin line, **the
   question in the owner's language**.
2. When the question asks for or mentions sex, a calm note: "This question
   mentions sex. Your answer says you offer only professional therapeutic
   massage."
3. When the business's details don't answer all of it, a note: "Your
   business details don't answer all of this question. Check the answer
   before you send it."
4. One card, **"Your answer"**: the answer as it will be pasted; under a thin
   line, **the answer in the owner's language**; any check line (below); the
   link **"Edit the text"**; the button **"Copy the answer"**, with 2.4's
   "Copied" and "Copy it from here." fallback. It is 2.7's reply card.
5. One line: "Paste it in your chat with the guest."
6. The checkbox **"Make it the final answer"**, ticked as it was for this
   answer.
7. Two links: **"Write another answer"** and **"Paste a new question"**.

The owner's language and the language's name follow 2.7. The owner's language
is the screen's, and no translation shows when the question is already in it.
A language switch keeps the answer and the language of its translation.

### Another answer, an edit, a new question

These work as 2.7's "Write 2 other replies", "Edit the text" and "Paste a new
review":

- "Write another answer" spends one more request for a new answer to the same
  question, final or not as the checkbox is ticked now: an owner who wants
  the call to book ticks it and taps the link. The request holds the answer
  last written, as the model wrote it and without the owner's edit, so the new
  one says it differently. The new answer replaces the one shown, and the
  edit goes with it.
- "Edit the text" opens the editor on the answer. After a save, the card
  shows the edited text without its translation, and "Copy the answer" copies
  it. No request.
- "Paste a new question" clears the question and the answer, with no
  confirmation.

### Kept until a new question or the daily reset

Only the current question is kept on the phone (IndexedDB, as the review is):
the question, whether its answer is the final one, its language and
translation, the notes, the answer as the model wrote it, its translation and
checks, the owner's edit, the screen language they were made in, and when. It goes when the owner taps "Paste a new
question", when a new "Write an answer" succeeds, or at Google's reset (2.8b),
as the review does. What the owner types but hasn't sent isn't kept. A failed
request keeps the question as typed and shows the error under the button.

### What leaves the phone

Decision 0003 sends no personal data to Gemini's free tier, and a guest's
message isn't public the way a review is. So:

- before the request, the phone replaces each phone number (7 digits or
  more, with their spaces, dots, dashes and a leading +), each email address
  and each link in the question with `[number]`, `[email]` and `[link]`
  (developer's call). The question shown on the phone stays as pasted;
- the hint under the box asks the owner to leave out the guest's name;
- the route's log line never holds the question or the answer.

A name or a hotel room the guest wrote in the question still goes with it
("Known limits").

### The answer

What the model is asked for, and what code makes sure of:

- **Language.** The answer is in the language of the question, or its main
  language if it mixes several.
- **Facts only from the business's details.** The answer uses the treatments,
  with their durations and prices as the details write them; the hours; the
  town, the area, and where the business goes, with its travel terms; the
  highlights; and the contact details, only when the guest asks how to reach
  the business. It never invents a treatment, a price, a discount, a free
  time, a payment method or any other fact. When the details don't answer part
  of the question (a card payment, a free slot tonight, parking), the answer
  says the team will check and reply, and the model sets **"unanswered"**: the
  tab shows its note.
- **Prices.** When the answer lists treatments, each comes with its duration
  and its price, as the details give them (developer's call: guests ask the
  price next, and the maintainer named "What are the prices?"). Posts still
  never give a price (2.17b).
- **Shape.** A short greeting with no name, then the answer to each thing the
  guest asked, in 1 to 4 short sentences, plain and warm, in the business's
  tone words. More than two treatments go one per line ("Thai Massage, 60
  min: VND 500k"). The maintainer wants easy reading (2.18).
- **The call to action, on the final answer only.** When the owner ticks
  "Make it the final answer", one sentence asks the guest to book now, by
  saying what the business needs to book: the day and the time, and, for a
  business that goes to its guests (its service area says so), where they're
  staying. The model writes it in its own field, in the guest's language, and
  code puts it last, so no final answer ends without one. It holds no phone
  number or link: the owner pastes the answer in the chat where the guest
  asked (developer's call).
- **Any other answer** ends once it has answered: no call to action, and no
  question back unless the answer needs one (which massage the guest means).
  The box is off at first, since the guest may ask more (the maintainer,
  2026-11-10).
- **Sex.** The question may ask for sex, a sexual service or anything more
  than a professional massage, or mention sex at all, in any language and
  with any euphemism ("happy ending", "extra service", "massage plus"). Then
  the answer says the business offers only professional therapeutic massage.
  The model flags it (**"sexual"**) and writes that line in its own field, in
  the guest's language, on every call. Code also checks the question against a
  word list (below). When either says so, code puts the line right after the
  greeting, so it is always there, and the tab shows its note. Such an answer
  is calm, short and polite, with no emoji. It never repeats the guest's
  words and never jokes. A final one still ends with its call to action, for
  a professional massage.
- **A business that isn't a spa** (2.13's test) gets no such line: its answer
  speaks only of what the business offers, and no note shows (developer's
  call: the line names massage).
- **Never these words**, nor anything that suggests more than a professional
  treatment: the posts' banned words (2.2). Code removes any sentence of the
  answer that holds one.
- **Emoji.** At most 2, with the business's flower at the very end. Code
  chooses the flower from the country, as 2.7 does: Vietnam 🪷, Indonesia 🌼,
  anywhere else 🌸. Code replaces any other flower with it, and removes every
  emoji when the question mentions sex.
- **No promise** the owner hasn't made: no discount, no free extra, no "we'll
  be there in 20 minutes".

#### Code's word list

The list holds words and phrases that ask for or mention sex, in the guests'
main languages: English ("sex", "happy ending", "extra service", and the
posts' banned words), Vietnamese ("tình dục", "kích dục"), Indonesian
("pijat plus", "plus plus"), Russian ("секс", "интим"), Korean ("섹스") and
Chinese ("色情", "特殊服务"). Matching ignores case and accents; English
words match whole. The developer writes the full list and may add to it. A
match adds the line even when the model didn't flag the question. The log
line says which check fired (`sexual=model`, `sexual=words` or
`sexual=both`), never the word.

#### Checks the owner sees

Like a post (2.2), the answer gets a check line for each price, duration or
phone number that isn't in the business's details: "This price isn't on your
website: {text}. Check it before sending." Durations and numbers get the same
line. Nothing is removed: the owner checks it.

### The model call

One request per "Write an answer" or "Write another answer", on
`TEXT_MODELS.light` (Flash-Lite, decision 0003), as 2.7's: structured output
checked by zod, not streamed, thinking level `low`, no retry, cut at 20
seconds. It returns:

- the question's language, as a BCP 47 code;
- `sexual` and `unanswered`;
- the question in the owner's language, or nothing when it is already in it;
- the greeting, the answer, the line on professional massage and, on a final
  answer, the call to action, each with its translation in the owner's
  language, or none when the question is in it.

Code builds the answer from its parts, each a paragraph: the greeting, with
the line after it when it is needed; the answer; then, on a final answer, the
call to action. It builds the translation the same way. An empty greeting, an
empty call to action on a final answer, or an empty line when it is needed,
fails as `model_failed`. So does an empty answer, unless the question
mentions sex: the line is enough then. On an answer that isn't final, a call
to action the model writes anyway is left out.

A route, `POST /api/questions/answer`, sits behind the pilot session like the
others. It takes:

- the question, as the phone sent it;
- whether it is the final answer;
- the screen's language;
- the business's details: its name, summary and category, its treatments
  with their descriptions, durations and prices, its highlights and hours,
  its town, area and service area, and its contact details;
- its country (`VN`, `ID` or none);
- for "Write another answer", the answer shown.

It answers the built result with its checks, the model and the prompt
version, or an error code, as 2.7's route does (`invalid_request`,
`model_busy`, `model_timeout`, `model_failed`). Its one log line holds the
owner, the model, the prompt version, the characters in and out, the
question's language, `sexual` and which check fired, `unanswered`, the time
and the outcome. It never holds the question or the answer.

Errors show under the button, in the owner's language, as 2.7's do with
"answer" in place of "replies" (strings below). Signed out answers as the
other tabs do.

### The daily limit

A new count for each owner, **answers**, 20 a day (developer's call, as many
as review replies), from the Flash-Lite pool (2.8). The owner's count comes
back after a failure that isn't theirs, as it does for replies. The usage bar
on the Questions tab shows "Left today: 20 answers · Resets at …". At 0, the
button is off and says when answers come back, as 2.8 does for replies.

### The owner guide

A new section, **"Answering guests' questions"**, comes after "Replying to
reviews":

- "When a guest asks you something on WhatsApp or Instagram (your
  treatments, prices, hours, where you go), copy their message. In
  <b>{tab}</b>, paste it and tap <b>{button}</b>."
- "Read the answer, change it if you want, then copy it and paste it in your
  chat with the guest."
- "When the guest has asked what they wanted to know, tick <b>{final}</b>:
  the answer then ends by asking them to book."
- "Answers use only your business details. When something isn't in them, the
  answer says you'll check, and Shopfront tells you: answer that part
  yourself."
- "If a guest asks for sex, the answer always says you offer only
  professional therapeutic massage."

Three lines change with it: the daily allowance lists `{answers}`, the reset
line says the day's answers leave the screen too, and the languages line says
answers are written in the guest's language, like review replies. The
maintainer can print new PDFs with `pnpm guide:pdf`.

### Prompt and eval

- The prompt is versioned (`answer-1`) and lives next to the route's code, in
  `lib/questions/`.
- `tests/fixtures/questions/` holds made-up questions, written for this item
  (no real guest's words). Each says its business, the screen's language,
  whether its answer is the final one, and the question:
  - Sen, English, final: which massages, and how much, from a hotel near My
    Khe;
  - Sen, Korean: the price of a couple massage, and whether they come to the
    hotel;
  - Sen, English, final: "happy ending?";
  - Sen, Vietnamese: a "special" massage, with no word from code's list, so
    only the model can flag it;
  - Svarga, English: open at 10 pm tonight, for a guest staying in Uluwatu,
    outside the service area;
  - Svarga, Indonesian, final: the price of a 60-minute Balinese massage at a
    Seminyak villa, on an Indonesian screen (no translation);
  - Svarga, Russian: whether there are "intimate" services;
  - Svarga, English, final: paying by card, which the details don't say.
- `pnpm eval:answers [slug…] [--record]` runs them with the real model and
  prints each answer with code's checks; `--record` saves the calls the unit
  tests replay. ⚠️ 1 Flash-Lite request per question from the app's daily
  pool: a few at a time, asked of the maintainer first, never on a pilot day.
  AGENTS.md's commands table gets the line, and its map the new folders.
- commitlint gets a `questions` scope.

The journal shows each recorded answer with its translation, and scores it:
in the guest's language; a call to action at the end of each final answer,
and none on the others; using only facts from the details; the line on every question that mentions sex, and on none
of the others; the card question marked unanswered. Pass: all of it on the 8,
and the maintainer would send at least 6 of the 8 as written. When a check
fails, the journal says why, and the maintainer decides whether the prompt
changes and the questions are recorded again (with their go-ahead).

### Strings

New or changed, in English, Indonesian and Vietnamese (the developer's
translations; the owners read them back during the pilot). "Edit the text",
"Copied", "Copy it from here.", "Save" and "Cancel" reuse 2.4's and 2.7's
keys.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `home.tabs.questions` | Questions | Pertanyaan | Câu hỏi |
| `questions.intro` | Got a question from a guest? Copy it and paste it here. We write an answer in your guest's language, from your business details. | Ada pertanyaan dari tamu? Salin dan tempel di sini. Kami menulis jawaban dalam bahasa tamu Anda, dari detail usaha Anda. | Có câu hỏi từ khách? Hãy sao chép và dán vào đây. Chúng tôi viết câu trả lời bằng ngôn ngữ của khách, dựa trên thông tin doanh nghiệp của bạn. |
| `questions.label` | The guest's question | Pertanyaan tamu | Câu hỏi của khách |
| `questions.hint` | Leave out the guest's name and phone number. | Jangan sertakan nama dan nomor telepon tamu. | Đừng ghi tên và số điện thoại của khách. |
| `questions.final` | Make it the final answer | Jadikan jawaban terakhir | Làm câu trả lời cuối cùng |
| `questions.finalHint` | It ends by asking the guest to book. | Jawaban diakhiri dengan ajakan kepada tamu untuk memesan. | Câu trả lời sẽ kết thúc bằng lời mời khách đặt lịch. |
| `questions.write` | Write an answer | Tulis jawaban | Viết câu trả lời |
| `questions.writing` | Writing your answer… | Sedang menulis jawaban… | Đang viết câu trả lời… |
| `questions.keepOpen` | (as `reviews.keepOpen`) | (as `reviews.keepOpen`) | (as `reviews.keepOpen`) |
| `questions.heading` | The guest's question · in {language} | Pertanyaan tamu · dalam {language} | Câu hỏi của khách · bằng {language} |
| `questions.sexual` | This question mentions sex. Your answer says you offer only professional therapeutic massage. | Pertanyaan ini menyinggung seks. Jawaban Anda menyatakan bahwa Anda hanya menawarkan pijat terapi profesional. | Câu hỏi này có nhắc đến tình dục. Câu trả lời của bạn nói rằng bạn chỉ cung cấp massage trị liệu chuyên nghiệp. |
| `questions.unanswered` | Your business details don't answer all of this question. Check the answer before you send it. | Detail usaha Anda tidak menjawab semua pertanyaan ini. Periksa jawabannya sebelum mengirim. | Thông tin doanh nghiệp của bạn chưa trả lời hết câu hỏi này. Hãy kiểm tra câu trả lời trước khi gửi. |
| `questions.answer` | Your answer | Jawaban Anda | Câu trả lời của bạn |
| `questions.copy` | Copy the answer | Salin jawaban | Sao chép câu trả lời |
| `questions.flags.price` | This price isn't on your website: {text}. Check it before sending. | Harga ini tidak ada di situs Anda: {text}. Periksa sebelum mengirim. | Giá này không có trên trang web của bạn: {text}. Hãy kiểm tra trước khi gửi. |
| `questions.flags.duration` | This duration isn't on your website: {text}. Check it before sending. | Durasi ini tidak ada di situs Anda: {text}. Periksa sebelum mengirim. | Thời lượng này không có trên trang web của bạn: {text}. Hãy kiểm tra trước khi gửi. |
| `questions.flags.number` | This number isn't on your website: {text}. Check it before sending. | Nomor ini tidak ada di situs Anda: {text}. Periksa sebelum mengirim. | Số này không có trên trang web của bạn: {text}. Hãy kiểm tra trước khi gửi. |
| `questions.howTo` | Paste it in your chat with the guest. | Tempel di obrolan Anda dengan tamu. | Dán vào cuộc trò chuyện với khách. |
| `questions.again` | Write another answer | Tulis jawaban lain | Viết câu trả lời khác |
| `questions.newQuestion` | Paste a new question | Tempel pertanyaan baru | Dán câu hỏi mới |
| `questions.errors.model_busy` | (as `posts.errors.model_busy`) | (as `posts.errors.model_busy`) | (as `posts.errors.model_busy`) |
| `questions.errors.model_timeout` | Writing your answer took too long. Try again. | Menulis jawaban terlalu lama. Coba lagi. | Viết câu trả lời mất quá lâu. Hãy thử lại. |
| `questions.errors.model_failed`, `questions.errors.invalid_request` | Something went wrong while writing your answer. Try again. | Terjadi kesalahan saat menulis jawaban. Coba lagi. | Đã có lỗi khi viết câu trả lời. Hãy thử lại. |
| `questions.errors.offline` | (as `reviews.errors.offline`) | (as `reviews.errors.offline`) | (as `reviews.errors.offline`) |
| `usage.answers` | {count, plural, one {# answer} other {# answers}} | {count} jawaban | {count} lượt trả lời câu hỏi |
| `usage.limit.answers` | You've written today's {limit} answers. More at {time}. | Anda sudah menulis {limit} jawaban hari ini. Bisa lagi pukul {time}. | Bạn đã viết {limit} câu trả lời cho câu hỏi hôm nay. Có thêm lúc {time}. |
| `guide.questions.title` | Answering guests' questions | Menjawab pertanyaan tamu | Trả lời câu hỏi của khách |
| `guide.questions.paste` | When a guest asks you something on WhatsApp or Instagram (your treatments, prices, hours, where you go), copy their message. In <b>{tab}</b>, paste it and tap <b>{button}</b>. | Saat tamu bertanya lewat WhatsApp atau Instagram (perawatan, harga, jam buka, area layanan Anda), salin pesannya. Di <b>{tab}</b>, tempel lalu ketuk <b>{button}</b>. | Khi khách hỏi qua WhatsApp hoặc Instagram (dịch vụ, giá, giờ mở cửa, nơi bạn phục vụ), hãy sao chép tin nhắn của họ. Trong <b>{tab}</b>, dán vào và chạm <b>{button}</b>. |
| `guide.questions.send` | Read the answer, change it if you want, then copy it and paste it in your chat with the guest. | Baca jawabannya, ubah jika perlu, lalu salin dan tempel di obrolan Anda dengan tamu. | Đọc câu trả lời, sửa nếu muốn, rồi sao chép và dán vào cuộc trò chuyện với khách. |
| `guide.questions.final` | When the guest has asked what they wanted to know, tick <b>{final}</b>: the answer then ends by asking them to book. | Jika tamu sudah menanyakan semua yang ingin mereka tahu, centang <b>{final}</b>: jawabannya akan diakhiri dengan ajakan untuk memesan. | Khi khách đã hỏi hết những gì họ muốn biết, hãy đánh dấu <b>{final}</b>: câu trả lời sẽ kết thúc bằng lời mời khách đặt lịch. |
| `guide.questions.details` | Answers use only your business details. When something isn't in them, the answer says you'll check, and Shopfront tells you: answer that part yourself. | Jawaban hanya memakai detail usaha Anda. Jika sesuatu tidak ada di sana, jawaban menyebut Anda akan memeriksanya, dan Shopfront memberi tahu Anda: jawab bagian itu sendiri. | Câu trả lời chỉ dùng thông tin doanh nghiệp của bạn. Khi thiếu thông tin, câu trả lời sẽ nói bạn sẽ kiểm tra lại, và Shopfront báo cho bạn: hãy tự trả lời phần đó. |
| `guide.questions.sex` | If a guest asks for sex, the answer always says you offer only professional therapeutic massage. | Jika tamu meminta layanan seks, jawabannya selalu menyatakan bahwa Anda hanya menawarkan pijat terapi profesional. | Nếu khách hỏi về dịch vụ tình dục, câu trả lời luôn nói rằng bạn chỉ cung cấp massage trị liệu chuyên nghiệp. |
| `guide.allowance.limits` (changed) | Each day you have {reads}, {attempts} of 2 suggestions, {newImages}, {replies} and {answers}, plus caption updates and translations. | Setiap hari Anda punya {reads}, {attempts} (masing-masing 2 saran), {newImages}, {replies}, dan {answers}, ditambah pembaruan teks dan terjemahan. | Mỗi ngày bạn có {reads}, {attempts} (mỗi lần 2 gợi ý), {newImages}, {replies} và {answers}, cùng với các lần cập nhật chú thích và bản dịch. |
| `guide.allowance.reset` (changed) | At that time, the limits come back and the day's suggestions, review replies and answers leave the screen. Save what you want to keep before then. Your special offer stays: it lasts until its own last day ends. | Pada jam itu, batas kembali penuh dan saran, balasan ulasan, serta jawaban hari itu hilang dari layar. Simpan yang ingin Anda pakai sebelum itu. Promo spesial Anda tetap ada: berlaku sampai hari terakhirnya sendiri berakhir. | Vào giờ đó, giới hạn được làm mới, còn các gợi ý, câu trả lời đánh giá và câu trả lời cho câu hỏi trong ngày rời khỏi màn hình. Hãy lưu những gì bạn muốn giữ trước giờ đó. Ưu đãi đặc biệt của bạn vẫn giữ nguyên: nó kéo dài đến hết ngày cuối cùng của nó. |
| `guide.languages.captions` (changed) | Posts and story texts are written in English, and review replies and answers in your guest's language. Showing them in your language is for reading, not for posting. | Postingan dan teks story ditulis dalam bahasa Inggris, sedangkan balasan ulasan dan jawaban dalam bahasa tamu Anda. Menampilkannya dalam bahasa Anda hanya untuk dibaca, bukan untuk diposting. | Bài đăng và chữ story được viết bằng tiếng Anh, còn câu trả lời đánh giá và câu trả lời cho câu hỏi bằng ngôn ngữ của khách. Hiển thị bằng ngôn ngữ của bạn là để đọc, không phải để đăng. |

### Tests

- Vitest:
  - the prompt: the language, the facts-only rule, prices with treatments,
    the shape, the call to action on a final answer and none otherwise, the
    line on professional massage, the emoji, the banned words, the answer to
    avoid;
  - building the answer: greeting, line, answer and, on a final answer, the
    call to action, and the translation the same way; a call to action left
    out of an answer that isn't final; the line added when the model flags the
    question, when only the word list does, and not otherwise; no line for a
    business that isn't a spa; no emoji when the question mentions sex;
    another flower replaced; a sentence holding a banned word removed;
    translations dropped when the question is in the screen's language; an
    empty greeting, needed line, or call to action on a final answer
    failing;
  - the price, duration and number checks;
  - the phone's removals: a number, an email and a link replaced; "room 405"
    kept;
  - the word list: each language's example caught, "massage" and "spa" not;
  - the route: 401 without a session, 400 on a bad body, each error code, the
    log line without the question or the answer, the count taken and given
    back, replayed answers;
  - the store: kept across a reload, replaced by a new question, cleared by
    "Paste a new question", gone after the reset;
  - the tab: the empty state, the button off on an empty question, the
    checkbox off at first and sent with the request, the waiting state, the answer with its translation, no translation when the
    question is in the screen's language, both notes, a check line, "Write
    another answer" sending the shown answer and the checkbox as ticked now,
    and replacing it, an edit hiding
    the translation, "Copy the answer" copying the edited text, each error
    line, the limit line;
  - the usage bar on the new tab, and the guide's new section in three
    languages.
- Playwright at the phone viewport, routes mocked: paste a question, write,
  see the answer and its translation; copy it; reload and see it again; four
  tabs with no horizontal scroll at 320px in English, Indonesian and
  Vietnamese.

### The roadmap

The PR that ships this item marks 2.19 `done`, and AGENTS.md's opening lines
say the app also drafts answers to guests' questions.

## Acceptance criteria

```gherkin
Scenario: An answer in the guest's language
  Given Sen's owner reads the app in Vietnamese
  When they paste "Hi, which massages do you have and how much? We're near My Khe beach."
  And tap "Viết câu trả lời"
  Then an answer in English names Sen's treatments, each with its duration and price, one per line
  And the question and the answer show in Vietnamese under them

Scenario: Not the final answer
  Given "Make it the final answer" isn't ticked
  When the owner writes an answer
  Then the answer ends once it has answered, with no call to action

Scenario: The final answer
  Given Sen's owner ticks "Make it the final answer"
  When they write an answer
  Then the answer ends by asking for the day, the time and where the guest is staying

Scenario: Another answer, now final
  Given an answer written without "Make it the final answer"
  When the owner ticks it and taps "Write another answer"
  Then the new answer ends with its call to action

Scenario: A question that mentions sex
  When Sen's owner pastes "Do you do happy ending?"
  Then the answer says Sen offers only professional therapeutic massage, right after its greeting
  And it has no emoji
  And the note says the question mentions sex

Scenario: The word list catches what the model misses
  Given the model answers "sexual": false to a question holding "интим"
  When code builds the answer
  Then the answer holds the line on professional massage right after its greeting
  And the log line says "sexual=words"

Scenario: Not in the details
  When Svarga's owner pastes "Can I pay by card?"
  Then the answer says the team will check and reply
  And the note says the details don't answer all of the question

Scenario: A price that isn't on the website
  Given the answer gives "VND 450k" for a Thai Massage the details price at VND 500k
  Then the card shows "This price isn't on your website: VND 450k. Check it before sending."

Scenario: The guest's number stays on the phone
  When the owner pastes "Call me on +84 905 123 456, room 405"
  Then the request holds "Call me on [number], room 405"

Scenario: A trip to the chat keeps the answer
  Given an answer is shown
  When the page reloads before the daily reset
  Then the same question and answer show, with no new request

Scenario: Another answer
  When the owner taps "Write another answer"
  Then one request is made with the answer shown
  And a new answer takes its place

Scenario: Four tabs fit
  Given the screen is 320px wide, in Indonesian
  Then "Usaha Anda", "Buat postingan", "Ulasan" and "Pertanyaan" show without horizontal scroll
```

## Known limits

- The owner copies the question from the chat and the answer back: two trips
  between apps.
- A name, a hotel or a room number written in the question goes to the free
  tier with it: only numbers, emails and links are removed.
- The model and the word list can miss a euphemism, or flag an innocent
  question. A false flag only adds the line. The owner reads the answer
  before sending it.
- The answer knows what the website says, not today's bookings: it never says
  a time is free, and asks for the day and the time instead.
- Prices are the website's, as the owner checked them in "Your business": an
  old price there is an old price in the answer.
- The checks find prices, durations and numbers, not a wrong treatment name.
- An edited answer loses its translation line.

## Out of scope

- The owner's own answers to common questions, kept in "Your business" for
  the model to use.
- Ready-made answers to tap without a request.
- A WhatsApp or Instagram connection, to read messages or send answers.
- A conversation kept in the tab, so an answer knows what was said before:
  the maintainer chose one message at a time (2026-11-10).
- A history of questions and answers, or more than one question at a time.
- A guest's name in the answer.
- Posts and review replies: their prompts don't change.
