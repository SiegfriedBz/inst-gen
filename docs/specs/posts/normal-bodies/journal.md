# Normal bodies in every image: journal

## Calls made along the way

- 2026-11-23: the maintainer showed a Sen image (Thai Massage, story and post
  crop of one image) with impossible bodies, and said more came out over the
  last days. The investigation: no change to `gemini-nano-banana-2.1` (a web
  search found none since its 2026-10-06 launch) nor to the image prompt
  since 2.16 (`images-10`, 2026-11-08); Thai's set-up words ask for a leg or
  arm stretch on a floor mattress with no placement, and the plan wrote "a
  female therapist's hands gently stretching her leg" (Sen's
  `posts-offer.json`); since 2.16 Sen's white uniform meets the guest's cream
  cotton on white sheets; the full image prompt for that set-up is 502 words.
- 2026-11-23: with the maintainer's yes ("Yes, run them"), a test of 12
  images, $0.60, saved in the worktree's `.superpowers/pose-test/` with its
  two scripts: two images per treatment with `images-10`, two with a pose line
  after the cast line, on a Sen Thai leg stretch, a Svarga four hands (from
  above) and a Sen couple (night). The developer's look, zoomed in on every
  body: today's prompt, Thai 2 of 2 failed (the guest's legs vanish under the
  kneeling therapist), couple 1 of 2 failed (both therapists on the man, the
  woman alone), four hands 2 of 2 right; the pose line, 6 of 6 right (normal
  bodies, a clear leg stretch with a hand on the knee and one on the ankle,
  one therapist at the outer side of each couple bed). Side notes: the leg
  stretch shows the guest's nose and mouth under the towel; a four hands seen
  from the foot of the bed shows a cheek in profile.
- 2026-11-23: the maintainer's calls on the proposed rules: normal human
  bodies, never impossible shapes; clearly a professional massage, not a
  touch; some images show a leg stretch; the guest and the therapist wear
  different things, the therapists keeping each spa's look; two therapists
  only for four hands and couples, one on each side.
- 2026-11-23: the developer's calls in the spec: Thai's part becomes the legs
  (leg stretch) or the back (palm press), dealt like any part, so about half
  are stretches; the guest's colour comes from the look's words (light: sage
  green towel, deep indigo clothes; otherwise white and soft cream), said in
  the pose and again in the last rules, never in the plan; the two test
  sentences are kept word for word.
- 2026-11-23: after a fresh reviewer read the draft, the developer's calls:
  the guest's colour avoids every colour family the look names, not only
  white (an owner's "pale green tunic" would have met a sage green towel), by
  word lists and three ordered candidates; the check's image prompts carry no
  colour, as the plan's won't; an image failing any point of the check is
  made twice more before stopping; Thai's part is counted like any part, so a
  seed keeps its treatments, guests, scenes, lights and questions while the
  body parts dealt after Thai may change (a simulation on Sen's offerings:
  in about 18% of the deals with Thai, the other set-up's part changes).
- 2026-11-23: the maintainer refused the colour rule of the first draft
  (Sen's guests in a sage green towel and deep indigo clothes, Svarga's in
  white and cream): "this is a Vietnam based business, keep the clothes white
  linens as they were", "keep these clothes from their respective websites",
  and sent a photo from each site. Sen's: its Thai stretch, the guest on her
  back in loose off-white cotton on white sheets, one knee bent and raised,
  the therapist in white kneeling beside, one hand on the knee and one on the
  foot. Svarga's: a foot massage, the guest face down under a white towel,
  the therapist in its dark uniform seated at the feet. The colour rule is
  dropped, with its word lists: the guests keep white sheets, white towels
  and, for Thai, loose white cotton clothes; the therapists keep their look
  as 2.16 left it. The leg stretch now follows Sen's photo (a hand on the
  knee and one on the foot or ankle; the guest's head on a white pillow); the
  folded towel over the eyes stays, since the app never shows a guest's face.
  The test's Thai images wore indigo, so the check images are the first test
  of the poses in white.
- 2026-11-23: the maintainer answered "WHAT?" to "white sheets and a white
  towel, plus loose white cotton clothes for Thai". The developer then looked
  at the 14 photos the brand read saved on 2026-11-08 (7 a site, in
  `.fixtures-cache/`), not only the two the maintainer sent: guests lie face
  down under a cream or white waffle blanket on white sheets (one beige at
  Svarga), and Sen's Thai guest wears loose light beige cotton, not the
  therapist's white. The spec now takes the photos' words: white sheets, a
  cream or white waffle blanket, light beige Thai clothes; Sen's and
  Svarga's couple photos also show each therapist at her own guest's bed.
- 2026-11-23: the maintainer: "FORGET THIS DISTINCTION! WHY DO YOU KEEP
  MAKING A DISTINCTION FOR THIS KIND OF MASSAGE AT SEN?" The spec now adds no
  clothes, colours or linens at all, for any massage: the pose line names
  positions and hands only, today's words about clothes stay as they are
  (Thai's "in loose cotton clothes" in the set-up line, the therapists' look
  from 2.16), and nothing differs by spa.

- 2026-11-23: the maintainer approved the spec. Building rulings: the deals
  of posts-18 are pinned with Sen's eight site treatments on the tests'
  `withOfferings` (the tests' `senProfile()` holds two, without Thai); the
  pose line opens on "Pose:", as in the 2026-11-23 test.

## RED

- Task 1 (`posts-setup`, `posts-prompt`, `posts-run`): `Tests  22 failed | 179 passed (201)`

## GREEN

- Task 1 (with `posts-fixtures-replay`): `Tests  216 passed (216)`
