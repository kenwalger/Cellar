### 23 September 2026, Session 7

#### Stage 3: Missed Opportunities

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to build: the last of Stage 3's four views. Bottles that
were in their drinking window during a period, were never opened, and are past
window today.
Outcome: built and verified. 119 app tests (101 new), 390 core tests. Stage 3
complete.
Elapsed: 09:54 to about 10:22 am, roughly 28 minutes.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 09:54 to 10:07 am | Prompt 1: measure, propose the period and the row, stop | 5m 49s |
| 10:07 to about 10:22 am | Prompt 2: approved with four notes; build it | 14m 22s |
| after the build | Verification in the browser at five dates | |

#### Two design questions, both settled by measurement

This proposal answered three of five questions with numbers from the dataset
rather than with reasoning, and in both of the important cases it measured the
option it intended to reject.

**The period.** The obvious choice is the calendar year containing `asOf`, and
it is unusable. Every `drinkUntil` normalizes to 31 December, so no window
closes mid-year, so no bottle that was DRINKING during year Y can read
PAST_WINDOW before Y+1 begins. The regret set for the current calendar year is
empty by construction, all year, every year. Since `asOf` defaults to today,
that design ships a view that is empty on load every single time, for a reason
no reader could deduce from the screen.

The twelve months ending at `asOf` contains the 31 December closing it needs.
It is non-empty at the default date, it moves continuously as the slider
moves, and twelve months ending on 31 December is exactly the calendar year,
so the control still reaches the oracle's periods precisely.

**What "now" means.** Under an `asOf` control, "past window now" has two
readings. Bound to `asOf`, the view reads zero across the whole interesting
stretch of the ledger and then climbs into the future, because dragging
forward retroactively ruins bottles that might still be drunk. A projection
presented as a loss. Bound to today, every surviving row is necessarily a
bottle still physically held, because a bottle opened before now reads
CONSUMED rather than PAST_WINDOW.

The view states both dates on every reading rather than only when they
differ: "At peak between 1 January 2023 and 31 December 2023, never opened,
and past window today, 23 September 2026."

#### What the view shows

At 2023-12-31, 17 bottles across 9 wines, of which 8 did get opened in time.
That is the oracle's number for 2023, reached through the date control rather
than through a test.

The row carries the lost count against the wine's at-peak total, what became
of the rest, the window's provenance, and a compressed peak span. The raw
peak intervals would have been seventeen identical date ranges restating the
period back at the reader; the informative case is a peak that does not fill
the period, which in this dataset always means the bottle was bought already
in window.

The empty states do real work. At 2019-12-31: "Nothing was lost in this
period. 47 bottles were at peak. 8 were opened during the period and 39 were
not, but 32 have since been opened, and 7 are still in hand and not past
window." Every number there rules out a different reason for the emptiness.
Most applications would render a blank panel and leave the reader wondering
whether it was broken.

#### Verification

Five dates confirmed in the browser: today, the two oracle periods at
2023-12-31 and 2024-12-31, the explanatory empty state at 2019-12-31, and the
future case at 2030-01-01. Dragging the slider moves the count continuously
rather than stepping once a year, which is the whole argument for the trailing
period.

#### Found by looking at the screen

**Two panels use "today" to mean different dates.** At `asOf` = 31 December
2023, Drink Soon says "today is the last day" about a window closing at the
end of 2023, meaning the `asOf` date. Directly beneath it, the Missed
Opportunities subhead says "past window today, 23 September 2026", meaning the
real today. Same word, same screen, two dates. "Closes today" or "the last
day" would fix it.

This is the class of thing the project has been careful about everywhere else,
and no test could have caught it, because both panels are individually
correct.

**One area still thin.** At 2030-01-01, Drink Soon shows 6 bottles closing
within 12 months while Hold reads 0 and Past window reads 142. Nothing looks
wrong, but it is the furthest point from anything verified and the one place
the projection and the horizon interact.

#### Build findings

### Build findings

Written while building Missed Opportunities, after the proposal was approved.

#### 1. A spec that states three conditions where the data has two

`docs/temporal-resolution.md` defines the regret set as three independent
operations:

```
regret(period) = peaked(period)
                 minus opened(period)
                 restricted to state(bottle, now) == PAST_WINDOW
```

The middle term never fires. A bottle opened during the period reads CONSUMED
at every later date, so it can never read PAST_WINDOW at `now`, so the third
condition has already excluded it before the second is consulted. For any
period ending at or before `now`, which is every period this view can be
asked about, since `asOf` chooses the period and `now` is today, the
subtraction removes nothing that the restriction has not removed already. It
becomes load-bearing only for a period extending past `now`, which the spec
does not contemplate and the view cannot produce.

This is not a bug and `missed.ts` is not wrong: it implements the definition
faithfully, and the redundant test costs one map lookup. It is a note about
how specifications read. Three named conditions imply three independent
things being checked, and a reader working out why a particular bottle is
absent will look for which of the three excluded it. Two of them are the same
one wearing different clothes. The definition would be sharper written as
"bottles that were at peak during the period and are past window now", with
the observation that this excludes anything opened in the period *because*
opening it makes it CONSUMED: one condition, one consequence, and the
consequence explained rather than restated as a rule.

Worth noting what produced it. The spec was written before the data existed,
and at that point `opened(period)` and the PAST_WINDOW restriction were two
genuinely separate intuitions about regret, "you didn't drink it" and "and
now you can't". They only collapse into one once the state machine is fixed,
which happened in the same document, a section earlier. A spec written
top-to-bottom will do this, and the only way to find it is to build the thing
and notice that a branch never takes.

Not changed in `temporal-resolution.md`. The definition is correct as written
and rewriting it now would lose the record of how it was originally thought
about, which is worth more than the tightening.

#### 2. Year quantization killed a second design

Every `drinkUntil` in the dataset is 31 December, because a window stated as
a year normalizes to one. Session 4 found the first consequence: a Drink Soon
horizon slider would be flat across most of its travel, because the count can
only step at year boundaries. That cost a control and gained a fixed
`DRINK_SOON_MONTHS = 12`.

This round the same property reached further. The obvious period for Missed
Opportunities is the calendar year containing `asOf`, and it is unusable: if
no window closes mid-year, no bottle that was DRINKING during year Y can read
PAST_WINDOW before Y+1 begins, so the regret set for the current calendar year
is empty by construction, all year, every year, for any dataset with
year-stated windows. `asOf` starts at today, so that design ships a view that
is empty on load every single time, for a reason no reader could deduce from
the screen.

Measured before it was rejected: calendar 2026 returns nothing, and the
twelve months ending on the same day return eleven bottles. The trailing
period works precisely because it contains the 31 December closing that a
same-year period cannot reach.

The general shape is worth keeping: a normalization rule chosen for one
reason, a year ago in project time, is now constraining what views are
possible two layers away. Both times it was found by measuring a design
before committing to it rather than by reading the spec, and in this case
reading the spec would not have found it: the spec is correct, the data is
correct, and the interaction is only visible in the output.

#### 3. The empty state costs four times what a full screen does

Missed Opportunities renders a full screen in about 0.6 ms and an empty one in
about 2.3 ms on top of that. The inversion is structural rather than a
mistake. The regret set is found by testing `state(bottle, now) ==
PAST_WINDOW` first, which is cheap, and only running the boundary scan on the
33 bottles of 542 that pass. Saying *why* the screen is empty means knowing
how many bottles were at peak at all, and that question has no gate: it is a
boundary scan over the whole ledger.

So the view is cheap exactly when it has something to say, and it pays its
largest bill to explain an absence. That is the right trade, since a view with no
rows spent nothing rendering them, but it has to be deliberate, and it is
why `scanPeriod` is a separate export called from the empty branch rather
than folded into the summary where it would run on every date change.

One honest correction to the proposal's numbers while recording this. The
estimate of 0.12 ms was for the bare predicate. The finished view costs
0.42 ms for the period ending today and 0.62 ms for one listing eleven wines,
and nearly all of the difference is the second pass that turns "3 bottles"
into "3 of 5, and you opened 2 in time". That column is the most expensive
thing on the screen. Still 5% of a frame with all three views recomputing, so
nothing changes, but a quoted measurement that stops being true when the
feature grows is worth catching in the same document that quoted it.

#### 4. The app's TypeScript config does not anticipate testing its own source

`node --test` runs `app/src/*.ts` directly. Node's ESM resolver does not guess
extensions, so a view module that a test imports has to write `./dates.ts`
rather than `./dates`, and `tsc` then rejects it with TS5097 unless
`allowImportingTsExtensions` is set, which in turn requires `noEmit`.

This had not come up before because `drinkSoonRows.ts`, the only other tested
view module, has no relative imports at all. It imports `@cellar/core` and
nothing else, so the question never arose. The moment a second tested module
needed a helper from a sibling file, the whole chain surfaced at once.

Two smaller things fell out of looking at it. The scaffolded `tsconfig.json`
has `include: ["**/*.ts", "**/*.tsx"]`, which does not match `.mts`, so none
of the test files have ever been type-checked, by this config or any other.
And adding `noEmit` only states what was already true: `sanity build` bundles
with Vite and `tsc` is a checker here, never an emitter. Both are recorded
rather than treated as defects, but a reader coming from the template should
know that `npm test` and `tsc` disagree about what a relative import may look
like until the config says otherwise.

Neither the App SDK documentation nor the app template covers running the
app's own source under Node's test runner. The resolution is three lines of
config and a comment, and finding it took longer than writing it.

#### Transcripts

Full prompts and outputs, unedited.

##### Prompt 1: measure and propose (09:54 to 10:07 am)

```text
Stage 3, final view: Missed Opportunities.

Read CLAUDE.md, docs/temporal-resolution.md including the corrected boundary
set, the Stage 3 section of docs/build-plan.md, the missedOpportunities
export in packages/cellar-core, and app/src/CellarProvider.tsx.

Do not write code yet. Propose, then stop for my approval:

1. What the view asks. Missed Opportunities is a question about a period, not
   about a date: which bottles were at peak during that period, were not
   opened, and are past window now. Propose how the period is chosen. The app
   has one asOf control already and I do not want a second date input, so say
   whether the period derives from asOf (the calendar year containing it, the
   twelve months before it) or is picked from a short list of years. Say what
   the data supports.

2. What "now" means here. The regret set is restricted to bottles that are
   past window now. Under an asOf control, "now" is ambiguous: today, or the
   asOf date. Pick one, say why, and say how the view makes the choice
   legible to a reader.

3. The row. Propose what each row carries. peakIntervals falls out of the
   boundary scan, so say whether showing when a bottle was at peak earns its
   place or is noise. Group by wine or list per bottle, and justify it against
   the same reasoning that grouped Drink Soon.

4. Cost. This is the expensive view: a boundary scan per bottle rather than a
   single state evaluation. Measure it against the existing 0.07 ms tally and
   say whether it needs memoizing separately from the CellarProvider index.

5. The empty state. Say when it is empty and what it should say then.

Verification, once built. The oracle is sample_data/expected-misses.csv,
generated on 19 September by brute-force daily evaluation, before this view
existed and by a different method than the boundary scan. It covers two
periods with now fixed at 2026-09-18:

  2023   17 bottles
  2024   21 bottles

Add it to the app test suite the same way expected-states.csv is used in
core: one assertion per row, complete set comparison per period, no sampling.
Same rule as always. Do not modify the oracle. If the implementation
disagrees, report the failing rows and stop.

You cannot see the rendered view, so do not report it verified. Give me what
to type and what I should see, and I will confirm.

If anything goes in the friction log this round, write it to
docs/friction-logs/session7.md rather than friction-log.md.

Standing rules: no git commands that change the repo; write the commit
message and tell me what to stage. Report anything the documentation does not
cover rather than working around it silently. Windows and PowerShell.
```

##### Prompt 1 output

```text
Bash(cd C:/Users/kenal/Cellar && grep -n "^export \|^\(export \)\?const \|^function \|^\(export \)\?function " app/src/dates.ts | head -40)
  ⎿  28:export const ASOF_FLOOR: IsoDate = '1996-01-01'
     29:export const ASOF_CEILING: IsoDate = '2042-12-31'
     31:const MS_PER_DAY = 86_400_000
     … +20 lines (ctrl+o to expand)

● I read CLAUDE.md, docs/temporal-resolution.md (including the corrected boundary set), Stage 3 of docs/build-plan.md, packages/cellar-core/src/missed.ts, and app/src/CellarProvider.tsx, plus drinkSoonRows.ts/DrinkSoon.tsx for the precedent this view has to be consistent with, and
  packages/cellar-core/test/oracle.test.mts.

  Before proposing I ran three read-only probes against sample_data/cellar.ndjson through the built dist, because three of your five questions ("say what the data supports", "measure it", "when is it empty") are empirical. Scripts are in the scratchpad; nothing in the repo changed. The numbers below are
  measured, not estimated.

  ---
  1. What the view asks, and how the period is chosen

  Proposal: the twelve months ending at asOf. No second input, no year list.

  The calendar-year-containing-asOf option is the one that reads better on paper and it is the one I'd reject, for a structural reason rather than a taste one. Every drinkUntil in this dataset is 31 December, because a window stated as a year normalizes to one. So no window can close in the middle of a
  calendar year, so no bottle that was DRINKING during year Y can be PAST_WINDOW before Y+1 begins. The regret set for the current calendar year is empty by construction, always, all year. Measured: period 2026 returns 0 bottles, and it will return 0 until January. asOf defaults to today, so that option
  ships a view that is empty on load every single time, for a reason the reader cannot see.

  Trailing twelve months doesn't have that problem, because the 31 December closing falls inside the period:

  ┌───────────────────────┬─────────┬───────┐
  │ period ending at asOf │ bottles │ wines │
  ├───────────────────────┼─────────┼───────┤
  │ 2016-06-30            │ 0       │ 0     │
  ├───────────────────────┼─────────┼───────┤
  │ 2021-06-30            │ 2       │ 2     │
  ├───────────────────────┼─────────┼───────┤
  │ 2022-12-31            │ 14      │ 8     │
  ├───────────────────────┼─────────┼───────┤
  │ 2023-12-31            │ 17      │ 9     │
  ├───────────────────────┼─────────┼───────┤
  │ 2024-06-30            │ 19      │ 11    │
  ├───────────────────────┼─────────┼───────┤
  │ 2024-12-31            │ 21      │ 11    │
  ├───────────────────────┼─────────┼───────┤
  │ 2025-06-30            │ 23      │ 12    │
  ├───────────────────────┼─────────┼───────┤
  │ 2026-09-23 (today)    │ 11      │ 5     │
  └───────────────────────┴─────────┴───────┘

  Three things fall out of that table that I think settle it:

  - It is non-empty at the default date. 11 bottles, 5 wines, on load.
  - It moves continuously as the control moves. A calendar-year period steps once a year and is flat for 364 days of slider travel, the same objection that fixed DRINK_SOON_MONTHS at 12 rather than shipping a horizon slider. The build plan wants the control moving in the demo; this is the view where
  movement produces the most change.
  - The oracle periods are reachable from the view. addDays(addMonths(asOf, -12), 1) with asOf = 2023-12-31 is exactly 2023-01-01. Trailing-twelve ending on 31 December is the calendar year. So dragging to 31 Dec 2023 shows the oracle's 17 and 31 Dec 2024 shows the oracle's 21, the automated check and the
  on-screen number are the same number, which is worth a lot on camera.

  The short list of years I'd reject on a different ground: it is a second control wearing a hat, and it would have to be curated. 1998 through 2012 are fifteen identical years (the same four 1993 Mouton bottles, one wine, window 1998–2012 personal, never opened), 2013–2020 are empty, and the interesting
  range is 2021–2025. Any hand-picked list is me choosing the years that demo well, which is the opposite of what this project is arguing.

  One wart to name rather than hide: addMonths clamps to end-of-month, so asOf = 2024-02-29 yields a start of 2023-03-01 and a 365-day period instead of 366. It is one day, at one date per four years, and fixing it means inventing a second month-arithmetic convention. I'd record it in the header comment and
  leave it.

  2. What "now" means

  Proposal: now is today, the same todayDate App.tsx reads once at mount, not asOf.

  Two arguments, one about meaning and one measured.

  The meaning: the regret claim is "this bottle is in your cellar, unopened, and it is ruined." That is a statement about the physical present. asOf is a lens on the ledger; today is where the bottles actually are. And the PAST_WINDOW-at-now gate does more work than it looks like, because a bottle opened
  before now reads CONSUMED, not PAST_WINDOW, every surviving row is necessarily a bottle still held. With now = asOf the view would instead report bottles you have since drunk as missed, which is not regret, it is the drift question, and verdictDrift already answers that properly.

  The measurement: now = asOf makes the view erratic rather than merely different. Same trailing-twelve periods, now bound to asOf: 2022-12-31 → 0, 2023-12-31 → 0, 2024-12-31 → 0, 2025-06-30 → 18, 2027-06-30 → 23, 2030-01-01 → 38. It reads zero across the whole interesting stretch of the ledger and then
  climbs into the future, because dragging asOf forward retroactively ruins bottles you might still drink. That is a projection presented as a loss.

  Making it legible. The subhead states both dates unconditionally, not only when they differ:

  ▎ At peak between 24 September 2025 and 23 September 2026, never opened, and past window today, 23 September 2026.

  When asOf is in the future, the period lies entirely ahead of today and the set is necessarily empty; the empty state says so in those words (see §5). I considered clamping the period end to today and rejected it, a silent clamp makes the masthead and the panel disagree about what date is being shown.

  3. The row

  Group by wine, as Drink Soon does, but the reasoning only half-transfers, and the half that doesn't is the interesting part.

  Drink Soon groups by wine because the window resolves from the wine, so per-bottle rows print identical provenance five times. That still holds here: windowNow is constant within a wine group. But peakIntervals is a property of the bottle, because the scan's boundary set includes acquiredAt. Measured,
  bottles of the same wine disagree in 4 of the 7 non-trivial periods, e.g. in 2024, farm-on-golden-hill-pinot-noir-2022 has three bottles with three different peaks, and the reason is legible: acquired 12 May, 11 Aug, 9 Dec.

  So the grouping is right and the row has to carry one field that isn't constant inside the group.

  Does peakIntervals earn its place? As a printed date range per bottle, no. In the 2023 oracle period, all 17 intervals are exactly 2023-01-01 … 2023-12-31, seventeen identical rows restating the period back at the reader. Across the whole dataset, not one bottle has more than one interval. Printing the
  raw structure would be noise.

  Compressed, yes, and specifically because the partial ones are informative: every partial interval in this data begins at an acquisition. "At peak from 12 May" is really "you bought it already in window", which is a different and sharper kind of regret than "you held it through the whole year".

  Proposed row, four columns, matching Drink Soon's shape:

  ┌─────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Column  │                                                                                                                                          Content                                                                                                                                          │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Wine    │ wineDisplayName, with the Drink Soon provenance strip underneath for the window that now judges it past: tier · source · assessedAt · N claims                                                                                                                                            │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Bottles │ count still held, unopened                                                                                                                                                                                                                                                                │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ At peak │ derived from the group's intervals: "the whole period" when every bottle spans it; "from 12 May" when they share one partial start; "from 12 May to 9 Dec, by bottle" when they disagree, with the per-bottle detail in title, the same escape hatch DrinkSoon.tsx uses for assessmentId │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Closed  │ drinkUntil as a year plus distance, via the existing describeApproxSpan, "end of 2024, about 21 months ago"                                                                                                                                                                              │
  └─────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Sort: bottles descending, then drinkUntil ascending, then name, then wineId. Drink Soon leads on urgency because urgency is the point there; nothing here is urgent, it is all already lost, so magnitude leads. wineId closes the key to make the order total, same reason as compareDrinkSoonRows.

  One optional fifth column I'll flag and not push: bottles of the same wine opened during the period, giving "3 of 5 unopened". It converts a count into a story and it is free from the same index. It is also the only part of this that isn't in the spec's regret definition, so it's the first thing to cut if
  you want the view minimal.

  4. Cost

  Measured p50 over 300 runs, all four paths warmed identically in one process (absolute numbers run faster on this machine today than the 0.04–0.07 ms in the friction log, the tally re-measures at 0.025 ms, so the ratios are the durable figures):

  ┌──────────────────────────────────────┬──────────┬──────────┐
  │                                      │   p50    │ vs tally │
  ├──────────────────────────────────────┼──────────┼──────────┤
  │ 542-bottle tally at one date         │ 0.025 ms │ 1×       │
  ├──────────────────────────────────────┼──────────┼──────────┤
  │ missedOpportunities, one-year period │ 0.124 ms │ 5×       │
  ├──────────────────────────────────────┼──────────┼──────────┤
  │ all three views at one date change   │ 0.358 ms │ 14×      │
  └──────────────────────────────────────┴──────────┴──────────┘

  It is the expensive view and it is still nowhere near expensive. 0.358 ms for the whole screen is 2% of a 16.7 ms frame. No debounce, same reasoning as session 4, debouncing a sub-millisecond handler adds latency for nothing and makes the numbers trail the thumb.

  The reason it stays cheap is the gate order in missed.ts: state(bottle, now) == PAST_WINDOW is tested first, and only 33 of 542 bottles ever reach the boundary scan. The gate itself is essentially a tally (0.027 ms); the 33 scans are the remaining 0.1 ms, about 3 µs each.

  Caching: one useMemo in the view, keyed [cellar, period.start, period.end, now]. Nothing in CellarProvider. The provider's contract is the date-independent index, the 6 ms buildCellar that must not run per keystroke. This result is date-dependent by construction, so hoisting it would put a per-date value
  inside a per-data memo, which is precisely the bug session 4 found in CellarHealth. Two memos on different keys, as in both existing views.

  One cost that does need care, and it is the empty state. Saying why the view is empty requires knowing how many bottles were at peak in the period at all, which means running the boundary scan on all 542 bottles instead of 33. Measured: 1.9 ms, 16× the populated path and 76× the tally. So it computes
  lazily, only when the regret set is empty. The view that is empty is the view that had nothing to render, and 2 ms of a frame it didn't otherwise use is invisible.

  5. The empty state

  Empty is common and the reasons are genuinely different claims about the cellar. Measured per period, the distinguishable cases:

  1. asOf is in the future, the period lies after today, so the gate cannot fire. "This period hasn't happened yet. Missed Opportunities looks backward: it needs bottles that are past window today."
  2. Nothing was in the cellar, before 1998. Reuses firstAcquisitionDate and Drink Soon's exact sentence: "The ledger begins 3 March 1996."
  3. Nothing was at peak in the period, 2013–2016. "No bottle was in its drinking window during this period."
  4. Bottles peaked, and none of them is past window today. The common case and the good one, 2017 through 2020 all land here. This is where the lazy full scan pays for itself: at 2019 the view can say "39 bottles were at peak in this period and not opened then. 32 have since been opened, and the rest are
  still in window. Nothing was lost."
  5. Bottles peaked and you opened all of them, the fully celebratory case. It never occurs in this dataset (peakedNotOpened is above zero in every period where anything peaked), and I'd still write the branch and say in a comment that the seed data never reaches it, rather than let a reader think case 4
  covers it.

  Verification

  Flagging before I build it: expected-misses.csv is already an oracle. packages/cellar-core/test/oracle.test.mts:94-172 reads it and asserts complete-set equality per period against missedOpportunities directly, with ORACLE_NOW = '2026-09-18'. Adding it to the app suite the same way would re-assert what
  core already asserts.

  What it should do in the app suite instead, and I think this is what you're actually after, is bite on the layer core cannot see: the rows, expanded back to bottles, must equal the oracle's bottle set exactly. That catches a grouping bug, a sort that drops a row, a filter applied twice, a bottle count
  that doesn't sum. Same discipline, one assertion per row, complete set comparison per period, no sampling, both periods:

  - every row of the file participates in exactly one comparison, with the row-count arithmetic asserted explicitly (core's pattern at oracle.test.mts:108)
  - per period: rows.flatMap(bottleIds) as a set equals the oracle's bottles; failures name missing / extra rather than reporting an ordering difference
  - per period: sum(row.bottleCount) equals the oracle row count, and the wine grouping is a partition
  - separately, and not from the oracle: the period derivation is pure date arithmetic and gets its own tests beside dates.test.mts, including asOf = 2023-12-31 → 2023-01-01..2023-12-31, which is the identity that ties the two together

  I verified that now = 2026-09-23 (today) produces byte-identical bottle sets to the oracle's now = 2026-09-18 for both periods, so the test can pin ORACLE_NOW and the live app will still show the same numbers. The oracle is not modified. If the implementation disagrees I report the failing rows and stop.

  What you'll type and what you should see (full version comes with the build): npm test in app/, then npm run dev in app/, drag asOf to 31 December 2023, the panel header should read 17 bottles across 9 wines, and every row's "At peak" should read "the whole period". Then 31 December 2024, 21 bottles
  across 11 wines, with farm-on-golden-hill-pinot-noir-2022 showing three bottles and "from 12 May to 9 Dec, by bottle". At today's date, 11 bottles across 5 wines. I can't see the rendered view, so I won't call it verified; you confirm.

  For docs/friction-logs/session7.md

  Three findings I'd write up once you approve, all from the probes rather than from building:

  - The spec's minus opened(period) term is inert for any period ending at or before now. A bottle opened during the period reads CONSUMED at now, so the PAST_WINDOW gate has already excluded it. The subtraction only bites for a period extending past now. Not a bug, missed.ts implements the spec faithfully
  and the redundancy is harmless, but the spec presents three independent conditions where the data has two.
  - Year-quantized windows make the current-calendar-year regret set structurally empty. This is the finding that chose the period shape, and it is a consequence of drinkUntil normalization interacting with a view written months earlier. Same family as the DRINK_SOON_MONTHS horizon finding in session 4.
  - The empty state is 16× the cost of the populated one. An unusual shape worth recording: the view is cheap exactly when it has something to say.

  Nothing here contradicts temporal-resolution.md, so I'm not proposing a spec change, the first point is a note, not a correction.

  Stopping here for your approval. No files written, no git commands run.

✻ Sautéed for 5m 49s
```

##### Prompt 2: approval with four notes (10:07 am)

```text
Approved throughout. Four notes.

1. Trailing twelve months, now = today: approved, both with your reasoning.
   The subhead stating both dates unconditionally is right.

2. peakIntervals compressed, not printed: approved. "From 12 May" meaning
   "you bought it already in window" is a sharper regret than the whole
   period, and that is worth the column.

3. The optional fifth column, "3 of 5 unopened": include it. It converts a
   count into a story, it is free from the same index, and this view is the
   emotional centre of the application. If it reads as clutter on screen I
   will cut it after seeing it.

4. Verification: your read is better than my instruction. Test the layer core
   cannot see, exactly as you propose. Keep the period-derivation tests
   separate from the oracle tests.

The February 29 clamp: record it in the header comment and leave it, as you
say. Do not invent a second month-arithmetic convention for one day every
four years.

All three findings go in docs/friction-logs/session7.md. The inert
`minus opened(period)` term is worth writing carefully: the spec presents
three independent conditions where the data has two, and that is a note about
specification style rather than a bug.

Standing rules: no git commands that change the repo; write the commit
message and tell me what to stage.
```

##### Prompt 2 output

```text
Bash(cd C:/Users/kenal/Cellar/packages/cellar-core && npm test 2>&1 | tail -8; cd C:/Users/kenal/Cellar && echo "=== git status ===" && git status --short)
  ⎿  ℹ tests 390
     ℹ suites 13
     ℹ pass 390
     … +16 lines (ctrl+o to expand)

● All green: 119 app tests (101 new), 390 core tests, tsc --noEmit, ESLint, Prettier, and sanity build (2.4 s).

  Two things you need to know before you look at it

  The cost estimate I gave you was wrong once the fifth column existed. I quoted 0.124 ms; that was the bare predicate. Measured on the finished view:
  
  ┌─────────────────────────────────────────┬──────────┐
  │                                         │   p50    │
  ├─────────────────────────────────────────┼──────────┤
  │ 542-bottle tally (Cellar Health)        │ 0.043 ms │
  ├─────────────────────────────────────────┼──────────┤
  │ summarizeMissed, period ending today    │ 0.420 ms │
  ├─────────────────────────────────────────┼──────────┤
  │ summarizeMissed, 2024 (11 wines listed) │ 0.617 ms │
  ├─────────────────────────────────────────┼──────────┤
  │ all three views at one date change      │ 0.907 ms │
  ├─────────────────────────────────────────┼──────────┤
  │ scanPeriod, the empty path             │ 2.337 ms │
  └─────────────────────────────────────────┴──────────┘

  Nearly all of the growth is the "3 of 5" pass, which has to scan the other bottles of every listed wine. It is the most expensive thing on the screen. 0.9 ms against a 16.7 ms frame is still ~5%, so no debounce and no structural change, but you should know the column costs about 4× what the rest of the
  view does when you decide whether to keep it. The in-code comments now carry the measured numbers, not the estimates.

  app/tsconfig.json needed two options. node --test runs the view modules from source, and Node's ESM resolver won't guess extensions, so missedRows.ts has to import ./dates.ts. tsc then rejects that (TS5097) without allowImportingTsExtensions, which requires noEmit. This never came up because
  drinkSoonRows.ts, the only other tested view module, has no relative imports at all. Two things surfaced while fixing it: the scaffolded include: ["**/*.ts", "**/*.tsx"] doesn't match .mts, so no test file in app/ has ever been type-checked, and noEmit only states what was already true, since sanity
  build bundles with Vite. Neither the App SDK docs nor the template covers this. It's finding 4 in the friction log.

  What to type

  cd C:\Users\kenal\Cellar\app
  npm test
  npm run dev

  What you should see

  On load (today, 23 September 2026). Subhead: "At peak between 24 September 2025 and 23 September 2026, never opened, and past window today, 23 September 2026." Then 11 bottles you never opened, across 5 wines, of which 2 bottles did get opened in time. Five rows:

  ┌─────────────────────────────────────┬─────────────────────────────────────┬─────────────────────────────────────────────┬───────────────┐
  │                Wine                 │                Lost                 │                   At peak                   │ Window closed │
  ├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────┼───────────────┤
  │ 2023 Farm on Golden Hill Pinot Noir │ 5 · of 6 at peak · 1 opened in time │ until 31 Dec 2025 / latest from 16 Dec 2025 │ end of 2025   │
  ├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────┼───────────────┤
  │ 2019 Paradis Vineyards Pinot Noir   │ 2 · every one                       │ until 31 Dec 2025                           │ end of 2025   │
  ├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────┼───────────────┤
  │ 2021 Vitis Ridge Rose of Pinot Noir │ 2 · every one                       │ until 31 Dec 2025                           │ end of 2025   │
  ├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────┼───────────────┤
  │ 2021 Paradis Vineyards Pinot Gris   │ 1 · every one                       │ until 31 Dec 2025                           │ end of 2025   │
  ├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────┼───────────────┤
  │ 2023 Farm on Golden Hill Rose       │ 1 · of 2 at peak · 1 opened in time │ until 31 Dec 2025                           │ end of 2025   │
  └─────────────────────────────────────┴─────────────────────────────────────┴─────────────────────────────────────────────┴───────────────┘

  Date field to 2023-12-31. 17 bottles, across 9 wines, 8 opened in time. Every "At peak" cell reads the whole period, this is the oracle's 2023 set, reached through the control.

  Date field to 2024-12-31. 21 bottles, across 11 wines, 16 opened in time. First row 2021 Paradis Vineyards Estate Marechal Foch, 3 of 5. The row to check is 2022 Farm on Golden Hill Pinot Noir, 3 of 6, reading from 12 May 2024 with latest from 9 Dec 2024 beneath it, three bottles acquired 12 May, 11
  August and 9 December; hover it for the per-bottle list.

  Date field to 2019-12-31. Empty, and it should say: "Nothing was lost in this period." / "47 bottles were at peak. 8 were opened during the period and 39 were not, but 32 have since been opened, and 7 are still in hand and not past window."

  Date field to 2030-01-01. "This period has not happened yet."

  Drag the slider from 2012 to today and the count should move continuously rather than stepping once a year. I can't see any of this rendered, so I'm not calling it verified, the numbers above come from running the view's own code, not from a screen.

  Friction log

  Four findings appended to docs/friction-logs/session7.md, as a ### Build findings section at the end of the file, after your empty Prompt 3 stub, so move it if you'd rather it sat under Prompt 2's Findings:. The minus opened(period) note is written as you asked: a note about specification style,
  including why a top-to-bottom spec produces it (the two conditions were genuinely separate intuitions until the state machine, defined a section earlier, collapsed them) and why I did not change temporal-resolution.md, the definition is correct, and rewriting it would erase the record of how it was
  thought about.

  To stage

  git add Changelog.md app/tsconfig.json app/src/App.css app/src/App.tsx app/src/dates.ts app/src/MissedOpportunities.tsx app/src/missedRows.ts app/test/missedPeriod.test.mts app/test/missedRows.test.mts docs/friction-logs/session7.md

  Commit message

  Stage 3: Missed Opportunities, and the period it asks about

  The last of Stage 3's four views. Bottles that were in their drinking
  window during a period, were never opened, and are past window today.

  The period is the twelve months ending at asOf rather than the calendar
  year containing it. Every drinkUntil normalizes to 31 December, so no
  window closes mid-year, so no bottle that was DRINKING during year Y can
  read PAST_WINDOW before Y+1 begins: the regret set for the current
  calendar year is empty by construction, all year, every year. A trailing
  period contains the closing it needs, and twelve months ending on 31
  December is that calendar year, so the control still reaches the
  oracle's periods exactly.

  now is today and the period comes from asOf, and the view states both
  dates on every reading. Binding now to asOf was measured before it was
  rejected: it reads zero across the whole interesting stretch of the
  ledger and then climbs into the future, because dragging forward
  retroactively ruins bottles that might still be drunk.

  Rows group by wine, as Drink Soon does, and carry the lost count against
  the wine's at-peak total, what became of the rest, the window's
  provenance, and a compressed peak span. The raw intervals are seventeen
  identical date ranges in the oracle's 2023 period; a peak that does not
  fill the period is the only informative case, and in this dataset it
  means the bottle was bought already in window.

  Verification is split in two. The oracle tests assert that the rendered
  rows expand back to exactly the bottle set in expected-misses.csv, one
  assertion per row and a complete set comparison per period. cellar-core
  already drives that table against the predicate, so the app suite checks
  the layer it cannot see: grouping, counting, partitioning and ordering,
  plus a cross-check that the ungated 542-bottle scan finds the same lost
  set as the gated one. The derivation tests cover the period arithmetic
  at every one of the slider's 17,168 positions, including the 29 February
  clamp, which is pinned rather than fixed.

  tsconfig gains allowImportingTsExtensions and noEmit: node --test runs
  the view modules from source and Node's ESM resolver needs explicit
  extensions on relative imports. sanity build was never using tsc to emit
  anything.

✻ Baked for 14m 22s
```