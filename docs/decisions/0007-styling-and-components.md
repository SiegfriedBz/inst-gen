---
title: "Styling and components"
description: "Tailwind CSS v4 for styling, shadcn/ui components on Radix primitives kept in the repo, Phosphor icons and the Be Vietnam Pro font."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T07:26:42Z }
date: "2026-10-24"
---

# Styling and components

## Context and Problem Statement

Decisions 0001 and 0002 settled the framework and the tooling, but not how
the app is styled. The scaffold (`harness/app-scaffold`, roadmap 0.5) builds
the first two screens, and every later screen builds on the same choice: the
brand panel, the feed preview and editor, the review replies, the usage bar.

Those later screens need accessible dialogs, menus, tabs and toasts that work
on a phone with a thumb and with a screen reader. The app must look like its
own product, not like a component library's demo, and it must be readable in
Vietnamese, Indonesian and English.

How is the app styled, where do its components come from, and which icons and
font does it use?

## Decision Drivers

- One developer working mostly with agents: tools agents know well, little
  custom CSS to keep in step.
- Accessible components (keyboard, focus, screen readers) without writing
  them from scratch.
- A look of its own: tokens and components the repo owns and can restyle.
- Small pages for phones on slow connections: styles compiled at build time,
  no runtime CSS-in-JS.
- Works with Server Components, Biome and Next.js 16.
- A font that renders Vietnamese accents properly.

## Considered Options

Styling and components:

1. Tailwind CSS v4 with shadcn/ui (components copied into the repo, built on
   Radix primitives).
2. CSS Modules with Radix primitives, styled by hand.
3. Tailwind CSS v4 alone, every component written by hand.
4. A full component library with its own styling (Mantine).

Icons: Phosphor, Lucide.

Font: Be Vietnam Pro, Geist, the system font stack.

## Decision Outcome

Chosen: Tailwind CSS v4 with shadcn/ui, Phosphor icons and Be Vietnam Pro,
because together they give owned, accessible components with the least
custom CSS, in a stack agents know well.

- **Styling:** Tailwind CSS v4 through `@tailwindcss/postcss`. Design tokens
  (colours, radius, font) are CSS variables declared once in the global
  stylesheet with `@theme`, with dark values under
  `@media (prefers-color-scheme: dark)`. Components use the tokens, never raw
  colour values.
- **Components:** shadcn/ui, added one at a time with the `shadcn` CLI when a
  screen needs them. They live in `components/ui/`, belong to the repo, and
  are restyled to the app's tokens: they never ship in their default look.
  Their primitives come from Radix (`radix-ui`).
- **Icons:** Phosphor (`@phosphor-icons/react`), the only icon set. shadcn
  components that import Lucide are switched to Phosphor when added, and
  `lucide-react` is not a dependency.
- **Font:** Be Vietnam Pro through `next/font/google`, weights 400 and 500,
  subsets `latin`, `latin-ext` and `vietnamese`. It is self-hosted by Next.js
  at build time, so no request goes to Google from the owner's phone.
- **Biome:** its CSS parser has Tailwind directives turned on, so `biome ci`
  reads the stylesheet.

The scaffold spec sets the first token values and pins the versions.

### Consequences

- Good, because shadcn components are plain files in the repo: they can be
  changed freely, and an upstream change never alters a screen by surprise.
- Good, because Radix handles focus, keyboard and screen-reader behaviour for
  dialogs, menus and tabs.
- Good, because Tailwind compiles to one static stylesheet with only the
  classes used, and nothing runs in the browser to style the page.
- Good, because Be Vietnam Pro was made for Vietnamese, and covers
  Indonesian and English.
- Bad, because copied components don't update themselves: a fix upstream has
  to be pulled in by hand with the CLI.
- Bad, because Tailwind class lists make markup long. Accepted: agents read
  and write them well, and components keep them in one place.
- Bad, because swapping Lucide for Phosphor in each added shadcn component is
  a small manual step.
- Bad, because Biome doesn't sort Tailwind classes the way Prettier's plugin
  does. Accepted: class order doesn't change what a page looks like.

### Confirmation

- `package.json` has `tailwindcss`, `@tailwindcss/postcss`, `radix-ui` and
  `@phosphor-icons/react`, and no `lucide-react`, CSS-in-JS library or other
  component library.
- `components.json` (the shadcn config) exists and points at `components/ui/`.
- No component file contains a raw colour value; colours come from the
  tokens.
- The root layout loads Be Vietnam Pro with the `vietnamese` subset.

## Pros and Cons of the Options

- **Tailwind v4 + shadcn/ui:** owned components, Radix accessibility, build-time
  CSS, the most common Next.js setup today. Long class lists; copied
  components need pulling in by hand.
- **CSS Modules + Radix:** no new styling tool, plain CSS. Every component's
  styles written and kept by hand, more files per component, and agents
  produce less consistent results.
- **Tailwind v4 alone:** one dependency fewer. Dialogs, menus and focus
  handling would be written by hand, which is where accessibility bugs come
  from.
- **Mantine:** complete and accessible out of the box. Its own styling layer
  and look are harder to make the app's own, and it ships more code to the
  phone.
- **Phosphor:** a large set in one consistent style, several weights.
  Not shadcn's default, so added components need their icons swapped.
- **Lucide:** shadcn's default. A narrower set; the look of every shadcn demo.
- **Be Vietnam Pro:** designed for Vietnamese accents, free, open licence.
- **Geist:** clean and common in Next.js apps; the Vietnamese coverage would
  need checking for every weight.
- **System font stack:** no download. Looks different on every phone, and
  older Android phones render Vietnamese accents poorly.

## More Information

Checked on 2026-10-24:

- npm's latest versions: `tailwindcss` and `@tailwindcss/postcss` 4.3.3,
  `shadcn` 4.22.1, `radix-ui` 1.8.1, `@phosphor-icons/react` 2.1.10.
- [shadcn/ui docs](https://ui.shadcn.com/docs): components are added to the
  project's own code with the CLI.
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4): `@theme`
  tokens and the `@tailwindcss/postcss` plugin.
- [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) on Google
  Fonts, with the `vietnamese` subset.

Numbered 0007 because the roadmap already reserves 0004 (image model) and
0006 (Meta access spike).

A new decision replaces this one if the app moves to a component library, or
the commercial app gets its own design system.
