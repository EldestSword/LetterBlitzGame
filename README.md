# Letter Blitz

Letter Blitz is a host-led, browser-only letter/category game built for Teams calls.

## Version

Current version: **1.0.0**.

## Two-screen workflow

Letter Blitz now separates the host controls from the audience presentation.

### Control — `index.html`

Use this privately as the host. It contains:

- player and session setup
- letter/category spin
- 45, 60, 75, 90 or 120 second timer
- persistent category board
- category-by-category answer entry
- automatic scoring
- Redcap controls
- live session standings
- round history and export

### Live — `live.html`

Open it from **Open live screen** in Control and share this window in Teams.

The Live screen has dedicated states for:

- waiting between rounds
- round play with the letter, all categories and countdown kept visible
- answer reveal for the category currently selected in Control
- finalised round results and session standings

Answers are not shown on Live while the timer is running.

## Scoring

- blank = **0**
- wrong starting letter = **0**
- Redcapped by the host = **0**
- duplicate accepted answers in the same category = **0 for all duplicates**
- same competitor repeating an accepted answer across categories in the same round = **0 for every repeated use**
- unique valid answer = **1**
- unique valid alliterative answer = **2**

## Redcap

The existing Redcap artwork remains in `assets/redcap/`.

Redcapping an answer now fires the artwork on both the private Control screen and the audience-facing Live screen.

## Project structure

```text
LetterBlitzGame/
├── index.html          # Host Control
├── styles.css          # Control styling
├── app.js              # Control logic + scoring + persistence
├── live.html           # Audience presentation
├── live.css            # Live presentation styling
├── live.js             # Live rendering + sync
├── assets/
│   └── redcap/
├── data/
│   └── categories.json
├── README.md
├── AGENTS.md
├── CHANGELOG.md
├── GAME-RULES.md
└── ROADMAP.md
```

## Persistence and current scores

**v1 deliberately continues using:**

`letter-blitz-host-edition/v0.6.0`

This is intentional. Existing player names, running totals, round history and any current round therefore load directly when v1 is deployed to the same Netlify site/origin.

Before v1 writes the session, it also makes a one-time backup at:

`letter-blitz-host-edition/pre-v1.0.0-backup`

The abandoned non-repo prototype storage key is not used.

## Running locally

There is no build step and no dependency installation.

Because categories are loaded from `data/categories.json`, serve the folder rather than double-clicking `index.html`:

```bash
python -m http.server 8000
```

Then open:

- Control: `http://localhost:8000/`
- Live: `http://localhost:8000/live.html`

## Product boundaries

- browser-only
- no backend
- no accounts or room codes
- no framework or build tooling
- host decides category validity
- British English throughout
