# Game Rules

## Recommended format

This version is designed for:

- up to **5 competitors**
- **10 to 12 categories**
- **60 to 90 seconds**
- one answer per category, per player

The default setup in the first draft is:

- **12 categories**
- **75 seconds**
- **friendly letters only**

That gives you enough panic to be funny without turning the reveal into clerical work.

## How to run a round

1. Spin a new round to generate:
   - one letter
   - a fresh set of categories
2. Start the timer.
3. Players write their answers privately.
4. During the reveal, the host types each answer into the board.
5. Everyone can see the grid fill in live.
6. If an answer is nonsense, off-category, or otherwise not acceptable, the host clicks **Reject**.
7. The tool calculates points automatically.
8. Commit the round to add those points to the running totals.

## Scoring

### Base scoring

- blank answer = **0**
- wrong starting letter = **0**
- rejected answer = **0**
- unique valid answer = **1**
- duplicate valid answer = **0** for every matching player in that category

## Duplicate rule

Duplicates are checked **within the same category row only**.

If two or more players give the same valid answer for that category:

- none of them score for that answer

Example for category **Fruit**, letter **B**:

- Player 1: `Banana`
- Player 2: `Banana`
- Player 3: `Blueberry`

Scores:

- Player 1 = **0**
- Player 2 = **0**
- Player 3 = **1**

## Alliteration bonus

If an accepted answer has **two or more meaningful words** and **all meaningful words begin with the round letter**, it scores **2 points** instead of 1.

Example for letter **B**:

- `Boris Becker` = **2**
- `Big Ben` = **2**
- `Baked Beans` = **2**

### Important

- the answer still has to be valid for the category
- duplicates still score **0**
- the bonus only applies to **unique** valid answers

So if two players both write `Boris Becker`, both get **0**, not 2.

## Host judgement

The browser can tidy and score text, but it cannot reliably decide whether a human answer genuinely fits the category.

That means the host still decides things like:

- whether `Bourbon` counts as a snack
- whether `Blue Whale` is acceptable in the category shown
- whether a vague answer is too flimsy to allow

That is why the **Reject** button exists.

## Friendly letters mode

Friendly letters mode avoids the letters that tend to produce grim, joyless rounds:

- `Q`
- `U`
- `V`
- `X`
- `Y`
- `Z`

You can turn that off if you want to watch morale collapse in real time.

## Suggested reveal workflow

For speed, reveal row by row:

1. read the category aloud
2. type Player 1 to Player 5 answers across the row
3. reject anything dodgy
4. let the board instantly flag duplicates and bonuses
5. move to the next row

That is faster than jumping around by player.

## Tie handling

The current draft does not include a formal tie-breaker.

If you need one, use a sudden-death category with:

- 1 category
- 1 letter
- 20 to 30 seconds
- fastest valid unique answer wins

## Good category design

Strong categories are:

- broad enough to allow several answers
- specific enough to avoid endless arguments
- easy to read on a shared screen

Examples of good categories:

- `Sports person`
- `Something found in a kitchen`
- `TV programme`
- `Something you'd put on toast`

Examples of categories more likely to start arguments:

- `Thing that feels fancy`
- `Something annoying`
- `A good idea`

Humans can argue about absolutely anything, but there is no need to help them.
