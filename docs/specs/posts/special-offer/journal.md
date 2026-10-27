# Special offer: journal

## Calls made along the way

- 2026-10-27: the spec's example "Sunday 26 October" is a Monday in 2026; the
  plan and its tests use Sunday 25 October, "until Tue 27 Oct".
- 2026-10-27: an `offer` flag needs words on the post card, which the plan
  left out: `posts.flags.offer`, "Check the offer in this text before
  posting: {text}.", and `offer` joins the flags shown.

## RED

Task 1, the offer module (`posts-offer`):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, code's checks (`posts-checks`, `posts-edit`):

```
 Test Files  2 failed (2)
      Tests  11 failed | 46 passed (57)
```

Task 3, the prompt, the request and the run (`posts-prompt`, `posts-run`,
`posts-route`):

```
 Test Files  3 failed (3)
      Tests  8 failed | 25 passed (33)
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  25 passed (25)
```

Task 2:

```
 Test Files  3 passed (3)
      Tests  61 passed (61)
```

Task 3, with the recorded plans replayed:

```
 Test Files  4 passed (4)
      Tests  40 passed (40)
```
