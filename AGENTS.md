# AGENTS.md

This file tells code agents how to behave when editing this repo.

## Project intent

This repo contains a **host-led, browser-only, Teams-friendly letter/category game**.

The current product shape is deliberate:

- **single-file first draft**
- **no backend**
- **no accounts**
- **no room codes**
- **no external dependencies**
- **manual host validation**
- **automatic duplicate + alliteration scoring**

Do not casually drag it into framework-land because a shiny abstraction looked lonely.

## Core rules to preserve

1. **Keep the host-led model** unless explicitly told to build multiplayer.
2. **Preserve the scoring rules**:
   - blank = 0
   - wrong letter = 0
   - rejected answer = 0
   - duplicate valid answers in the same category = 0 for all duplicates
   - unique valid answer = 1
   - unique valid alliterative answer = 2
3. **Keep British English** in UI copy and documentation.
4. **Assume a maximum of 8 competitors** unless explicitly changed.
5. **Keep local storage support** or provide a safe migration if storage keys change.

## Change strategy

Until the user asks otherwise:

- keep everything in **`index.html`**
- prefer **small, careful refactors**
- do not introduce a build step
- do not add package tooling
- do not add CDNs or third-party libraries unless there is a very strong reason

## Documentation and versioning rules

For any user-facing or repo-relevant change:

1. **Always update `CHANGELOG.md`** in the same piece of work.
2. **Bump the version** for any meaningful change.
3. Keep changelog entries clear and human-readable.
4. Preserve British English in documentation.

## Response style for future code changes

When providing edits for this repo:

- return **complete file contents**, not partial patches, unless the user explicitly asks for a diff
- explain changes in plain language
- write for a **non-coder**
- keep naming clear and literal

## UX expectations

The UI should feel:

- polished
- legible on a shared Teams screen
- obviously interactive
- easy for the host to operate quickly

Avoid:

- cramped layouts
- tiny text
- gimmicky animations that slow down use
- visual clutter inside the answer grid

## Technical guardrails

### HTML / CSS / JS

- keep code readable and well sectioned
- use semantic HTML where practical
- keep CSS grouped by feature area
- keep JavaScript functions reasonably small
- avoid deeply nested event logic when a clearer helper will do

### State management

- preserve the existing state shape where possible
- if state changes are necessary, migrate old local storage data safely
- do not silently drop live session data

### Scoring logic

- duplicate detection happens **within each category row only**
- duplicates should be calculated **after invalid/rejected answers are excluded**
- alliteration is a **bonus**, not a replacement scoring mode
- duplicate answers never keep the alliteration bonus

### Input tidying

- normalise for scoring
- keep visible text tidy but predictable
- do not over-aggressively “fix” user-entered wording

## Testing checklist

Before handing over changes, check these manually if the feature touches them:

1. Can a new round be spun cleanly?
2. Does the timer still start, pause, and reset?
3. Do answer inputs keep working?
4. Do duplicates still zero out correctly?
5. Does the alliteration bonus still apply correctly?
6. Can the host reject an answer and see duplicates recalculate?
7. Do round totals and overall totals still match?
8. Does refresh persistence still behave sensibly?
9. Does the layout still look sane on a standard desktop browser window?

## Future refactor path

If the repo grows, refactor in this order:

1. split `index.html` into:
   - `index.html`
   - `styles.css`
   - `app.js`
2. move the category bank into a separate data file
3. add import/export utilities
4. only then consider more advanced architecture

## Things not to do unless explicitly asked

- do not build a backend
- do not add authentication
- do not add websockets
- do not turn it into React/Vue/Svelte because you got bored
- do not replace the manual host review model with brittle AI validation
- do not rename the product without being asked

## Product tone

The tool can be playful, but the copy should stay clean and confident.

Think:
- polished internal microsite
- light game-show energy
- not a novelty toy made at 2am after three coffees
