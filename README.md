# Letter Blitz Host Edition

Letter Blitz Host Edition is a premium-looking, host-led, **Scattergories-style** browser game for Teams calls.

It is built for the practical version of remote play, not the fantasy version where five people magically join a perfectly synced multiplayer app for free and nothing ever breaks.

The tool keeps everything in a single `index.html` file for the first draft, with:

- up to **5 competitors**
- **10, 11, or 12 categories** per round
- **60, 75, or 90 second** timers
- a **random letter spinner**
- a **category generator** with anti-repeat logic
- a **live answer board** for host entry
- automatic scoring for:
  - **unique valid answers = 1 point**
  - **unique alliterative answers = 2 points**
  - **duplicates = 0 points for everyone**
  - **rejected / invalid answers = 0 points**
- a live **round leaderboard**
- an overall **session leaderboard**
- **round history**
- **local storage persistence** so a refresh does not nuke the session

## Inspiration

This project is inspired by letter-and-category party games. It is **not** affiliated with, endorsed by, or connected to any official board game brand.

## Why this version exists

A proper real-time multiplayer build would need a backend, room handling, session sync, and enough complexity to make everyone regret asking for “just a simple HTML game”.

This draft avoids all that.

The host shares the page on Teams, runs the timer, and types answers into the reveal board while everyone watches. The browser handles duplicate detection, alliteration bonuses, and score totals.

## Default setup

The first draft ships with the following defaults:

- **12 categories**
- **75 seconds**
- **friendly letters only** enabled by default

Friendly letters mode skips `Q`, `U`, `V`, `X`, `Y`, and `Z`, because this is supposed to be fun, not a punishment exercise.

## How a round works

1. Set player names in the sidebar.
2. Choose the round length and category count.
3. Click **Spin round**.
4. Start the timer.
5. When time is up, type answers into the reveal board.
6. If an answer is dodgy, click **Reject** for that cell.
7. The board automatically:
   - tidies scoring logic
   - detects duplicates row by row
   - awards the alliteration bonus where appropriate
   - updates round totals live
8. Click **Commit round** to add those scores to the overall leaderboard.
9. Spin the next round.

## Scoring rules

- **Blank answer**: 0
- **Wrong starting letter**: 0
- **Rejected by host**: 0
- **Duplicate valid answer** in the same category: 0 for every matching player
- **Unique valid answer**: 1
- **Unique valid alliterative answer**: 2

### Alliteration rule

The bonus applies when the answer has **two or more meaningful words** and **all meaningful words begin with the round letter**.

Examples for letter **B**:

- `Boris Becker` → **2**
- `Big Ben` → **2**
- `Baked Beans` → **2**
- `Blue Whale` → **2** in this first draft, because both meaningful words begin with **B**
- `The Beatles` → **1** because the leading article is ignored for validation, but only one meaningful word remains

## Project structure

```text
letter-blitz-host-edition/
├── index.html
├── README.md
├── AGENTS.md
├── CHANGELOG.md
├── GAME-RULES.md
├── ROADMAP.md
└── .gitignore
```

## Running locally

No build step. No package manager. No ritual sacrifice.

Open `index.html` in a browser.

If you want it hosted:

- push the repo to GitHub
- enable **GitHub Pages**
- point Pages at the repo root
- share the published URL

## Customising the category bank

The category bank lives directly inside the JavaScript in `index.html`.

Look for:

- `CATEGORY_BANK`
- `FRIENDLY_LETTERS`
- `HARD_LETTERS`

If you want more office-specific rounds later, expand the category list there first before splitting the app into separate files.

## Persistence

The tool saves session state in `localStorage`.

That includes:

- player names
- timer/category settings
- current round
- scores
- history

If you want a clean slate, use **Reset session** in the UI.

## Known limitations

- There is **no backend**.
- There is **no true multiplayer input**.
- Category validity is still a **host judgement call**.
- Duplicate detection is **normalised exact matching**, not fuzzy semantic matching.
- The UI is optimised for desktop screen sharing, not mobile phones.

## Suggested next improvements

- split CSS and JavaScript into separate files
- allow editable/custom category packs
- add CSV export for score history
- add a proper round summary modal
- add optional sounds
- add keyboard shortcuts for faster host entry
- add import/export for category banks

## Accessibility and style notes

- British English is used throughout the UI and docs
- strong colour contrast is used for score states
- sticky headers and the first column help during screen share
- the design aims for “premium internal tool” rather than “PowerPoint in witness protection”

## Version

First draft: **0.1.0**
