# Roadmap

## Near-term

### 1. Split the single-file build
Move from one large `index.html` into:

- `index.html`
- `styles.css`
- `app.js`

Do this only when active iteration starts to get annoying.

### 2. Improve host entry speed
Add:

- smarter keyboard navigation
- optional auto-advance after Enter
- quicker reject shortcuts
- better focus styling for rapid data entry

### 3. Expand category management
Support:

- custom category packs
- office-friendly category packs
- seasonal packs
- import/export for category lists

### 4. Export options
Add richer output:

- CSV round history
- Markdown score summary
- printable round recap

## Mid-term

### 5. Better session tools
Potential additions:

- rename rounds
- undo last commit
- edit a committed round and recalculate totals
- save/load named sessions

### 6. More visual polish
Potential additions:

- optional sound cues
- confetti for round winners
- compact / presentation display modes
- alternate colour themes

### 7. Better duplicate handling
Potential additions:

- optional “close match” warnings
- host prompt when answers are nearly identical
- normalisation rules for articles and punctuation tuning

## Stretch ideas

### 8. Multiplayer version
Only if explicitly wanted later.

This would require:

- a backend
- shared rooms
- synced inputs
- player devices
- reconnection logic
- all the usual nonsense people call “just a small feature”

### 9. Other game modes
Because once one game works, the temptation begins.

Potential follow-ons:

- reverse-score quiz mode
- fake survey / family fortunes style mode
- higher-or-lower mode
- rapid ranking mode
- bluff / truth-or-lie mode

## Design principle

Every new feature should answer this question:

> Does this make the host faster, the round clearer, or the scoring less annoying?

If the answer is no, it is probably ornamental.
