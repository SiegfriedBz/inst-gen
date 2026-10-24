# App scaffold: journal

## Calls made along the way

- 2026-10-24: The secret part of a passphrase (before the last hyphen) must be
  at least 12 characters; the spec's examples were lengthened to pass it.
- 2026-10-24: Vercel's own Deployment Protection stays at its Hobby default,
  so previews also ask for a Vercel login.
- 2026-10-24: The styling decision is numbered 0007: the roadmap reserves 0004
  (image model) and 0006 (Meta access spike).
- 2026-10-24: TypeScript 6.0.3: Next.js 16.4.3 type-checks through the
  TypeScript 6 JS API, which 7.x doesn't ship.
- 2026-10-24: Colours the spec left to the builder: error `#B42318` (light)
  and `#F0948C` (dark); dark owner pill `#173A2F` with text `#7FD9B8`; the
  read-only home field `#EEF0EE` (light) and `#171B19` (dark).
- 2026-10-24: Final review: the spec's field border (`#C9CFCA`, `#39413C`) and
  pill text (`#0F7B5F`) failed the spec's own contrast rule (3:1 and 4.5:1).
  Changed to the nearest passing values, `#858E87` (light) and `#646E67`
  (dark) for the border, and `#0D7259` for the pill text; the spec's table
  was amended to match. A unit test now checks every token pair in both
  modes. Focus rings are solid colours instead of faded ones.
- 2026-10-24: Final review: icon routes are public only when they look like
  Next.js icon routes (`/icon`, `/icon.png`, `/icon1.png`, `/icon/…`), so a
  future `/iconography` page stays behind the gate.
- 2026-10-24: Token names: the field border is `edge` and the pill text is
  `accent-tint-ink`, so Tailwind's `bg-`, `border-` and `text-` utilities
  don't collide.
- 2026-10-24: The passphrase field turns off autocapitalise, autocorrect and
  spellcheck, so a phone keyboard can't change a right passphrase.
- 2026-10-24: Biome 2.6 also formats Markdown; `**/*.md` is excluded so the
  docs keep their wrapping.
- 2026-10-24: `shadcn init` only runs interactively, so `components.json` was
  written by hand. `shadcn add` misread the `utils` alias and installed the
  npm package `cn`; it was removed and `lib/utils.ts` added instead.
- 2026-10-24: A `'use server'` file may export async functions only, so the
  sign-in state type and the 1-second delay live in
  `app/enter/sign-in-state.ts`.

## RED

```
 FAIL  tests/unit/pilot-config.test.ts [ tests/unit/pilot-config.test.ts ]
 Test Files  1 failed (1)
 FAIL  tests/unit/pilot-session.test.ts [ tests/unit/pilot-session.test.ts ]
 Test Files  1 failed (1)
 FAIL  tests/unit/pilot-gate.test.ts [ tests/unit/pilot-gate.test.ts ]
 Test Files  1 failed (1)
 FAIL  tests/unit/sign-in-form.test.tsx [ tests/unit/sign-in-form.test.tsx ]
 Test Files  1 failed (1)
  1 failed
  7 passed (14.2s)
      Tests  7 failed | 47 passed (54)
```

## GREEN

```
      Tests  10 passed (10)
      Tests  9 passed (9)
      Tests  5 passed (5)
      Tests  4 passed (4)
      Tests  28 passed (28)
  8 passed (7.7s)
      Tests  54 passed (54)
  8 passed (8.4s)
```
