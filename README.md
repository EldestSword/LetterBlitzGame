# Letter Blitz Host Edition

Letter Blitz Host Edition is a host-led, browser-only letter/category game built for Teams screen sharing.

## Version

Current version: **0.4.0**.

## What it includes

- up to **8 competitors**
- **10, 11, or 12 categories** per round
- **60, 75, or 90 second** timer
- setup-first flow with separate **Setup** and **Game** views
- lean live game screen focused on round controls, timer, categories, answer board, scores, and history access
- host-run answer entry board with manual **Reject** control
- automatic scoring with:
  - blank / wrong letter / rejected = 0
  - duplicate valid answers in the same category row = 0 for all duplicates
  - repeated accepted answer by the same competitor across categories in the same round = 0 for all repeats
  - unique valid answer = 1
  - unique valid alliterative answer = 2
- Rules modal for quick round briefing
- Round history modal to keep the main screen cleaner
- local storage persistence with safe migration from older versions

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

## Session flow

1. Open the app on the **Setup** view.
2. Configure competitors, timer length, category count, and friendly letters.
3. Select **Start session** to move to the **Game** view.
4. Run rounds live from the lean game screen.
5. Use **Session settings** to return to setup without wiping the current session.

## Category bank

Categories are stored in `data/categories.json` and fetched at runtime.

If the JSON file is missing or unavailable, the app fails gracefully by showing a category-data warning and disabling round generation until data is available.

## Persistence and migration

Session state is saved to local storage under:

- `letter-blitz-host-edition/v0.4.0`

A safe legacy load path is included for:

- `letter-blitz-host-edition/v0.3.0`
- `letter-blitz-host-edition/v0.2.0`
- `letter-blitz-host-edition/v0.1.0`

## Product boundaries

- host-led workflow stays in place
- browser-only, no backend
- no frameworks, no build tooling
- British English in UI and docs
