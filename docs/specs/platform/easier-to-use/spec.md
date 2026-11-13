---
title: "Easier to use"
description: "Owners type a short password, set in Vercel as owner=password, and it alone opens Sen's or Svarga's business: the app knows its website and reads it by itself on a phone with no business yet; 'Questions' comes before 'Reviews' in the bottom bar and the guide; the 'They go on top' line goes; 'Write new texts' gives a suggestion a new post text and story text for the same images, 10 a day; the Questions hint asks only to take out the guest's name."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-13T14:04:59Z }
date: "2026-11-13"
---

# Easier to use

## Goal

The maintainer, 2026-11-13: "lets make the app easier to use for svarga and
sen". Six changes, each in their words:

1. "the login flow should only ask for the password, and the password should
   be enough to map to the website url". The sign-in screen already asks only
   for the password, and the password already says which spa it is. But on a
   phone with no business saved, the next screen asks the owner to type their
   website and tap "Read my website": "too complicate".
2. "invert the 2 buttons at the bottom : Questions should come before
   Reviews".
3. "remove the confusing text on the create posts tab : 'they go on top.
   attempt1 blabla...'": the line "They go on top. Attempt {n} stays below."
   under "Make 2 new suggestions" (`posts/suggestions`).
4. "is it costly if we allow the user to ask for a new copy for a given
   image ? for post and story". It costs no money: the images stay, and the
   two texts take one Flash-Lite request from the free pool. The maintainer:
   "Add it".
5. "in the questions tab right now there is 'Leave out the guest name and
   phone number', what does it mean ? it s cinfusing". The phone already
   replaces phone numbers before the request (`questions/answer-drafts`,
   "What leaves the phone"), so only the name is left to the owner. The
   maintainer asked whether the first name could stay; told that Google's
   free tier takes no personal data (decision 0003) and that an answer never
   uses the guest's name, they answered "Looks right" to taking out the whole
   name.
6. "I want the passwords to be short like" three groups of lowercase
   letters joined by hyphens, four, three and four long (their example isn't
   copied here). Today the owner types the whole entry, `lotus-river-moon-sen`,
   whose last part says which spa it is (`harness/app-scaffold`).

Success: on a new phone, Sen's or Svarga's owner types only a short
password, and their business appears without anything else to type. The bottom bar
reads "Your business", "Create Posts", "Questions", "Reviews". No line under
the button says "They go on top". An owner who doesn't like a suggestion's
words gets new ones for the same images in one tap. The Questions hint says
what to do in plain words.

## Behaviour

### The password opens the business

Each spa's website sits next to its owner id, in a small table in code,
`lib/pilot/sites.ts`:

| Owner id | Website |
|---|---|
| `sen` | `https://sendanangmassage.com/` |
| `svarga` | `https://svargabalimassage.com/` |

- The websites are public (the roadmap names them), so they live in code,
  and `PILOT_PASSPHRASES` in Vercel keeps only the passwords ("Short
  passwords" below). A spa added later is one entry in Vercel; for its
  website to be read by itself, it also needs its line here (the
  maintainer's "Looks right", 2026-11-13).
- The sign-in screen keeps one field and "Enter".
- The home page reads the owner's website from the table, or none, and gives
  it to the home screen.

**The first open on a phone.** The read starts by itself when the home
screen opens and all of these hold:

- the spa has a website in the table;
- no business is saved on this phone for this owner, or the saved one can't
  be opened ("We couldn't open your saved business");
- there is no read to resume (decision 0005);
- it hasn't already started by itself since the page loaded.

It is the same read as tapping "Read my website" with that website typed:

- "Welcome, Sen" stays at the top while this first read runs, with today's
  reading block under it ("Reading your website…", "Keep this page open for
  about 20 seconds.", "Stop") and the panel filling in.
- It takes one of the day's 3 website reads, like a tap. A refusal at the
  limit shows today's limit message.
- When it ends, the app shows "Your business", as after any read today.
- It starts once per page load. After "Stop", a failed read, a refusal or
  "Forget this business", it waits for the owner's tap, or for the next time
  the page loads. Coming back to the app tab only resumes a read that was
  running, as today.

**The screen with no business, for a spa with a website.** It has no website
field. From the top: "Welcome, Sen"; any error or note, as today; a "Read my
website" button; under it, in small text, the website's name as the panel
writes it (`sendanangmassage.com`); then today's hint, "We read a few pages
and your photos. It takes about 20 seconds." The button starts the same
read. At the day's limit it is disabled, with today's limit line.

**A password without a website** (the developer's `dev`, and any spa without
a line in the table) keeps today's screen: "Your website", its field and
"Read my website". Nothing starts by itself.

**After the first read.** "Read it again" reads the table's website for a spa
that has one, and the saved one otherwise (builder's call: the table is the
one place a spa's website is set). "Forget this business" still deletes
everything Shopfront keeps on this phone and goes back to the screen with no
business.

### Short passwords

The owner types only their password; Vercel says whose it is.

- `PILOT_PASSPHRASES` takes comma-separated entries of the form `<owner
  id>=<password>`: `sen=abcd-efg-hijk,svarga=lmno-pqr-stuv,dev=…` (made-up
  values). The owner id is lowercase letters, as today. The password is at
  least 12 characters, like today's secret part (the maintainer's example is
  13 with its hyphens), and holds no comma.
- At start-up, today's checks stay (an owner id of lowercase letters, the
  length, no owner id twice), and one is added: no two entries share a
  password, since the app couldn't tell whose it is. As today, a failed
  check answers every request with the "isn't configured" page, and the
  reason in the server log never holds a password.
- **Today's entries keep working.** An entry without `=` is read as today,
  `<password>-<owner id>`, and its owner types it whole. Old code can't read
  the new form, so the developer switches Vercel after this deploy, and the
  app keeps working in between (builder's call). Removing the old form is a
  later clean-up.
- The typed password is checked as today: spaces at both ends trimmed, case
  matters, compared with every entry in constant time, and a wrong one waits
  a second.
- Sessions don't change: a session holds a fingerprint of its owner's
  password, so a new password signs that owner out once, as changing a
  passphrase does today. They type the new one and stay signed in for 30
  days.
- The screens say "Password", the maintainer's word, instead of
  "Passphrase": the sign-in label, its error line and the guide's first step
  (builder's call). The field still shows what is typed
  (`platform/friendlier-home`), so a typo is caught before the wait.

**The developer's steps, after the deploy:** write a short password for
each owner (`sen`, `svarga`, `dev`), set `PILOT_PASSPHRASES` in the new form
in Vercel for Production and Preview, redeploy, and give Sen and Svarga
their new password. The real passwords never go in the repo or a log line.

### Questions before Reviews

- The bottom bar's tabs, from left to right: "Your business", "Create
  Posts", "Questions", "Reviews". Their icons, labels and contents don't
  change, and the app still opens on "Create Posts".
- The owner guide's sections follow the bar: "Answering guests' questions"
  comes before "Replying to reviews", in its list of contents, on `/guide`
  and in its three PDFs.

### No "They go on top" line

- The line under "Make 2 new suggestions", "They go on top. Attempt {n} stays
  below." (`posts.moreBelow`), goes, with its key in the three message files.
- The "Attempt 2" and "Attempt 1" headings above each pair stay: they show
  which pair is new.
- The guide's line "Want other ideas? Tap {button}: the new ones go on top,
  the earlier ones stay below." stays (builder's call: in the guide it
  explains the steps around it; the maintainer named only the line on the
  tab).

### New texts for a suggestion

**The link.** In an open suggestion's "Post text" part, next to "Edit the
text" and styled like it: **"Write new texts"**. It shows wherever "Edit the
text" shows: on a suggestion that has finished arriving, while its text isn't
being edited, with or without images.

**What one tap does.** One request writes, for that suggestion only, a new
caption (the words of the post text) and a new story text. Nothing else
changes: the images, hashtags, alt text, type, topic, scene, set-up, light,
special offer, badge and WhatsApp line stay (the hashtags staying is the
maintainer's "Looks right", 2026-11-13).

- **A post that carries the special offer keeps its story text.** That
  story text is its offer line, which code sets (`posts/offer-line-first`,
  approved by the maintainer). Its caption still opens on the offer line,
  then the new words. With an offer, both posts of an attempt carry it, so
  on those "Write new texts" changes the post text only (builder's call).
- **Something different.** The post keeps its kind of question
  (`setup.question`, `sore` or `ask`, `posts/short-captions`): an attempt's
  two posts have one kind each (`lib/posts/setup.ts`), and switching one
  would give both the same. The prompt sends the post as it is now (its
  caption, story text, type, topic, scene, light, kind of question, image
  prompt and, when it carries the offer, its offer line), and asks for a
  different question of the same kind, other words than the current
  caption, and another fact from the highlights when the profile has one.
  It also sends the attempt's other post, so the new words don't repeat its
  fact, opening or ending; code's repeat records compare the two, as within
  a plan (builder's call).
- **The same rules.** Everything else follows today's caption and story-text
  rules, unchanged: three short paragraphs, the offer line first on an offer
  post, never a price, two flowers in a caption and one in a story text, a
  story text of ten words at most, the post's light, its type's job
  (`posts/short-captions`, `posts/offer-line-first`, `posts/two-suggestions`,
  `posts/day-and-night-copy`, `posts/marketing-copy`). Code's checks run on
  the answer as on a plan's posts, with the same fixes and flags.
- **How it runs.** Like "Rewrite this one too" on one post: a posts run of
  its own kind on decision 0005's run record, with its resume (builder's
  call on the shape: a kind of the rewrite route or a route of its own; a
  prompt of its own either way). One posts run at a time, as today: the link
  is disabled while an attempt, a caption update or another new text is
  running.
- **Where the answer lands.** On the post as stored when the answer comes:
  only its words (caption, story text and their flags) are replaced. Its
  `savedAt` and images stay as stored, since "Create new image" can run
  meanwhile, and `copiedAt` goes.
- **The same fix for caption updates.** Today a caption update's answer
  (`mergeRewrite`, `lib/posts/edit.ts`) puts back the post as it was sent:
  a copied post keeps its "copied" mark after "Update captions" or "Rewrite
  this one too", and a `savedAt` cleared meanwhile comes back. From now on,
  they land like new texts (found by this spec's check, 2026-11-13).

**What the owner sees.**

- While it writes, the link reads "Writing new texts…" with a spinner, and
  the suggestion's text buttons ("Edit the text", the copy buttons) wait. The
  images part stays usable.
- The new words replace the old ones. There is no way back
  to them (the maintainer's "Looks right", 2026-11-13). This includes words
  the owner typed in "Edit the text": the post loses "Edited" (`edited:
  false`) and takes today's profile, as "Rewrite this one too" does.
- The text has changed, so the "copied" mark goes (`copiedAt` cleared) and
  the tile's tick comes off until the owner copies again. `savedAt` stays:
  the images are the same.
- A translation shown for the old words goes; "Show in {language}"
  translates the new ones (one translation, as today).
- If it fails, the old texts stay and the error shows under the link, in
  the sheet, in today's posts error words; a refusal at the limit shows the
  limit line below.

**The limit.**

- 10 a day per owner: `newTexts: 10` in `OWNER_LIMITS`, counted on
  Flash-Lite's app-wide pool (`TEXT_MODELS.posts`), taken when the request
  starts and given back on an error, like the other limits
  (`platform/usage-counters`). The developer (`dev`) has no limit, as today.
- With every daily limit used, a spa makes at most 91 Flash-Lite requests a
  day (3 reads, 3 attempts, 5 caption updates, 10 new texts, 30
  translations, 20 replies, 20 answers), so 182 for both, plus the essence
  searches the month caps: well under the pool of 500.
- "Create Posts"'s usage bar lists it: "Left today: 3 attempts, 10 new
  images, 10 new texts" (with images off: "3 attempts, 10 new texts").
- At the limit, the link is disabled and the line under it says "You've
  written today's 10 new texts. More at {time}."

**The owner guide.** "Making your posts" says how ("posts.edit" below), and
"Your daily allowance" counts new texts.

### The Questions hint

- The line under the guest's question becomes "Take out the guest's name if
  it's in the message."
- Phone numbers, email addresses and links are still replaced on the phone
  before the request (`questions/answer-drafts`, "What leaves the phone"), so
  the line no longer names them.
- The whole name, first name included: Google's free tier takes no personal
  data (decision 0003), and an answer never uses the guest's name
  (`questions/answer-drafts`, "Out of scope").

### Strings

New, changed and removed, in the same commit as the code. The Indonesian and
Vietnamese are the builder's, in the words the app already uses.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `enter.label` | Password | Kata sandi | Mật khẩu |
| `enter.wrong` | That password isn't right. Try again. | Kata sandi itu salah. Coba lagi. | Mật khẩu không đúng. Hãy thử lại. |
| `guide.start.passphrase` | Open the link you were given, type your password and tap <b>{button}</b>. You stay signed in on this phone for 30 days. | Buka tautan yang Anda terima, ketik kata sandi Anda, lalu ketuk <b>{button}</b>. Anda tetap masuk di ponsel ini selama 30 hari. | Mở đường link bạn được gửi, nhập mật khẩu và chạm <b>{button}</b>. Bạn vẫn đăng nhập trên điện thoại này trong 30 ngày. |
| `posts.newTexts` (new) | Write new texts | Tulis teks baru | Viết chữ mới |
| `posts.writingTexts` (new) | Writing new texts… | Menulis teks baru… | Đang viết chữ mới… |
| `usage.newTexts` (new) | {count, plural, one {# new text} other {# new texts}} | {count} teks baru | {count} lần viết chữ mới |
| `usage.limit.newTexts` (new) | You've written today's {limit} new texts. More at {time}. | Anda sudah menulis {limit} teks baru hari ini. Bisa lagi pukul {time}. | Bạn đã viết chữ mới {limit} lần hôm nay. Có thêm lúc {time}. |
| `posts.moreBelow` | (removed) | (removed) | (removed) |
| `questions.hint` | Take out the guest's name if it's in the message. | Hapus nama tamu jika ada di pesan. | Xóa tên khách nếu có trong tin nhắn. |
| `guide.start.onePhone` | Everything stays on this phone: on another phone, Shopfront reads your website again and your posts start empty. | Semuanya tetap di ponsel ini: di ponsel lain, Shopfront membaca situs web Anda lagi dan postingan Anda mulai dari kosong. | Mọi thứ ở lại trên điện thoại này: trên điện thoại khác, Shopfront đọc lại trang web của bạn và bài đăng bắt đầu trống. |
| `guide.business.read` | The first time you open Shopfront on a phone, it reads your website by itself. Keep the page open for about a minute; the screen stays on by itself. | Saat pertama kali Anda membuka Shopfront di sebuah ponsel, Shopfront membaca situs web Anda dengan sendirinya. Biarkan halaman tetap terbuka sekitar satu menit; layar tetap menyala dengan sendirinya. | Lần đầu bạn mở Shopfront trên một điện thoại, Shopfront tự đọc trang web của bạn. Giữ trang mở khoảng một phút; màn hình tự sáng. |
| `guide.business.reread` | <b>{button}</b> replaces your changes with what your website says now; Shopfront asks first. | <b>{button}</b> mengganti perubahan Anda dengan isi situs web Anda saat ini; Shopfront bertanya dulu. | <b>{button}</b> thay các thay đổi của bạn bằng nội dung hiện tại của trang web; Shopfront sẽ hỏi trước. |
| `guide.posts.edit` | Tap <b>{button}</b> to change a suggestion's words yourself, or <b>{newTexts}</b> for new words with the same pictures. Tap <b>{image}</b> for a different picture; you can add a short hint. You can't type in the story text here: change it in Instagram after pasting, if you like. | Ketuk <b>{button}</b> untuk mengubah sendiri kata-kata sebuah saran, atau <b>{newTexts}</b> untuk kata-kata baru dengan gambar yang sama. Ketuk <b>{image}</b> untuk gambar lain; Anda bisa menambahkan petunjuk singkat. Teks story tidak bisa diketik di sini: ubah di Instagram setelah ditempel, jika mau. | Chạm <b>{button}</b> để tự sửa lời của một gợi ý, hoặc <b>{newTexts}</b> để có lời mới với cùng hình. Chạm <b>{image}</b> để có hình khác; bạn có thể thêm mô tả ngắn. Không gõ được chữ story ở đây: nếu muốn, hãy sửa trên Instagram sau khi dán. |
| `guide.allowance.limits` | Each day you have {reads}, {attempts} of 2 suggestions, {newImages}, {newTexts}, {replies} and {answers}, plus caption updates and translations. | Setiap hari Anda punya {reads}, {attempts} (masing-masing 2 saran), {newImages}, {newTexts}, {replies}, dan {answers}, ditambah pembaruan teks dan terjemahan. | Mỗi ngày bạn có {reads}, {attempts} (mỗi lần 2 gợi ý), {newImages}, {newTexts}, {replies} và {answers}, cùng với các lần cập nhật chú thích và bản dịch. |

The website's name under "Read my website" is the address itself, not a
message. `guide.business.reread` no longer uses `{forget}`: an owner with a
website in the table can't switch to another one.

### Other documents

The PR that ships this item:

- adds roadmap row 2.20 and marks it `done`;
- adds a dated note, "> Changed by `platform/easier-to-use` (2026-11-13):
  …", in `harness/app-scaffold` (the `<owner id>=<password>` entries, the
  shared-password check, a spa's website in code), `brand/brand-panel`
  (the screen with no business), `platform/friendlier-home` (the bar's
  order, "Password"), `posts/suggestions` (the "stays below" line), `posts/editor-download`
  ("Write new texts" next to "Edit the text"), `platform/usage-counters` (the
  new limit), `questions/answer-drafts` (the hint and the tab's place) and
  `guide/owner-guide` (the section order); their status and approval stay as
  they are;
- in `AGENTS.md`'s Map, `lib/pilot/` gains "each spa's website";
- `.env.example` shows the new form with made-up values, and the test
  values in `playwright.config.ts` and CI's `check.yml` hold both forms, so
  both are tested (builder's call which).

### Tests

- Vitest: `PILOT_PASSPHRASES` in both forms, side by side; the new form's
  checks (owner id, length, no comma, no owner id or password twice) and
  that no problem message holds a password; a typed short password finding
  its owner, and an old entry still found whole; the sign-in screen's
  "Password". The table (`sen`, `svarga`, none for any other owner); the home
  screen starts the read by itself for a spa with a website, no business and
  nothing to resume, once per load, and not after a stop, an error or a
  forget; shows the button and the website's name, not the field; keeps the
  field, with nothing started, for a password without a website; "Read it
  again" reads the table's website; the tab bar's order; no "stays below"
  line (`tests/unit/posts-section.test.tsx` turned around); the new-texts
  prompt (the post as it is, the same kind of question, other words, the
  attempt's other post) and code's checks on its answer (the offer line
  first, no price, three paragraphs, the story text, repeats of the other
  post); what a new text changes (caption and story text, the story text
  kept on an offer post) and keeps (hashtags, alt text, images, set-up),
  with `edited: false`, `copiedAt` cleared and the stored `savedAt` kept; a
  caption update's answer landing the same way (`mergeRewrite`); the
  `newTexts` limit on the meter and on the bar; `GUIDE_SECTIONS`'s order and
  the changed guide lines in three languages; the hint.
- Playwright at the phone viewport, with the stubbed read stream: a short
  test password signs in; signing in
  as Sen on a fresh phone reads the website with nothing typed and lands on
  "Your business"; signing in as `dev` still shows the field; the bottom
  bar's order; after a second attempt, no "They go on top" line
  (`tests/e2e/editor.spec.ts` turned around); "Write new texts" replaces the
  post text and, on a post without the offer, the story text, keeps the
  images and takes the tick off. The e2e tests that type a
  website sign in as `dev`, or as a new test password without a website when
  they need daily limits (builder's call).
- One real new-texts call each for `sen` and `svarga`, on their recorded
  posts, recorded and read back in the journal, only with the maintainer's
  yes (2 Flash-Lite requests from the day's free pool, never on a pilot day);
  builder's call how, such as a flag on `pnpm eval:posts`.
- `pnpm guide:pdf`: the three PDFs, with the section order and the changed
  lines read back.

## Acceptance criteria

```gherkin
Scenario: A short password signs Sen in
  Given PILOT_PASSPHRASES holds "sen=abcd-efg-hijk"
  When Sen's owner types "abcd-efg-hijk" in "Password" and taps "Enter"
  Then they are signed in as Sen

Scenario: Today's entries still work
  Given PILOT_PASSPHRASES still holds "lotus-river-moon-sen"
  When Sen's owner types "lotus-river-moon-sen" and taps "Enter"
  Then they are signed in as Sen

Scenario: Two owners can't share a password
  Given PILOT_PASSPHRASES holds "sen=abcd-efg-hijk,svarga=abcd-efg-hijk"
  Then every page answers that Shopfront isn't configured
  And the server log says two entries share a password, without the password

Scenario: The password alone opens Sen's business on a new phone
  Given a phone with no business saved for Sen
  When Sen's owner types their password and taps "Enter"
  Then "Welcome, Sen" shows, and "Reading your website…" starts with no website typed
  And when the read ends, "Your business" shows what was read from sendanangmassage.com

Scenario: A stopped read leaves one button
  Given Svarga's first read is running on a new phone
  When the owner taps "Stop"
  Then the screen shows "Read my website" and "svargabalimassage.com", and no website field
  And no read starts again until the page loads again

Scenario: A password without a website keeps the field
  Given the developer signs in with the dev password on a new phone
  Then the screen shows "Your website" and its field
  And no read starts by itself

Scenario: Questions comes before Reviews
  Given Sen's owner is on the home screen
  Then the bottom bar reads "Your business", "Create Posts", "Questions", "Reviews"
  And in the guide, "Answering guests' questions" comes before "Replying to reviews"

Scenario: No "They go on top" line
  Given Sen's owner made an attempt today
  When they make another
  Then no line under "Make 2 new suggestions" says "They go on top"
  And the headings "Attempt 2" and "Attempt 1" show

Scenario: New texts for the same images
  Given Sen's owner has saved and copied a suggestion without the offer
  When they open it and tap "Write new texts"
  Then its post text and story text are new, and the post text opens on a different question
  And its post image and story image are the same
  And its tick comes off until the new text is copied

Scenario: New texts on an offer post
  Given Svarga's owner opens a suggestion that carries a 15% offer
  When they tap "Write new texts"
  Then the post text is new and still opens on the offer line
  And the story text is still the offer line

Scenario: A caption update takes the copied mark off
  Given Sen's owner copied a suggestion's text, then changed their business
  When they tap "Update captions"
  Then that suggestion's tick comes off until its new text is copied

Scenario: Ten new texts a day
  Given Svarga's owner has written 10 new texts today
  Then "Write new texts" is disabled
  And "You've written today's 10 new texts. More at 16:00." shows under it

Scenario: The Questions hint
  Given the screen is in Vietnamese
  When the owner opens "Câu hỏi"
  Then the line under the box says "Xóa tên khách nếu có trong tin nhắn."
```

## Known limits

- A short password is as hard to guess as it is random: code checks only
  its length. Eleven random letters leave almost 4 million billion
  possibilities, far too many to guess online.
- Old long entries keep working until the developer replaces them in
  Vercel; nothing forces the switch.
- A browser that won't keep the business ("This browser won't keep your
  business", private browsing) reads the website by itself on every page
  load, each time one of the day's 3 reads.
- A spa's website is the developer's to change, in code. An owner with a
  website in the table can't read another one; nobody asked to.
- "Write new texts" has no way back: an owner who preferred the old words
  must copy them first.
- With a special offer, "Write new texts" changes the post text only: the
  story text is the offer line.
- The new texts can come out close to the old ones: the other kind of
  question and the "other words" rule make that unlikely, but code doesn't
  compare them.
- A spa added to `PILOT_PASSPHRASES` without a line in the table gets
  today's website field: the start-up check doesn't ask for one.

## Out of scope

- A hint for new texts, like the one "Create new image" takes.
- New words for the post text alone or the story text alone: one tap writes
  both.
- Getting earlier texts back.
- Signing in without a password, or a link that signs in by itself.
- Removing "Forget this business".
- Keeping the guest's first name in the message, or using it in the answer.
- The guide's "the new ones go on top" line.
