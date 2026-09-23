### 23 September 2026, Session 6

#### Stage 3: Drink Soon

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to build: a view listing bottles whose drinking window
closes within twelve months, with the provenance of each window on screen.
Outcome: built and verified at all eight dates, including the three empty
states. Cellar Health moved onto a shared `CellarProvider`.
Elapsed: from 07:18 am. Prompt 2's start and end were not recorded.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 07:18 to 07:24 am | Prompt 1: measure the data, propose, stop | 3m 59s |
| 07:26 to 07:50 am | Prompt 2: approved with one change; build it | 10m 51s |
| after the build | Stale dev-server cache, then verification in the browser | |

#### What the view shows

Twenty-three bottles across twelve wines closing within twelve months, as of
23 September 2026. Every row carries the window's provenance: the tier, the
source, the date of the assessment, and how many accepted claims that wine
has.

The provenance mix is the part worth looking at. Six rows resolve from a
personal assessment and six from a producer assessment. No critic assessment
resolves anywhere. The authority rule from ADR 0006 is not a hypothetical
tiebreak sitting in a spec; it is deciding every row on the screen.

The footnote does useful work too: "Windows are stated in years, so the
horizon moves a year at a time." That turns the quantization finding into
something a reader understands rather than something that looks like a
rounding bug.

#### The finding: a day-one rule killed a UI control weeks later

`isDrinkSoon` takes a `withinMonths` parameter, so the obvious design is a
horizon control. Measuring the data killed it.

Every one of the 161 accepted assessments in the seed data is year-quantized,
because the normalization rule in `docs/temporal-resolution.md` turns a window
given as a year into 1 January to 31 December. Not most of them. All 161. So
closing dates exist on one day per year, and the count is a step function:

```
date            1mo   3mo   6mo  12mo  18mo  24mo  36mo  60mo
2023-03-15        0     0     0     0     0     9    33    59
2025-06-01        0     0     0    10    10    30    63    77
2026-09-18        0     0    23    23    49    49    67   106
```

At today's date the answer is 23 for every horizon from four months to
fourteen. A slider would be flat across most of its travel, which teaches the
reader that the number is arbitrary.

The normalization rule was written on day one for an entirely different
reason: avoiding off-by-one-year bugs in the state machine. Weeks later it
silently determined that a control several layers up should not exist.
Neither document connects them, and no amount of reading would have surfaced
it. Fifteen minutes of measuring the distribution did.

This is the clearest answer so far to the spec-first question. Specifications
do not only prevent errors. They reach forward and constrain decisions nobody
anticipated making.

**The consequence left in place.** A 12-month horizon means exactly "closes
this calendar year", since `asOf` plus twelve months always lands in the next
year but short of its 31 December. Except on 31 December itself, where it
reaches the following one and the view takes in two years at once.
2019-12-31 is one of the five verification dates and sits precisely on that
edge, and the count there is 0 either way, so the edge is real but invisible
in the table that would have caught it. Quantizing the horizon to whole years
would remove it, and would be solving a cosmetic problem with a model change.
Recorded, asserted in the tests, not worked around.

#### Two filenames differing only in case

`DrinkSoon.tsx` for the component and `drinkSoon.ts` for the logic beside it,
following the repo's existing convention of PascalCase components and
camelCase modules. On Windows those are the same filename.

```
src/App.tsx(7,9): error TS2724: '"./DrinkSoon"' has no exported member named
  'DrinkSoon'. Did you mean 'DrinkSoonRow'?
src/App.tsx(7,25): error TS1149: File name '.../src/DrinkSoon.ts' differs from
  already included file name '.../src/drinkSoon.ts' only in casing.
```

The first error is the confusing one and the second is the cause. Read in
order, the first sends you looking for a missing export that is right there in
the file you meant. `forceConsistentCasingInFileNames` was already on, which
is the only reason this surfaced at authoring time rather than as a CI failure
on Linux, where the two names are different files and the import would have
silently resolved to the wrong one.

Renamed to `drinkSoonRows.ts`. The development environment here is Windows and
the deployment target is not, so a naming convention that is safe on a
case-sensitive filesystem is not automatically safe on the machine the code is
written on.

**The tail nobody wrote down.** The rename fixed the code, and the browser
then showed this:

```text
Uncaught error: The requested module '/src/DrinkSoon.ts?t=1790174138891' does
not provide an export named 'DrinkSoon'
```

That file no longer exists on disk. The Vite dev server was holding the
pre-rename module graph, on the filesystem where the rename was invisible to
it. `Remove-Item -Recurse -Force app\node_modules\.vite`, rebuild, hard
refresh. Ten seconds once you know, and genuinely misleading if you do not,
because the error names a file you cannot find and an export that is plainly
present in the file you meant.

- *Would have helped:* a dev-server error that says the module it is
  describing is not on disk.

#### What worked

- **It measured before proposing.** The step-function table came out of
  probing the actual dataset, not from reasoning about what a horizon control
  should feel like.
- **It corrected its own recorded table before I could check it.** Two rows of
  the 2026-09-18 ordering had been transcribed from grouping order rather than
  from the approved sort key. The code was right; the message was wrong, and
  it said so.
- **It corrected two wordings for claiming more than the data licenses.** "The
  first bottle was acquired" became "the ledger begins", because six bottles
  share that date. "Closes at the end of 2024" became "closes in 2024",
  because a year-level window does not license the end-of-year claim.
- **It changed a test, not the data, when the two disagreed.** It had written
  a test expecting one bottle at the earliest acquisition. The test failed at
  six. It fixed the expectation, because six was correct.
- **It flagged rather than decided.** No format or location column, because
  every bottle in the dataset is 750ml with no location, and a column that
  reads the same twelve times is decoration. No Studio deep link, because the
  app has no Studio URL and inventing a URL shape would be guessing.

#### My decisions this session

- **Rejected day-level precision** on time remaining. "About 3 months left"
  rather than "3 months, 13 days left", because nobody authored 31 December
  2026 and reporting days implies a resolution the claim does not have.
- **Approved the shared `CellarProvider`** rather than a second `useQuery`,
  since Missed Opportunities is a third consumer in this same stage and
  structure beats an unverified assumption about whether the App SDK dedupes
  identical subscriptions.

#### Verification

All eight dates confirmed in the browser: the five standard dates plus
1996-05-17, 1996-05-18 and 1997-01-01, which are the only ones exercising the
"nothing in the cellar" and "nothing in a drinking window" empty states. Row
order, bottle counts and provenance lines at 2025-06-01 and 2026-09-18 match
the recorded tables exactly.

Cellar Health read identically at every date after the provider refactor,
which is what proves the refactor did not change behaviour.

#### Transcripts

Full prompts and outputs, unedited.

##### Prompt 1: measure and propose (07:18 to 07:24 am)

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

##### Prompt 1 output

```text
Bash(node -e "const fs=require('fs');const d=fs.readFileSync('C:/Users/kenal/Cellar/sample_data/cellar.ndjson','utf8').split('\n').filter(Boolean).map(JSON.parse).fi…)
  ⎿  formats { '750ml': 542 }
     locations { '(none)': 542 }

  Read 1 file (ctrl+o to expand)

● Read: CLAUDE.md, docs/temporal-resolution.md, docs/build-plan.md Stage 3, packages/cellar-core/src/state.ts (isDrinkSoon), plus types.ts, cellar.ts, queries.ts, and the existing App.tsx / CellarHealth.tsx / AsOfControl.tsx / dates.ts.

  I also ran two read-only probes against sample_data/cellar.ndjson through the built @cellar/core (scratchpad only, nothing written to the repo). My counts agree with your table exactly — 0/4, 0/39, 0/122, 10/147, 23/166. Nothing to report as a disagreement. Three facts from those probes drive most of what
  follows.

  ---
  Findings that shape the design

  1. Every accepted window bound is year-quantized. All 161 accepted assessments have drinkFrom = 01-01 and drinkUntil = 12-31. Not most — all 161. That is the normalization rule in temporal-resolution.md working as designed, but it means closing dates land on at most one date per year.

  2. The window is a property of the wine, not the bottle. resolvedWindow(cellar, wineId, asOf) takes a wine. So every in-cellar bottle of a wine shares one window, one closing date, and one provenance at a given asOf. Confirmed in the data:

  2026-09-18, 12mo:  23 bottles across 12 wines   (5x, 4x, 3x, 2x, 2x, then seven 1x)
  2025-06-01, 12mo:  10 bottles across  4 wines   (5x, 2x, 2x, 1x)

  3. Bottles carry no distinguishing detail in this dataset. All 542 are 750ml; zero have a location.

  ---
  1. What the view lists

  Bottles in the cellar as of asOf whose state is DRINKING and for which isDrinkSoon(result, asOf, 12) is true. Same scan shape as CellarHealth — bottleState per bottle, no new predicate, no change to @cellar/core.

  The row is a wine, not a bottle (argued in §2), carrying four things:

  ┌────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┐
  │    Part    │                                             Content                                              │                         Source                          │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ Wine       │ wineDisplayName(wine) — "2024 Farm on Golden Hill Rose"                                          │ @cellar/core                                            │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ Bottles    │ 5 bottles                                                                                        │ count of drink-soon bottles for that wine               │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ Time left  │ through 2026 — 3 months, 13 days left                                                            │ window.drinkUntil, calendarDelta in app/src/dates.ts    │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ Provenance │ Personal · me · assessed 5 April 2025 · 2 accepted claims visible, this is the one that resolves │ window.sourceType, sourceName, assessedAt, visibleCount │
  └────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘

  Three deliberate choices in there:

  - "through 2026", not "through 31 December 2026". CLAUDE.md says store dates, display years, and the stored 2026-12-31 is an artifact of normalization — nobody wrote that date. But "through 2026" alone can't tell you whether that's three months or twelve, which is the entire question this view answers.
  So: the year as the claim, the exact remaining time as the measurement. The word through is also carrying the inclusivity — a bottle is DRINKING through drinkUntil itself, and I would rather that live in a word than in a +1 in the day count that a future reader has to re-derive.
  - visibleCount is the provenance payload. Where it is 1 the row reads "the only accepted claim". Where it is 2 or 3, the sentence says this window beat others — which is the resolution rule made visible. In the 2026-09-18 set, visibleCount runs 1 to 3 and tiers are personal ×16, producer ×7; no critic,
  merchant or other resolves. That mix is worth seeing.
  - No format or location column. It would read 750ml twelve times and blank twelve times. I'd rather leave it out and add it when the data earns it than ship a column that is decoration. Flagging it rather than deciding silently.

  What I am not proposing: a Studio deep link on the assessment. app/src/sanity.ts has a project id and dataset but no Studio URL, and I'm not going to invent a URL shape. window.assessmentId goes into a title attribute so it's inspectable, and the link waits until there's a deployed Studio host to point
  at.

  ---
  2. Ordering and grouping

  Group by wine. Per-bottle rows would print the identical provenance sentence five consecutive times for the Golden Hill Rose, because — by construction, not by coincidence — those five bottles resolve the same window. A view whose stated point is provenance should not repeat the same provenance as if it
  were five independent facts. And the bottle-level detail that would justify separate rows (format, location) is uniform-or-absent in this dataset.

  The count is still computed per bottle. A wine's other bottles may be CONSUMED or NOT_YET_OWNED on the date; only the drink-soon ones are counted, so the number moves correctly as asOf moves.

  Ordering: drinkUntil ascending, then bottle count descending, then display name ascending, then wineId ascending.

  The tail of that key is not ceremony. Because of finding 1, at 2026-09-18 all twelve rows share drinkUntil of 2026-12-31 — sorting by date alone leaves the whole list in Map iteration order. The secondary key does all the visible work, and "5 bottles closing" ranking above "1 bottle closing" is the right
  urgency. wineId last makes the order total, for the same reason _id makes the assessment comparator total in ADR 0006.

  ---
  3. The horizon

  Fixed at 12 months. Not user-adjustable, not in this stage.

  The data is unusually clear here. Because every drinkUntil is 31 December, the count is a step function with at most one step per year:

  date            1mo   3mo   6mo  12mo  18mo  24mo  36mo  60mo
  1999-06-01        0     0     0     0     0     0     0     0
  2019-12-31        0     0     0     0     0     0     0     0
  2023-03-15        0     0     0     0     0     9    33    59
  2025-06-01        0     0     0    10    10    30    63    77
  2026-09-18        0     0    23    23    49    49    67   106

  At 2026-09-18 a control would sit flat from 4 months to 15, then jump. Half its travel changes nothing. A slider that does nothing across most of its range teaches the reader that the number is arbitrary, which is the opposite of what this view is arguing.

  There's a second reason: a horizon control is date-shaped, and you've asked for exactly one date control. Moving asOf forward six months with a fixed horizon and shortening the horizon by six months produce nearly the same list by different logic, and two controls that look like they do the same thing
  invite the reader to conflate them on camera.

  One consequence worth stating in the view, and worth a friction-log line. With year-quantized windows, a 12-month horizon means precisely "closes this calendar year" — asOf + 12 months always lands in the next year but before its 31 December. Except on 31 December itself, where asOf + 12 months is the
  following 31 December and the view picks up two years at once. That's a genuine one-day discontinuity, it comes from the interaction of the normalization rule with a month-based horizon, and neither document anticipates it. I propose leaving it — the honest description of what the view shows is "closing
  this year", and quantizing the horizon to whole years to remove the edge would be solving a cosmetic problem with a model change. Recording it, not working around it.

  The constant lives in the app as a named export, not in @cellar/core, so the threshold stays out of the model exactly as state.ts intends. Changing it is one line. If it ever does become adjustable, it should be a three-item menu (6 / 12 / 24), not a slider.

  ---
  4. The empty state

  Three distinct conditions, distinguishable from the same scan, each stated as a fact rather than an absence. The third is the one that actually fires at your verification dates, and it can name the nearest closing date, which turns an empty list into information:

  (a) Nothing in the cellar. inCellar count is 0.

  ▎ Nothing in the cellar on this date.
  ▎ The first bottle was acquired 18 May 1996.

  (b) Bottles in the cellar, none in a drinking window. inCellar > 0, DRINKING = 0.

  ▎ No bottle is in its drinking window on this date.
  ▎ 12 in the cellar — 9 on hold, 3 with no accepted assessment.

  (c) Bottles drinking, none closing within the horizon. The real case.

  ▎ Nothing closing in the next 12 months.
  ▎ 122 bottles are in their drinking window. The earliest closes at the end of 2024, 1 year 9 months away.

  The distinction (b) asks for is between "the cellar is empty" and "the cellar is full and nothing is urgent" — and (c) is emphatically the good outcome. The wording should not read like a failure; a cellar where nothing is closing soon is a cellar in good shape.

  ---
  Structural question I want your call on

  DrinkSoon needs the same Cellar that CellarHealth builds. Two options:

  - Recommended: extract a CellarProvider / useCellar() into the app, sitting inside the existing Suspense boundary so the masthead and AsOfControl stay outside it as they are now. One query, one buildCellar. CellarHealth changes mechanically — its useQuery and first useMemo become useCellar(), and its
  second memo is untouched. The argument is Stage 3's own scope: Missed Opportunities is a third consumer of the same index in this same stage, and that component is expensive.
  - Alternative: DrinkSoon calls useQuery itself and leaves CellarHealth alone. Whether the App SDK dedupes two identical useQuery subscriptions is the kind of thing CLAUDE.md tells me not to assume, and I haven't verified it. Worst case is one extra fetch and a second ~6ms index — small, but built on an
  assumption rather than on structure.

  I'll take the provider unless you'd rather not touch CellarHealth this stage.

  ---
  Verification, once built

  You type these into the date field. 12-month horizon throughout. I cannot see the rendered view, so I will not call any of this verified — these are the numbers to confirm.

  ┌────────────────┬──────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Type this date │     Drink Soon shows     │                                           Also visible                                            │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1999-06-01     │ Empty, case (c)          │ 4 bottles in cellar, all 4 drinking; "earliest closes at the end of 2012, 13 years 6 months away" │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2019-12-31     │ Empty, case (c)          │ 39 of 124 drinking; "earliest closes at the end of 2026, 7 years away"                            │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2023-03-15     │ Empty, case (c)          │ 122 of 198 drinking; "earliest closes at the end of 2024, 1 year 9 months away"                   │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2025-06-01     │ 10 bottles, 4 wine rows  │ 147 of 226 drinking                                                                               │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2026-09-18     │ 23 bottles, 12 wine rows │ 166 of 248 drinking                                                                               │
  └────────────────┴──────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘

  The two non-empty dates in full, in the proposed sort order:

  2025-06-01 — all four close at the end of 2025, 6 months, 30 days left:
  5 bottles  2022 Farm on Golden Hill Chardonnay   Personal · me · 26 Apr 2025 · 3 claims visible
  2 bottles  2019 Paradis Vineyards Pinot Noir     Personal · me · 17 Aug 2022 · 3 claims visible
  2 bottles  2021 Vitis Ridge Rose of Pinot Noir   Producer · Vitis Ridge · 12 Jun 2022 · 1 claim
  1 bottle   2021 Paradis Vineyards Pinot Gris     Personal · me · 4 Mar 2024 · 3 claims visible

  2026-09-18 — all twelve close at the end of 2026, 3 months, 13 days left:
  5 bottles  2024 Farm on Golden Hill Rose         Personal · me · 5 Apr 2025 · 2 claims
  4 bottles  2024 Paradis Vineyards Marechal Foch  Personal · me · 5 Dec 2025 · 2 claims
  3 bottles  2014 Brooks Riesling                  Personal · me · 12 Sep 2020 · 3 claims
  2 bottles  2013 Brooks Pinot Noir                Personal · me · 13 Nov 2018 · 2 claims
  2 bottles  2021 Vitis Ridge Pinot Noir           Producer · Vitis Ridge · 12 May 2023 · 2 claims
  1 bottle   2019 Lodi (assorted) Zinfandel        Personal · me · 5 Mar 2025 · 2 claims
  1 bottle   2021 Paradis Vineyards Pinot Noir     Producer · Paradis Vineyards · 12 Jul 2023 · 1 claim
  1 bottle   2021 St. Josef's Pinot Noir           Producer · St. Josef's · 12 Jun 2023 · 2 claims
  1 bottle   2022 Vitis Ridge Marechal Foch        Producer · Vitis Ridge · 12 Apr 2023 · 1 claim
  1 bottle   2022 Vitis Ridge Pinot Gris           Personal · me · 2 Jun 2025 · 2 claims
  1 bottle   2022 Vitis Ridge Rose of Pinot Noir   Producer · Vitis Ridge · 12 May 2023 · 2 claims
  1 bottle   2021 Vitis Ridge Pinot Gris           Producer · Vitis Ridge · 12 Apr 2022 · 1 claim

  One caveat on those two tables: they come from the NDJSON fixture, which has no _createdAt (the Content Lake assigns it at import), so tie-breaks there fall through to _id. The seed data contains no same-tier same-day ties, so this cannot change any row — but the live dataset is the real check, which is
  what you'll be typing into.

  Nothing written to the repo. Awaiting your approval on the four questions and the provider call before I write any code.

✻ Cogitated for 3m 59s
```

##### Prompt 2: approval with one change

```text
Approved, with one change.

1. Time left: drop day-level precision. "through 2026, about 3 months left".
   Nobody authored 31 December 2026; it is a normalization artifact, and
   reporting days implies a resolution the claim does not have. Keep
   "through" carrying the inclusivity, as you argue.

2. Group by wine: approved, with your sort key including wineId last.

3. Horizon fixed at 12 months: approved. The step-function table is
   convincing. Leave the 31 December discontinuity in place and record it in
   the friction log as you propose; note that 2019-12-31 is one of the
   verification dates and sits exactly on it, though the count is 0 there
   either way.

4. Empty states: approved, all three, including naming the nearest closing
   date in case (c). Your point that (c) is a good outcome should be audible
   in the wording.

5. CellarProvider / useCellar: approved. Missed Opportunities is the third
   consumer in this same stage, so structure now beats an unverified
   assumption about useQuery deduping.

6. No format or location column: approved, and thank you for flagging rather
   than deciding silently. Revisit when the data earns it.

7. No Studio deep link: approved. Do not invent a URL shape.

Your two full tables are recorded. I will check the row order, the bottle
counts, and the provenance lines at 2025-06-01 and 2026-09-18 against them.

Standing rules: no git commands that change the repo; write the commit
message and tell me what to stage.
```

##### Prompt 2 output

```text
Bash(git log -2 --format='%B%n---' 5c562af)
  ⎿  Stage 3: asOf control, cellar state at any date

     Typed date field plus slider over the ledger's full span. Counts verified
     … +15 lines (ctrl+o to expand)

● Built and checked. Two corrections to report before the verification steps.

  Correction: my recorded 2026-09-18 table was mis-ordered

  The last two rows of the table you recorded were wrong — I transcribed them from the probe's grouping order rather than from the sort key you approved. 2021 Vitis Ridge Pinot Gris belongs at position 9, not 12. Counts and provenance are unchanged; only the order was wrong, and it was wrong in my message,
  not in the code. The corrected order is in the verification table below and asserted in the test.
  
  Correction: two wordings

  - The ledger begins 18 May 1996. not "The first bottle was acquired…" — six bottles share the earliest acquisition date, so the singular was a small false statement. I'd written the test expecting 1; it failed at 6, which is the data being right.
  - the earliest closes in 2024 not "at the end of 2024". "The end of" is an extra claim the year-level convention doesn't license — a hypothetical drinkUntil of 2024-06-30 would display identically and the phrase would be six months wrong. The rows still say "through 2026", which is the convention as
  written.

  One finding worth your attention

  drinkSoon.ts beside DrinkSoon.tsx differ only in case, so on Windows import {DrinkSoon} from './DrinkSoon' resolved to the logic file. tsc caught it as TS1149 — on Linux those are two different files and the import would have silently resolved to the other one. Renamed to drinkSoonRows.ts.
  forceConsistentCasingInFileNames was already on, which is the only reason it surfaced at authoring time. In the friction log, along with the horizon quantization.

  What changed

  ┌────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
  │                        File                        │                                                                          │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ app/src/CellarProvider.tsx                         │ new — one query, one buildCellar, shared                                 │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ app/src/drinkSoonRows.ts                           │ new — pure row building, no React, asOf a parameter                      │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ app/src/DrinkSoon.tsx                              │ new — rendering only                                                     │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ app/test/drinkSoonRows.test.mts                    │ new — 15 tests                                                           │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ app/src/CellarHealth.tsx                           │ useQuery + index memo → useCellar(); tally memo untouched                │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ app/src/App.tsx, App.css, dates.ts, dates.test.mts │ wiring, styles, formatShortDate / describeApproxSpan / describeRemaining │
  ├────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ docs/friction-logs/friction-log.md                 │ two entries                                                              │
  └────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘

  @cellar/core is untouched — 390/390 still pass. App: 41/41. tsc, eslint, prettier --check clean.

  CHANGELOG.md not updated: Stage 3 isn't complete, Missed Opportunities remains.

  Verification — dates to type, and what you should see

  I cannot see the rendered view. None of this is verified until you confirm it.

  ┌────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │    Type    │                                                                   Drink Soon shows                                                                   │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1999-06-01 │ Nothing needs drinking in the next 12 months. / 4 bottles in their drinking window, and the earliest closes in 2012 — about 13 years, 6 months away. │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2019-12-31 │ same head / 39 bottles… earliest closes in 2026 — about 7 years away.                                                                                │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2023-03-15 │ same head / 122 bottles… earliest closes in 2024 — about 1 year, 9 months away.                                                                      │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2025-06-01 │ 10 bottles closing within 12 months / across 4 wines, of 147 in their drinking window                                                                │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2026-09-18 │ 23 bottles closing within 12 months / across 12 wines, of 166 in their drinking window                                                               │
  └────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Three extra dates, one for each empty state, since the five above only exercise one of them:

  ┌────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │    Type    │                                                                                                              │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1996-05-17 │ Nothing in the cellar on this date. / The ledger begins 18 May 1996.                                         │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1996-05-18 │ No bottle is in its drinking window on this date. / 6 bottles in the cellar — 6 with no accepted assessment. │
  ├────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1997-01-01 │ same head / 5 bottles in the cellar — 5 on hold.                                                             │
  └────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  2025-06-01 — every row through 2025 / about 6 months left:

  2022 Farm on Golden Hill Chardonnay   5    Personal · me · 26 Apr 2025 · 3 claims
  2019 Paradis Vineyards Pinot Noir     2    Personal · me · 17 Aug 2022 · 3 claims
  2021 Vitis Ridge Rose of Pinot Noir   2    Producer · Vitis Ridge · 12 Jun 2022 · 1 claim
  2021 Paradis Vineyards Pinot Gris     1    Personal · me · 4 Mar 2024 · 3 claims

  2026-09-18 — every row through 2026 / about 3 months left. Rows 9 to 12 are the corrected order:

   1  2024 Farm on Golden Hill Rose          5   Personal · me · 5 Apr 2025 · 2 claims
   2  2024 Paradis Vineyards Marechal Foch   4   Personal · me · 5 Dec 2025 · 2 claims
   3  2014 Brooks Riesling                   3   Personal · me · 12 Sep 2020 · 3 claims
   4  2013 Brooks Pinot Noir                 2   Personal · me · 13 Nov 2018 · 2 claims
   5  2021 Vitis Ridge Pinot Noir            2   Producer · Vitis Ridge · 12 May 2023 · 2 claims
   6  2019 Lodi (assorted) Zinfandel         1   Personal · me · 5 Mar 2025 · 2 claims
   7  2021 Paradis Vineyards Pinot Noir      1   Producer · Paradis Vineyards · 12 Jul 2023 · 1 claim
   8  2021 St. Josef's Pinot Noir            1   Producer · St. Josef's · 12 Jun 2023 · 2 claims
   9  2021 Vitis Ridge Pinot Gris            1   Producer · Vitis Ridge · 12 Apr 2022 · 1 claim
  10  2022 Vitis Ridge Marechal Foch         1   Producer · Vitis Ridge · 12 Apr 2023 · 1 claim
  11  2022 Vitis Ridge Pinot Gris            1   Personal · me · 2 Jun 2025 · 2 claims
  12  2022 Vitis Ridge Rose of Pinot Noir    1   Producer · Vitis Ridge · 12 May 2023 · 2 claims

  Also worth a glance: Cellar Health above it should read exactly as before at every date. If it doesn't, the provider refactor broke something.

  To stage

  git add app/src/CellarProvider.tsx app/src/DrinkSoon.tsx app/src/drinkSoonRows.ts `
          app/test/drinkSoonRows.test.mts app/src/App.tsx app/src/App.css `
          app/src/CellarHealth.tsx app/src/dates.ts app/test/dates.test.mts `
          docs/friction-logs/friction-log.md

  README.md and docs/friction-logs/session6.md are also modified — those are yours, not mine. Add them if you want them in this commit.

  Stage 3: Drink Soon, with the provenance of every window

  Bottles whose window closes within twelve months, grouped by wine because
  the window resolves from the wine and per-bottle rows would repeat one
  claim five times. Each row names the tier, the source, the assessment date
  and how many accepted claims that wine has.

  Horizon fixed at 12 months rather than exposed as a control: every accepted
  bound in the dataset normalizes to 31 December, so the count is a step
  function and a slider would be flat across most of its travel. Recorded in
  the friction log with the 31 December edge it implies.

  Empty at three of the five verification dates, so all three empty states
  name what the cellar is doing instead — including how far off the next
  closing window is.

  Cellar Health moves onto a shared CellarProvider: one query and one
  buildCellar for every view, rather than relying on unverified useQuery
  deduping. Missed Opportunities is the third consumer.

✻ Sautéed for 10m 51s
```