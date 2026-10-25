# Generate images: journal

## Calls made along the way

- 2026-10-25: Task 1. Missing `GOOGLE_IMAGE_API_KEY` is logged once per server
  process with `console.error`, as the pilot config logs its problems.

- 2026-10-25: Task 2. `sharp` pinned at 0.35.5 (already in the lockfile through
  Next.js). The post is cut from the resized pixels, not from the story JPEG,
  so it is encoded once. JPEG sizes on the banded test image say nothing about
  real photos; Task 9 records real sizes.

- 2026-10-25: Task 3. A spent prepaid balance is guessed as a 429, or a 400 or
  403 whose message says billing, prepay, credit or balance. To check the first
  time the balance runs out.

- 2026-10-25: Task 4. The route answers 401 when no owner can be read from the
  session (proxy.ts already turns those away), and 499 with no body when the
  request was closed: nobody reads it.

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

Task 3:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 4:

```
 Test Files  2 failed (2)
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

Task 3:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Task 4:

```
 Test Files  2 passed (2)
      Tests  15 passed (15)
```
