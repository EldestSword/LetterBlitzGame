# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.
Versioning is lightweight for now because this is an early internal tool, not a spacecraft.

## [0.3.0] - 2026-04-12

### Changed

- split the single-file build into `index.html`, `styles.css`, `app.js`, and `data/categories.json`
- moved category data into `data/categories.json` and load it at runtime with graceful failure messaging
- trimmed explanatory UI copy to reduce on-screen clutter while keeping host clarity
- added a Rules modal for quick start-of-round briefing
- moved round history into a popup to declutter the main layout
- tightened scoring board density (smaller card/input/meta spacing, slimmer reject control, lighter row depth)
- added a new scoring rule: repeated accepted answers by the same competitor across categories in one round now score 0 for all repeated uses
- added a dedicated repeated-answer board status (`Repeated this round`)
- bumped local storage key to `letter-blitz-host-edition/v0.3.0` with safe legacy load from `v0.2.0` and `v0.1.0`

## [0.2.0] - 2026-04-12

### Changed

- increased competitor support from 5 to 8 across player setup, state-shape enforcement, and add-player limits
- expanded player colour tokens and `PLAYER_COLOURS` mappings so players 6 to 8 have distinct accents
- tightened answer-board layout sizing to better handle 8 player columns while keeping sticky category behaviour and desktop readability
- updated in-app helper copy and documentation to reflect the 8-competitor cap
- bumped the primary local storage key to `v0.2.0` and added a safe legacy load path from `v0.1.0`

## [0.1.0] - 2026-04-11

### Added

- first working single-file draft in `index.html`
- premium-style desktop UI designed for Teams screen sharing
- player setup for up to 5 competitors
- round settings for:
  - 10, 11, or 12 categories
  - 60, 75, or 90 second rounds
  - friendly letters mode
- random letter spinner with anti-repeat logic
- random category generator with anti-repeat bias across the session
- live answer reveal board
- automatic score handling for:
  - unique answers
  - duplicate answers
  - alliterative bonus answers
  - wrong-letter answers
  - host-rejected answers
- overall leaderboard
- round history
- local storage persistence
- session export
- repo documentation:
  - `README.md`
  - `AGENTS.md`
  - `GAME-RULES.md`
  - `ROADMAP.md`

### Notes

- the app is intentionally host-led
- no backend or real-time multiplayer support is included
- category validity remains a host decision
