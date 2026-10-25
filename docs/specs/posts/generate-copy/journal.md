# Generate copy: journal

## Calls made along the way

- 2026-10-25: Instagram's limits, checked before any code (plan, Task 1).
  - **Hashtags: 5 per post.** Instagram's @creators account announced on
    2025-12-18 that a post or reel takes up to 5 hashtags, down from 30
    ([Betanews, 2025-12-19](https://betanews.com/2025/12/19/instagram-puts-a-limit-on-hashtag-usage/),
    [Social Media Today](https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/)).
    A tool page quotes the Help Center ("You can use up to 5 tags on a
    post", [help.instagram.com/351460621611097](https://help.instagram.com/351460621611097));
    the Help Center itself couldn't be fetched from here. Meta's developer
    reference still says 30. The spec's 5 stands.
  - **Alt text: no official limit found.** Third-party sources give about
    1,000 characters for images through the API, and 100 to 125 as the
    advice, since some screen readers cut at 125
    ([Can I Play That?](https://caniplaythat.com/2021/09/27/facebook-and-instagram-seemingly-remove-alt-text-character-limitations/),
    [University of South Carolina](https://sc.edu/about/offices_and_divisions/digital-accessibility/toolbox/best_practices/alternative_text/social-media-alt-text/)).
    The spec's 125 is under any cap and matches the advice, so it stands.
- 2026-10-25: Model pick (plan, Task 9). `pnpm eval:posts sen svarga
  --model=gemini-3.8-flash`: both ended `model_timeout` at the 60 s cut-off,
  as Flash did for the brand read. `pnpm eval:posts sen svarga` on
  `gemini-3.5-flash-lite`: 6 posts each, Sen 4.9 s, Svarga 4.5 s, no flags.
  `TEXT_MODELS.posts` stays `gemini-3.5-flash-lite`.
  `posts eval: 0/2 made · prompt posts-1 · model gemini-3.8-flash`
  `posts eval: 2/2 made · prompt posts-1 · model gemini-3.5-flash-lite`
- 2026-10-25: The developer read Sen's and Svarga's `posts-1` batches on
  Flash-Lite and judged at least 4 of 6 "as written" for each, with no
  ungrounded fact; `posts-1` is kept.
- 2026-10-25: Recorded with `pnpm eval:posts sen svarga karsa-spa
  serenity-bali orient-spa --record` (5 Flash-Lite requests, 4.7 to 5.6 s
  each). In this run the model often wrote the caption as one paragraph, so
  18 of 30 posts carry a `firstLine` flag; serenity-bali used the `place`
  scene 3 times and orient-spa had fewer than 2 offers, both recorded in
  `dropped`. Karsa Spa has a post with 2 hashtags: the 3-hashtag floor is a
  prompt rule code doesn't enforce, so the replay test asks for 1 to 5.
  `posts eval: 5/5 made · prompt posts-1 · model gemini-3.5-flash-lite`

## RED

`Tests  6 failed | 1 passed (7)` (posts-fixtures-replay, before the recordings)

## GREEN

`Tests  689 passed (689)` (pnpm check)

`28 passed (10.1s)` (pnpm test:e2e)
