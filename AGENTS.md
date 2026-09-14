# AGENTS.md

This file tells code agents how to behave when editing this repo.

## Project intent

Letter Blitz is a **host-led, browser-only, Teams-friendly letter/category game** with two distinct surfaces:

- `index.html` — private **Control** screen for the host
- `live.html` — audience **Live** presentation screen

The current product shape is deliberate:

- static HTML/CSS/JS
- no backend
- no accounts
- no room codes
- no external dependencies
- manual host validation
- automatic duplicate + repeated-answer + alliteration scoring

Do not turn it into framework-land because a dependency looked lonely.

## Core rules to preserve

1. Keep the host-led model unless explicitly asked for multiplayer.
2. Preserve scoring:
   - blank = 0
   - wrong letter = 0
   - Redcapped = 0
   - duplicate accepted answers in the same category = 0 for all duplicates
   - same-player repeated accepted answer across categories in one round = 0 for all repeats
   - unique valid answer = 1
   - unique valid alliterative answer = 2
3. Keep British English.
4. Maximum 8 competitors unless explicitly changed.
5. Never silently drop current scores, history or a live round.
6. The Live screen must not expose answers while a timed round is in progress.
7. Redcap artwork in `assets/redcap/` is part of the product and must not be discarded during redesigns.

## Data safety

v1 deliberately continues to use:

`letter-blitz-host-edition/v0.6.0`

Do not change this key casually. It is what allows the current production session to survive the v1 UI overhaul.

A one-time pre-v1 backup is also written to:

`letter-blitz-host-edition/pre-v1.0.0-backup`

If a future state-shape change is genuinely required, add an explicit safe migration and document it.

## Change strategy

Keep the static structure:

- `index.html`
- `styles.css`
- `app.js`
- `live.html`
- `live.css`
- `live.js`
- `data/categories.json`
- `assets/redcap/`

Avoid build steps, package tooling, CDNs or third-party libraries without a compelling reason.

## Control UX

Control is allowed to be information-dense, but it should remain fast and legible.

Prefer:

- category-by-category judging
- obvious keyboard flow
- persistent round context
- compact standings
- destructive actions behind confirmation

Avoid resurrecting the old wide spreadsheet-style scoring grid.

## Live UX

Live is an audience surface, not an admin screen.

It should:

- read clearly through Teams screen sharing
- keep the round letter and categories visible during play
- keep answers hidden during play
- follow Control during answer reveal
- show Redcap moments and results cleanly

Do not add setup controls, text inputs or host-only diagnostics to Live.

## Documentation and versioning

For meaningful user-facing changes:

1. update `CHANGELOG.md`
2. bump the documented app version
3. keep documentation in British English
4. explain any persistence/storage change explicitly
