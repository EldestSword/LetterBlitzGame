# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

## [1.0.0] - 2026-09-14

### Changed

- rebuilt the host experience as **Letter Blitz Control**, with a denser premium cockpit designed for the person running the game rather than the Teams audience
- added a separate **Letter Blitz Live** presentation screen at `live.html`, opened directly from Control and intended to be the only window shared in Teams
- replaced the wide all-player/all-category answer table with a **category-by-category Reveal Desk**, keeping every competitor for the selected category visible together
- made the selected round letter and the complete category set persist on screen throughout the round instead of disappearing after the opening reveal
- added Control → Live synchronisation with `BroadcastChannel`, with local-storage updates as a same-origin fallback
- added Live presentation states for waiting, round play, answer reveal and finalised results
- prevented answer spoilers on the Live screen while a round is running; answers only appear once the presentation enters reveal mode
- added keyboard-first answer entry: Enter advances through players and then to the next category; Shift+Enter moves backwards
- carried the existing **Redcap** system into the new Control UI and now mirrors the same random Redcap artwork onto the Live screen
- preserved the existing scoring engine: blanks, wrong letters, Redcaps, duplicates, same-player repeats and alliteration bonuses behave as before
- retained all v0.6.0 timer options: 45, 60, 75, 90 and 120 seconds
- retained the expanded v0.6.0 category bank and existing anti-repeat selection behaviour
- replaced the setup-first page with a compact Setup modal so the host can change session options without leaving the Control screen

### Data safety

- deliberately keeps the existing local-storage key `letter-blitz-host-edition/v0.6.0` so current player names, running totals, history and any live round load in place without a score migration
- creates a one-time `letter-blitz-host-edition/pre-v1.0.0-backup` copy before the v1 UI writes to the current session for additional recovery protection
- does not read or depend on the abandoned prototype `v1.0.0` storage key created by the earlier non-repo redesign

## [0.6.0] - 2026-05-22

### Changed

- expanded round timer options to **45, 60, 75, 90, and 120 seconds** across setup controls and round-length validation
- kept timer persistence safe by retaining legacy local storage support while bumping the primary key to `letter-blitz-host-edition/v0.6.0`
- expanded `data/categories.json` with 150 new everyday, office-friendly categories to reduce repetition bias and improve session variety

## [0.5.0] - 2026-05-15

### Changed

- rebranded host-facing reject wording to **Redcap** across review controls, board legend, and rules text
- added a random full-screen Redcap burst overlay when a host redcaps an answer, including repeat-safe image rotation and missing-asset fail-safe handling
- added a full-screen round-start briefing overlay showing the selected letter, timer, and categories for clearer Teams screen sharing
- bumped local storage key to `letter-blitz-host-edition/v0.5.0` with safe legacy load from `v0.4.0`, `v0.3.0`, `v0.2.0`, and `v0.1.0`

## [0.4.0] - 2026-04-21

### Changed

- introduced a setup-first UX with separate **Setup** and **Game** views
- moved full session setup controls off the live game screen into a dedicated setup screen
- added **Start session** and **Session settings** controls to switch views without wiping active session state
- kept Rules and Round history as modals while further decluttering the live screen
- trimmed live-screen explainer copy so the host view is more operational during play
- renamed UI action text from **Commit round** to **Finalise round**, with committed state shown as **Round finalised**
- made reject controls lighter and answer-row meta spacing tighter to reduce visual bulk while keeping fast host review
- bumped local storage key to `letter-blitz-host-edition/v0.4.0` with safe legacy load from `v0.3.0`, `v0.2.0`, and `v0.1.0`

## [0.3.0] - 2026-04-12

### Changed

- split the single-file build into `index.html`, `styles.css`, `app.js`, and `data/categories.json`
- moved category data into `data/categories.json` and load it at runtime with graceful failure messaging
- trimmed explanatory UI copy to reduce on-screen clutter while keeping host clarity
- added a Rules modal for quick round briefing
- moved round history into a popup to declutter the main layout
- tightened scoring board density
- added same-player repeated-answer detection across categories in one round

## [0.2.0] - 2026-04-12

### Changed

- increased competitor support from 5 to 8
- expanded player colour tokens for players 6 to 8
- tightened answer-board layout sizing

## [0.1.0] - 2026-04-11

### Added

- first working Letter Blitz Host Edition
- browser-only host-led gameplay
- random letter and category rounds
- timer, scoring, leaderboard, history and local-storage persistence
