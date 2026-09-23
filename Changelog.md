# Changelog

Milestone-level history of The Cellar. For decisions and their reasoning see
`docs/ADRs/`. For the experience of building it see `docs/friction-logs/friction-log.md`.
For every change, see the git log.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Stages refer to `docs/build-plan.md`.

## [Unreleased]

### Stage 4a: the review workflow (in progress)

- **Assessment review is a workflow you cannot bypass.** Accept and Reject
  document actions are the only transitions, both out of `proposed`, and
  `reviewState` is `readOnly` in the form. A rejected claim stays in the
  dataset recorded as rejected, per ADR 0011 — the undo for a mistaken
  acceptance is another claim-state change, not a delete
- A review queue in Studio structure, three lists by state, Proposed first.
  Everything else stays where it was; organising the whole Studio by state is
  Stage 5
- **Projection fields declared for the first time**, as registered
  `wineDerived` and `bottleDerived` object types. Two spec errors found and
  recorded in ADR 0012 and in `content-model.md`: `wine.derived.cellarState`
  cannot exist, because the state machine is defined per bottle and a wine
  holds bottles in several states at once; and design rule 1 named two inputs
  where it needs three, since a projection of a clock-dependent state is only
  reproducible if the date it was computed at is stored beside it. Both
  projections now carry `derived.asOf`
- `assessment.sourceMethod` records whether a window was authored or
  extracted. `derivedFrom` does not distinguish them — 38 seeded assessments
  carry it and all were written by hand. Both facts about an accepted proposal
  are true at once: it is the owner's claim, and a model drafted it
- 16 new tests in `@cellar/core`, 406 in total. The workflow claim is checked
  where it has to hold rather than on a fixture: adding a proposed assessment
  changes none of 542 bottle states at six dates, no resolved window on any of
  98 wines, and no verdict on any of 294 consumptions — and accepting the same
  document changes exactly the six bottles of its own wine. The second half is
  what stops the first from passing vacuously, which it briefly did
- The Studio reads its dataset from `SANITY_STUDIO_DATASET`, so Stage 4b's
  writes can be rehearsed against a copy before production sees them. The App
  does **not**: the same variable, the same `sanity build`, and the App bundle
  ignores it silently while the Studio folds it to a literal. Its dataset is a
  hand-edited constant instead, and the masthead shows the name whenever it is
  not production — the failure being guarded against is the Studio writing to
  one cellar while the App reports another, with every number consistent and
  wrong
- `studio/scripts/seed-proposed-assessment.mts` generates one proposed
  assessment for a non-production dataset, so the workflow can be exercised
  before the agent that will normally create them exists. It is the 4b
  pipeline with the model replaced by a literal: every system-fixed field is
  derived exactly as 4b will derive it, and only the window, confidence and
  note are hand-written. It refuses to name `production`, validates against
  the rules the schema would apply, and prints the write command rather than
  writing
- An audit of the whole test suite for the shape the invariance test briefly
  had — asserting no effect with nothing proving the effect exists. Two found,
  both confirmed by deleting the clause they claim to test and watching them
  pass, then rewritten with fixtures that isolate it and verified the same
  way. `isDrinkSoon` now gets a HOLD bottle whose window closes *inside* the
  twelve-month horizon, so only the state guard can return false. The
  opened-in-period clause turned out to be isolable after all, under exactly
  the condition session 7 predicted: a period extending past the `now` being
  asked about. The original fixture is kept as a second test, renamed to say
  what it actually proves — that for ordinary periods the state gate does the
  excluding

### Stage 3: the App

All four views of the stage are built: Cellar Health, the asOf control, Drink
Soon, and Missed Opportunities.

- **Missed Opportunities.** Bottles that were at peak during a period, were
  never opened, and are past window today. The period is the twelve months
  ending at `asOf`, derived rather than chosen so the app keeps one date
  control. The calendar year containing `asOf` was measured and rejected:
  every `drinkUntil` normalizes to 31 December, so no window closes mid-year,
  so the regret set for the current calendar year is empty by construction —
  that design would have been empty on load every time. Twelve months ending
  on 31 December is that calendar year, so the control reaches the oracle's
  periods exactly
- `now` is today and the period comes from `asOf`, and the view states both
  dates unconditionally. Binding `now` to `asOf` was measured too: it reads
  zero across the whole interesting stretch of the ledger and then climbs into
  the future, because dragging forward retroactively ruins bottles that might
  still be drunk
- Rows group by wine, as Drink Soon does. Each carries the lost count against
  the wine's at-peak total, what became of the rest, the window's provenance,
  and when inside the period the bottles were at peak — compressed to a
  phrase, because the raw intervals are seventeen identical date ranges in the
  oracle's 2023 period and a late start is the only informative case
- 101 new tests in `app/`, in two files kept apart on purpose: the oracle
  tests assert that the rendered rows expand back to exactly the bottle set in
  `expected-misses.csv`, one assertion per row and a complete set comparison
  per period, and the derivation tests cover the period arithmetic at every
  one of the slider's 17,168 positions. `@cellar/core` already drives that
  oracle against the predicate, so the app suite checks the layer core cannot
  see: grouping, counting, partitioning and ordering
- The app's `tsconfig.json` gains `allowImportingTsExtensions` and `noEmit`.
  `node --test` runs the view modules from source and Node's ESM resolver
  needs explicit extensions on relative imports; `sanity build` was never
  using `tsc` to emit anything
- **ADR 0010's day-four gate passed.** Cellar Health renders live production
  data inside a Sanity App built with the App SDK, and its counts match the
  Stage 2 oracle exactly. The Next.js fallback is not taken; `web/` stays as a
  surviving option rather than a plan
- `app/` joins the workspace as a fourth member, importing `@cellar/core` for
  both resolution and display names. One `useQuery` runs `CELLAR_QUERY` on the
  published perspective; every count is `bottleState()` evaluated per bottle
- `now` switched from the fixed gate date to the viewer's calendar date. The
  clock is read in the app, never in `@cellar/core`
- App SDK moved from the template's pinned v2 to v3.4.0, and four
  documentation defects found along the way are recorded in the friction log
- **The asOf control.** One date drives the whole view, set two ways: a range
  slider spanning 1996 to 2042 for the sweep, and a date field for exact days.
  `asOf` is React state in `App`, passed to `bottleState()` as a parameter;
  the clock is still read once, in the app, never in `@cellar/core`. Moving it
  cannot refetch — `asOf` is not among `useQuery`'s options, because
  `CELLAR_QUERY` is not filtered by date
- Cellar Health reworked around the date. The headline total is now bottles
  *in the cellar* on that date rather than the ledger's 542, which was a false
  statement at any past date; states are grouped into in-cellar and outside-
  the-cellar, with `NOT_YET_OWNED` muted rather than hidden; and wording
  switches between "as of", a past-tense distance, and "projected to" with a
  stated assumption when the date is in the future. `NOT_YET_OWNED` is
  relabelled "Not yet acquired" in the view only — the state value in
  `@cellar/core` is untouched, and the oracle CSVs still match
- `app/` gains a test suite on Node's test runner, matching `@cellar/core`:
  18 tests over the control's date arithmetic, including every one of the
  slider's 17,167 positions and the calendar-delta anchor identity across
  5,568 date pairs. Written after a borrow bug reached a working component and
  survived every date the view is normally driven to
- A performance bug from the gate build, found by measuring rather than
  reading: one `useMemo` keyed `[data, asOf]` ran `buildCellar` on every date
  change. Indexing costs ~6 ms, re-tallying 542 bottles costs ~0.07 ms, so the
  control would have paid a hundredfold overcharge per keystroke. Split into
  two memos. The same numbers ruled out debouncing, which at 0.07 ms against a
  16.7 ms frame would only have made the counts trail the slider

### Stage 2: temporal resolution

- `packages/cellar-core` (`@cellar/core`): the three predicates, window
  resolution, the state machine, derived verdicts, missed opportunities, and
  `wineDisplayName`. Framework-neutral — no client, no GROQ execution, no
  clock reads
- Repository is now an npm workspace so the Studio, the App, Functions and the
  Next.js fallback can all import one copy of the rules. `sanity build`
  confirmed the package bundles correctly with Studio auto-updates enabled
- 389 tests, no dependencies beyond Node's test runner. 352 of them drive
  three independently generated oracle tables — states and verdicts, missed
  opportunities computed by evaluating every calendar day, and verdict drift
  across all 294 consumptions. Every one passed on its first run against the
  module
- One spec error found and fixed: the missed-opportunities boundary set
  omitted `assessedAt`, which made it possible to miss a peak entirely.
  Recorded under "Changes during implementation" in
  `docs/temporal-resolution.md`

### Stage 1: schemas and import (in progress)

- Six document types in Studio: producer, wine, bottle, acquisition,
  consumption, assessment
- Content model corrected against the Sanity schema API before any code was
  written. Two spec errors found and fixed, recorded under "Changes during
  implementation" in `docs/content-model.md`

## 2026-09-21: Seed dataset accepted

- `sample_data/` holds 542 bottles across 98 wines, 1996 to 2026, as a
  chronological event ledger
- Drinking windows follow per-style rules for Oregon Pinot Noir, Riesling, and
  Marechal Foch; 2020 Oregon wines removed
- All eight demo moments pass `check.py`
- Real data exposed an ambiguity in ADR 0006: a 1999 personal assessment
  outranks every later critic assessment. Documented, not yet resolved

## 2026-09-18: Scaffold (Session 0)

- Sanity Studio scaffolded from the `clean` template in `studio/`
- Next.js 16.3.5 app scaffolded in `web/`, deliberately left unwired as the
  ADR 0010 fallback
- Sanity MCP server configured for Claude Code
- Vendor agent-setup prompt deliberately not run; reasons in the friction log

## 2026-09-18: Design complete

- Content model, temporal resolution spec, seed data plan, build plan, and
  article outline written before any implementation
- ADRs 0001 through 0011, including Path Two entry (0009), the App SDK as the
  temporal surface (0010), and assessment review as a workflow (0011)
- `CLAUDE.md` project instructions, `LICENSE` (MIT)