---
title: "Two suggestions an attempt"
description: "An attempt makes two suggestions instead of six, each with its post image and story image: with a special offer both carry it, otherwise one offer post and one of another type; one day and one night; never a price in a caption or a story text; the buttons, the grid and the owner guide say two, in three languages."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-08T11:43:02Z }
date: "2026-11-08"
---

# Two suggestions an attempt

## Goal

The maintainer wants **two suggestions a round, not six**, to cut the image
spend. 2.17 (`posts/two-images`) read the request as six suggestions with two
images. The maintainer's words, 2026-11-08: "I TOLD YOU I WANT TO CREATE ONLY
2 SUGGESTIONS PER ROUND".

This item makes each attempt **two suggestions**, each with its post image and
story image, as every suggestion had before 2.17. An attempt's images cost
about $0.10 (two images at $0.05, decision 0004), and the suggestions arrive
faster, since the model writes two posts instead of six.

The maintainer also said, 2026-11-08: "THERE SHOULD NEVER BE PRICES IN THE
POSTS OR STORIES TEXT". Today only a post that carries the special offer
drops its prices (`posts/offer-line-first`); the other posts may quote one.
This item removes them everywhere (amended 2026-11-08).

Success: "Make 2 suggestions" gives two suggestions, both with images. Nothing
on screen or in the guide still says 6, no suggestion is left without an
image, and no caption or story text holds a price.

## Behaviour

### What an attempt makes

The post plan asks for **two posts**. The number is one constant,
`POSTS_LIMITS.posts = 2` (`lib/posts/batch.ts`), and code deals two set-ups
(`lib/posts/setup.ts`, `SETUPS = 2`).

- **With a special offer** (`posts/special-offer`): both posts carry it.
  They are posts 1 and 2 and use set-ups 1 and 2, which code deals on the
  offer's treatments, as today. Both get the badge.
- **Without one:** post 1 is an offer post, on one of the business's
  treatments; post 2 is one of the other types (moment, local, ritual, tip,
  proof), never repeating the topic of a recent post. (Builder's call: one
  post that sells and one that tells a story, the closest two-post version of
  today's mix.)
- **Light:** one day and one night, in a random order from the attempt's
  seed (`posts/day-and-night-images`, "half and half").
- **Guests:** one man and one woman, unless a couple or pregnancy treatment
  decides it, by the deal's existing half-and-half rule.
- **Scenes:** two different scenes.
- Code's checks follow: more than 2 posts drops the rest, recorded as "more
  than 2 posts"; without an offer, no offer post is recorded as "no offer
  post"; with an offer, a post 1 or 2 that isn't an offer post is recorded as
  today. "At least 4 different types" and "fewer than 2 offer posts" go.
- The prompt version goes up (`POSTS_PROMPT_VERSION`), with the prompt's
  "six" changed to "two" and its mix rules as above. The caption, story text,
  image prompt and scene rules don't change.

### Never a price

No caption and no story text holds a price, with or without an offer, in a
plan or a caption update (amended 2026-11-08).

- **The prompt** says it: "Never a price, in a caption or a story text."
  The caption's concrete detail is the treatment, its duration or the place;
  an offer post is "what it does for the guest, with its duration when the
  profile gives it". Facts from the profile no longer list a price.
- **Code removes what the model writes anyway:** each sentence of a caption
  or a story text that holds a price goes (code's existing price pattern:
  a currency mark next to a number, or a number with k), as offer posts
  already do. The offer line and a leading flower stay. A story text left
  empty goes, and the sheet shows no story part for that post.
- Each removal is recorded, `{ field: 'price', reason: '<id>: price removed
  "<sentence>"' }` (an offer post's keep their `offer` field, as today), and
  counted in the run's log line as `price_fixes=`.
- The owner can still type a price in "Edit the text": that's their words.
- "This price isn't on your website" (the `price` warning) stays in code but
  no longer shows, since code removes every price first.

### Images

Both suggestions get their image automatically, as before 2.17: 2.17's pick
returns both posts of a two-post attempt, so its code stays.

- An attempt made before this ships (six suggestions, two images) keeps its
  look until the day's reset clears it. 2.17's text tiles and "Create new
  image" for the other four keep working for it.
- Usage is unchanged: 3 attempts a day, 10 new images, the $8 image month.
  An attempt now covers two first images, as in 2.17. (Builder's call: 3
  attempts give an owner 6 suggestions a day, about two weeks of posts at 3
  a week.)

### On screen

- The button reads **"Make 2 suggestions"**, then **"Make 2 new
  suggestions"**.
- An attempt's grid shows its **two tiles side by side**, two to a row
  instead of three, so they keep a useful size.
- The empty "Create Posts" line goes back to what it said before 2.17:
  "Each suggestion is 2 images (1 for the post, 1 for the story), the text
  for the post and a short text for the story, ready for Instagram. Pick the
  ones you like and save them to your phone."
- Tile names and the sheet title already count the attempt's posts
  ("Suggestion 1 of 2", "Attempt 1, suggestion 2 of 2").

### The owner guide

The `/guide` page and its three PDFs say two suggestions, each with its
images:

- **Making your posts:** "You get 2 suggestions, each with a post image, a
  story image, the text for the post and a short text for the story."
- **Editing:** "Create new image" is for a different picture, as before 2.17.
- **Check the text:** its example is "a session length that isn't on your
  website" instead of a price.
- **The offer:** "Your next 2 suggestions both tell the offer and are marked
  {badge} (or {free})."
- **No picture:** as before 2.17, for an account with images off.
- **Your daily allowance:** "{attempts} of 2 suggestions".

### Strings

Changed, in the same commit as the code. The Indonesian and Vietnamese are
the developer's.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `posts.make` | Make 2 suggestions | Buat 2 saran | Tạo 2 gợi ý |
| `posts.makeMore` | Make 2 new suggestions | Buat 2 saran baru | Tạo 2 gợi ý mới |
| `posts.empty` | Each suggestion is 2 images (1 for the post, 1 for the story), the text for the post and a short text for the story, ready for Instagram. Pick the ones you like and save them to your phone. | Setiap saran berisi 2 gambar (1 untuk postingan, 1 untuk story), teks untuk postingan, dan teks singkat untuk story, siap untuk Instagram. Pilih yang Anda suka dan simpan di ponsel Anda. | Mỗi gợi ý gồm 2 hình (1 cho bài đăng, 1 cho story), phần chữ cho bài đăng và một dòng chữ ngắn cho story, sẵn sàng cho Instagram. Chọn những gợi ý bạn thích và lưu vào điện thoại. |
| `guide.posts.make` | In {tab}, tap {button}. You get 2 suggestions, each with a post image, a story image, the text for the post and a short text for the story. | Di {tab}, ketuk {button}. Anda mendapat 2 saran, masing-masing dengan gambar postingan, gambar story, teks postingan, dan teks singkat untuk story. | Trong {tab}, chạm {button}. Bạn nhận 2 gợi ý, mỗi gợi ý có hình bài đăng, hình story, chữ cho bài đăng và một dòng chữ ngắn cho story. |
| `guide.posts.edit` | Tap {button} to change a suggestion's words, and {image} for a different picture; you can add a short hint. The story text can't be changed here: change it in Instagram after pasting, if you like. | Ketuk {button} untuk mengubah kata-kata sebuah saran, dan {image} untuk gambar lain; Anda bisa menambahkan petunjuk singkat. Teks story tidak bisa diubah di sini: ubah di Instagram setelah ditempel, jika mau. | Chạm {button} để đổi lời của một gợi ý, và {image} để có hình khác; bạn có thể thêm mô tả ngắn. Chữ story không sửa được ở đây: nếu muốn, hãy sửa trên Instagram sau khi dán. |
| `guide.posts.offerDone` | Tap {done}. Your next 2 suggestions both tell the offer and are marked {badge} (or {free}). | Ketuk {done}. 2 saran berikutnya sama-sama menyebutkan promo dan bertanda {badge} (atau {free}). | Chạm {done}. Cả 2 gợi ý tiếp theo đều nhắc đến ưu đãi và có dấu {badge} (hoặc {free}). |
| `guide.instagram.noImages` | No pictures on your suggestions? Post a photo of your own and paste the text, and the same for a story with the story text. | Saran Anda tanpa gambar? Posting foto Anda sendiri dan tempel teksnya, begitu juga untuk story dengan teks story. | (unchanged) |
| `guide.posts.check` | A suggestion marked {check} has something to look at before you post: open it to see what, like a session length that isn't on your website, or an offer that doesn't match the one you set. | Saran yang bertanda {check} punya sesuatu yang perlu dilihat sebelum Anda memposting: buka untuk melihatnya, misalnya durasi sesi yang tidak ada di situs Anda, atau promo yang tidak sesuai dengan yang Anda pasang. | Gợi ý có dấu {check} có điều cần xem trước khi đăng: mở ra để biết, ví dụ một thời lượng buổi không có trên trang web của bạn, hoặc một ưu đãi không khớp với ưu đãi bạn đã đặt. |
| `guide.allowance.limits` | Each day you have {reads}, {attempts} of 2 suggestions, {newImages} and {replies}, plus caption updates and translations. | Setiap hari Anda punya {reads}, {attempts} (masing-masing 2 saran), {newImages}, dan {replies}, ditambah pembaruan teks dan terjemahan. | Mỗi ngày bạn có {reads}, {attempts} (mỗi lần 2 gợi ý), {newImages} và {replies}, cùng với các lần cập nhật chú thích và bản dịch. |

The guide keys keep their `<b>` tags, as today. `posts.images.none` stays,
for attempts made before this ships.

### Other documents

The PR that ships this item:

- adds roadmap row 2.17b and marks it `done`;
- adds a dated note, "> Changed by `posts/two-suggestions` (2026-11-08): …",
  in `posts/generate-copy` (six posts), `posts/suggestions` (attempts of
  six), `posts/special-offer` (two of the six carry it),
  `posts/day-and-night-images` (three and three), `posts/two-images` (its
  goal) and `guide/owner-guide`; their status and approval untouched;
- leaves decision 0004 and the usage limits as they are.

### Tests

- Vitest: the deal gives two set-ups, one day and one night, the offer's
  treatments first with an offer; the prompt says two and its mix rules;
  `checkPlan` keeps two, records "more than 2 posts" and "no offer post";
  a price is removed from a caption and a story text without an offer, on a
  plan and on a caption update, recorded, and the prompts say never a price;
  the recorded plans (six posts, `posts-11`) replay to a checked batch of
  two; the section asks for both images after an attempt; the buttons and
  the empty line.
- Playwright at the phone viewport: the e2e plan stream gives two posts;
  "Make 2 suggestions" shows two tiles with images, side by side; with an
  offer, both tiles have the badge; the guide page says 2.
- `pnpm eval:posts sen svarga` and `--offer`, recorded as the new prompt
  version, only with the maintainer's yes (4 Flash-Lite requests from the
  day's free pool, never on a pilot day): two posts each, read back in the
  journal.
- `pnpm guide:pdf`: the three PDFs, the changed lines read back.

## Acceptance criteria

```gherkin
Scenario: An attempt makes two suggestions with images
  Given Sen's owner has images on and no special offer
  When they tap "Make 2 suggestions"
  Then two suggestions come, one offer post and one of another type
  And one is a day and one a night
  And both get their post image and story image

Scenario: Both suggestions carry the offer
  Given Svarga's owner has set a 15% offer
  When they make an attempt
  Then both suggestions tell the offer and show its badge

Scenario: Never a price
  Given the model writes "Only 350k for 60 minutes." in a caption without an offer
  Then that sentence is removed from the caption
  And "price removed" is recorded for that post

Scenario: The button says two
  Given an attempt was made today
  Then the button reads "Make 2 new suggestions"

Scenario: The guide says two
  Given the screen is in Indonesian
  When the owner opens the guide
  Then "Making your posts" says 2 suggestions, each with a post image and a story image
```

## Known limits

- **Fewer ideas to choose from:** an owner who likes neither suggestion
  spends another attempt; 3 attempts give 6 suggestions a day.
- **Two posts can't hold today's variety rules** (at least 4 types, two
  offer posts): variety now comes across attempts and from "never repeat a
  recent topic".
- **Roadmap 2.15 (`posts/marketing-copy`) is in progress on its own branch
  and rewrites the same plan prompt,** including its own "never a price"
  rule. Whichever lands second merges the prompt by hand: two posts, and
  2.15's rules.
- **The price pattern is best effort:** "350 thousand dong" written out in
  words isn't caught.
- Attempts made before this ships keep six suggestions until the day's reset.

## Out of scope

- More attempts a day, or a different image budget: the limits stay as
  `platform/usage-counters` set them.
- Removing 2.17's text-tile code: harmless with two posts, and still used by
  attempts made before this ships.
