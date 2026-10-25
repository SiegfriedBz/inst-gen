# Generate images: journal

## Calls made along the way

- 2026-10-25: Task 1. Missing `GOOGLE_IMAGE_API_KEY` is logged once per server
  process with `console.error`, as the pilot config logs its problems.

- 2026-10-25: Task 2. `sharp` pinned at 0.35.5 (already in the lockfile through
  Next.js). The post is cut from the resized pixels, not from the story JPEG,
  so it is encoded once. JPEG sizes on the banded test image say nothing about
  real photos; Task 9 records real sizes.

## RED

Task 1:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2:

```
 Test Files  1 failed (1)
      Tests  no tests
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Task 2:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```
