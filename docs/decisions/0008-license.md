---
title: "License"
description: "The code is licensed under the GNU Affero General Public License, version 3 only (AGPL-3.0-only)."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T08:53:30Z }
date: "2026-10-24"
---

# License

## Context and Problem Statement

The repo has no license, so by default nobody but its author may copy, change
or run the code. Shopfront is a hosted service: owners use it in a browser and
never receive the code. The MVP is free and non-commercial (decision 0001), and
the roadmap keeps an optional paid tier for later (phase 5).

Under which license is the code published?

## Decision Drivers

- A hosted app: a license that only applies when the code is distributed would
  let anyone run a changed copy as a competing service and keep the changes.
- The paid tier must stay possible for the author.
- Open source is welcome, if it doesn't make a closed clone easy.
- Every dependency must be compatible with the chosen license.

## Considered Options

1. GNU AGPL-3.0.
2. MIT.
3. No license: all rights reserved.
4. PolyForm Noncommercial 1.0.0.

## Decision Outcome

Chosen option: 1, AGPL-3.0, because it keeps the code open while requiring
anyone who runs a changed copy as a network service to publish their changes.
As the only copyright holder, the author can still offer a paid tier, or
license the code differently later.

- `LICENSE` at the repo root holds the unmodified license text from
  <https://www.gnu.org/licenses/agpl-3.0.txt>.
- `package.json` says `"license": "AGPL-3.0-only"`. "Only" rather than "or
  later": a future AGPL version from the FSF doesn't apply without a new
  decision.
- `package.json` keeps `"private": true`: the app isn't published to npm.
- Contributions are accepted under the same license (inbound = outbound). If
  another person contributes code, relicensing it later needs their consent,
  or a contributor agreement decided before then.

### Consequences

- Good, because a changed copy run as a service has to offer its source to its
  users (section 13), so a closed clone isn't allowed.
- Good, because it is an OSI-approved open-source license that people know.
- Good, because the author, as copyright holder, isn't bound by section 13 and
  can still sell a paid tier or relicense.
- Bad, because some companies avoid AGPL code, which limits reuse and outside
  contributions. Accepted: reuse by others isn't a goal.
- Bad, because outside contributions under the AGPL limit relicensing later,
  unless a contributor agreement is set up first.

### Confirmation

- `LICENSE` exists at the repo root and matches the text published by the FSF.
- `package.json` has `"license": "AGPL-3.0-only"`.
- No dependency has a license incompatible with the AGPL (for example a
  proprietary or non-commercial one). Checked when a dependency is added.

## Pros and Cons of the Options

- **AGPL-3.0:** open source; covers use over a network, which the GPL
  doesn't. Some companies avoid it.
- **MIT:** short and the most reused. Anyone may run a closed, commercial copy
  of the app.
- **All rights reserved:** keeps every option open. The code isn't open
  source, and without a license nobody may even run a copy to try a change.
- **PolyForm Noncommercial:** blocks commercial use by others. Not open source
  (not OSI-approved), less known, and it would block a commercial user even
  if they published their changes.

## More Information

- License text: <https://www.gnu.org/licenses/agpl-3.0.txt>, downloaded on
  2026-10-24 (SHA-256 `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`).
- SPDX identifier: <https://spdx.org/licenses/AGPL-3.0-only.html>.
- `pnpm licenses list --prod` on 2026-10-24: MIT, Apache-2.0, ISC,
  BSD-3-Clause, 0BSD, MPL-2.0 (lightningcss), LGPL-3.0-or-later (libvips,
  through sharp) and CC-BY-4.0 (caniuse-lite data). All are compatible with
  the AGPL.

Numbered 0008 because the roadmap reserves 0004 (image model) and 0006 (Meta
access spike).

A new decision replaces this one if the paid tier needs a different license,
or if outside contributors join and a contributor agreement is needed.
