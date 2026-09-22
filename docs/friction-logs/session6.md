### 23 September 2026, Session 6


Start:

Prompt- 

```text
Stage 3, next view: Drink Soon.

Read CLAUDE.md, docs/temporal-resolution.md, the Stage 3 section of
docs/build-plan.md, and the isDrinkSoon export in packages/cellar-core.

Do not write code yet. Propose, then stop for my approval:

1. What the view lists. Bottles that are DRINKING as of the current asOf date
   and whose window closes within the horizon. Propose the row: which wine,
   which bottle, how long is left, and the window's provenance (which tier
   and which assessment it came from). The provenance is the point; a list
   that just says "drink this" is any inventory app.

2. Ordering and grouping. Propose whether rows group by wine or list per
   bottle, given a wine may have several bottles closing on the same date.

3. The horizon. isDrinkSoon takes withinMonths. Using the seed data, Drink
   Soon is empty at 1999-06-01, 2019-12-31 and 2023-03-15, and returns 10 at
   2025-06-01 and 23 at 2026-09-18 with a 12 month horizon. Propose whether
   the horizon should be fixed at 12 months or user-adjustable, and say what
   the data suggests.

4. The empty state. It is empty at three of the five verification dates, so
   it is a normal condition, not an error. Propose wording that says why
   nothing is listed, distinguishing "nothing closing soon" from "nothing in
   the cellar at all."

This view moves with the existing asOf control. Do not add a second date
input. @cellar/core stays pure.

Verification, once built, with a 12 month horizon:

  1999-06-01   0 of 4 drinking
  2019-12-31   0 of 39 drinking
  2023-03-15   0 of 122 drinking
  2025-06-01   10 of 147 drinking
  2026-09-18   23 of 166 drinking

As before: you cannot see the rendered view, so do not report it verified.
Give me the dates to type and what I should see, and I will confirm. Do not
adjust these numbers to match the code; if they disagree, report and stop.

Standing rules: no git commands that change the repo, write the commit
message and tell me what to stage. Report anything the documentation does not
cover rather than working around it silently. Windows and PowerShell.
```