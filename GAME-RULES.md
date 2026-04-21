# Game Rules

## Round flow

1. Spin a round to generate one letter and a category set.
2. Start the timer.
3. Players answer privately.
4. During reveal, the host types answers into the board.
5. Reject any answer that should not count.
6. Commit the round to add totals to the session leaderboard.

## Core scoring

- Blank answer: **0**
- Wrong starting letter: **0**
- Rejected answer: **0**
- Unique valid answer: **1**
- Unique valid alliterative answer: **2**

## Duplicate rule (across players, same category)

Duplicates are checked within each category row.

If two or more competitors give the same valid answer in that row, all matching cells score **0**.

## Repeated-answer rule (same player, across categories)

Within one round, if the same competitor uses the same accepted answer in more than one category, every repeated use of that answer in that round scores **0**.

Example (letter **L**):

- Drink: `Lemonade`
- Something nice on a hot day: `Lemonade`

Result: both score **0** for that competitor.

## How duplicate and repeated checks differ

- **Duplicate rule** compares players against each other in one category row.
- **Repeated-answer rule** compares one player against their own answers across category rows.

Both checks use normalised scoring text and are recalculated live while editing.

## Alliteration interaction

Alliteration only awards 2 points when an answer is:

- valid,
- unique within its category row,
- and not repeated by the same player elsewhere in the same round.

If an answer is duplicate or repeated, it does not keep the alliteration bonus.

## Friendly letters mode

Friendly letters mode skips: `Q`, `U`, `V`, `X`, `Y`, `Z`.
