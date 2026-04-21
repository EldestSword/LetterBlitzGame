# Letter Blitz Host Edition

Letter Blitz Host Edition is a host-led, browser-only letter/category game built for Teams screen sharing.

## Version

Current version: **0.3.0**.

## What it includes

- up to **8 competitors**
- **10, 11, or 12 categories** per round
- **60, 75, or 90 second** timer
- host-run answer entry board
- automatic scoring with:
  - blank / wrong letter / rejected = 0
  - duplicate valid answers in the same category row = 0 for all duplicates
  - repeated accepted answer by the same competitor across categories in the same round = 0 for all repeats
  - unique valid answer = 1
  - unique valid alliterative answer = 2
- Rules modal for quick round briefing
- Round history modal to keep the main screen cleaner
- local storage persistence

## Project structure

```text
letter-blitz-host-edition/
├── index.html
├── styles.css
├── app.js
├── data/
│   └── categories.json
├── README.md
├── AGENTS.md
├── CHANGELOG.md
├── GAME-RULES.md
└── ROADMAP.md
```

## Running locally

No build step and no dependencies.

Serve as a static site (recommended) or open with a static-file host:

- `python -m http.server`
- then open `http://localhost:8000`

> Note: category data is loaded from `data/categories.json`, so use a local server rather than `file://` where fetch rules can block JSON loading.

## Category bank

Categories are stored in `data/categories.json` and fetched at runtime.

If the JSON file is missing or unavailable, the app fails gracefully by showing a category-data warning and disabling round generation until data is available.

## Persistence and migration

Session state is saved to local storage under:

- `letter-blitz-host-edition/v0.3.0`

A safe legacy load path is included for:

- `letter-blitz-host-edition/v0.2.0`
- `letter-blitz-host-edition/v0.1.0`

## Product boundaries

- host-led workflow stays in place
- browser-only, no backend
- no frameworks, no build tooling
- British English in UI and docs
