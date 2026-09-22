# Temporal resolution

This is the core of the project. Cellar health, Drink Soon, the asOf view,
Missed Opportunities, and consumption verdicts are all callers of the same
three functions. If this document is right, the features are mostly
presentation.

## Date normalization

Windows are stated by humans in years ("drink 2024 to 2030") and by the
system in dates. Normalize on write:

- `drinkFrom` given as a year Y becomes Y-01-01.
- `drinkUntil` given as a year Y becomes Y-12-31.

Store dates, display years. Doing this the other way around produces
off-by-one-year bugs in the state machine that are painful to find.

All comparisons are calendar-date comparisons. `consumedAt` is the only
datetime in the model, and it is truncated to its **UTC calendar date** before
any comparison; it keeps its time only for ordering multiple bottles opened
the same evening.

An event dated on day T counts as having happened as of T. Every comparison
against an `asOf` date is inclusive at both ends: a bottle acquired on T is
owned on T, an assessment made on T is visible on T, and a bottle is DRINKING
through `drinkUntil` itself.

## Predicate 1: existence

```
acquired(bottle, T)  = exists acquisition a where
                         a.bottle == bottle and a.acquiredAt <= T

consumed(bottle, T)  = exists consumption c where
                         c.bottle == bottle and c.consumedAt <= T

inCellar(bottle, T)  = acquired(bottle, T) and not consumed(bottle, T)
```

A bottle acquired in 2021 is invisible in a 2019 asOf view. This is the reason
acquisition is an event and not a field. See ADR 0004.

## Predicate 2: window resolution

```
visible(wine, T)     = { a in assessments : a.wine == wine
                                        and a.assessedAt <= T
                                        and a.reviewState == accepted }

resolvedWindow(wine, T):
    candidates = visible(wine, T)
    if candidates is empty: return null
    for tier in [personal, producer, critic, merchant, other]:
        tierSet = candidates where sourceType == tier
        if tierSet is not empty:
            return most recent by assessedAt,
                   ties broken by _createdAt descending,
                   then by _id descending
    return null
```

The `_id` key is what makes the tie-break total. A bulk import stamps every
document it writes with essentially the same `_createdAt`, so on imported data
`_createdAt` alone leaves same-tier, same-day assessments in an arbitrary
order that can differ between queries. `_id` is arbitrary too, but it is
stable, which is the property the expected-output table needs. See ADR 0006.

Accepted claims only. A proposed assessment sitting in the review queue has
no effect on any window until a person accepts it, and a rejected one never
does. See ADR 0011.

Authority first, recency second. A critic's assessment from last month does
not override your own tasting note from two years ago. See ADR 0006.

The returned window carries its provenance: the resolved `drinkFrom`,
`drinkUntil`, `sourceType`, `sourceName`, and `assessedAt`. The UI should
always be able to say "window based on 3 assessments, most recent personal,
May 2026" without a second query.

## Predicate 3: state

```
state(bottle, T):
    if not acquired(bottle, T):        return NOT_YET_OWNED
    if consumed(bottle, T):            return CONSUMED
    w = resolvedWindow(bottle.wine, T)
    if w is null:                      return UNASSESSED
    if T < w.drinkFrom:                return HOLD
    if T <= w.drinkUntil:              return DRINKING
    return PAST_WINDOW
```

`DRINK_SOON` is a display bucket, not a state: a `DRINKING` bottle where
`w.drinkUntil - T <= 12 months`. Keeping it out of the state machine means the
threshold can change without touching the model.

`UNASSESSED` is worth surfacing rather than hiding. A bottle nobody has made a
claim about is a real condition, and it is the wine equivalent of a document
with no owner.

## Derived verdict

```
verdict(consumption):
    w = resolvedWindow(consumption.bottle.wine, consumption.consumedAt)
    if w is null:                          return UNKNOWN
    if consumption.consumedAt < w.drinkFrom:  return EARLY
    if consumption.consumedAt <= w.drinkUntil: return IN_WINDOW
    return LATE
```

Note the second argument. The window is resolved as of the moment of drinking,
not as of today. An assessment written after the bottle was opened cannot
change the verdict on that bottle, which is exactly right: you did not have
that information at the time.

This is the single most demonstrable payoff of the whole model, and it should
be visible in the UI as a sentence, something like "in window when you opened
it, though the 2027 revision would have called it late."

## Missed opportunities

For a period [start, end]:

```
peaked(period)   = bottles where state(bottle, T) == DRINKING
                   for at least one T in period

opened(period)   = bottles with a consumption in period

regret(period)   = peaked(period)
                   minus opened(period)
                   restricted to bottles where state(bottle, now) == PAST_WINDOW
```

Computing `peaked` exactly requires evaluating the state at the points where
it can change, rather than sampling. `state(bottle, ·)` is a step function of
five inputs and it moves only where one of them moves:

```
D(bottle) = { acquiredAt }                     NOT_YET_OWNED leaves
          ∪ { consumedOn }                     CONSUMED begins
          ∪ { a.assessedAt  : a accepted }     a new claim becomes visible and
                                               the resolved window may swap
          ∪ { a.drinkFrom   : a accepted }     HOLD becomes DRINKING
          ∪ { dayAfter(a.drinkUntil) : a accepted }
                                               DRINKING becomes PAST_WINDOW

C(bottle) = { period.start } ∪ { d ∈ D(bottle) : period.start < d ≤ period.end }

peaked(bottle) = ∃ T ∈ C(bottle) : state(bottle, T) == DRINKING
```

Evaluating at every point of `C` is sufficient, and the argument is one
sentence: every constant segment of the state function that intersects the
period either begins at a change point inside the period or already contains
`period.start`, so visiting `period.start` plus every in-period change point
visits every segment.

Two details that are easy to get wrong. `assessedAt` is a boundary in its own
right: a newly visible assessment can flip a bottle out of DRINKING without
any window bound being crossed. And the closing boundary is
`dayAfter(drinkUntil)`, not `drinkUntil`, because a bottle is DRINKING
through `drinkUntil` inclusive.

Windows range over every accepted assessment's own bounds, which is safe
because the window that resolves at any instant is always one of them.

Sampling monthly would be simpler and would be wrong in ways nobody would
notice in a demo. Do it properly anyway. It is a small amount of extra logic
and the correctness is part of the argument.

## Edge cases

| Case | Behaviour |
| --- | --- |
| asOf earlier than every event | Empty cellar. Valid, not an error. |
| Bottle with no acquisition | Excluded from all views. Flagged as a dataset health violation. |
| Consumption predating acquisition | Flagged. Do not attempt to interpret it. |
| Two assessments, same tier, same day | Tie-break on `_createdAt` descending, then `_id` descending. The seed data contains no such tie. |
| Assessment revised by editing rather than adding | Prevented by convention and by an ADR, not by the schema. Worth a note in the Studio UI. |
| Wine with assessments but no bottles | Valid. It is a wish list entry. Exclude from cellar counts. |
| Wine whose only assessments are proposed | Resolves to null, so its bottles read `UNASSESSED`. Correct, and a useful nudge toward the review queue. |
| Assessment accepted after a bottle was opened | Does not change that bottle's verdict. Acceptance date is irrelevant; `assessedAt` is what the resolution uses. |
| Window entirely in the past at acquisition | Valid and interesting. Someone bought a bottle already past window. |
| `drinkUntil` in the far future | No special handling. Some wines really are 2060. |

## Known limitations

**UTC truncation moves a late evening opening to the next day.** A consumption
authored at 21:00 Pacific is 04:00Z the following morning, and truncating to
the UTC calendar date lands it a day later than the person who opened the
bottle would say. Every seeded consumption is written at noon UTC, so the
imported data is unaffected, and a one-day shift changes a verdict only when a
bottle is opened on the exact day a window closes.

This is recorded rather than solved. Fixing it means deciding whose calendar
the cellar runs on and carrying that timezone through every comparison, which
is a larger change than the problem currently justifies. Revisit if
consumptions start being authored in the Studio rather than imported.

## Where this code lives

`packages/cellar-core`, published inside the workspace as `@cellar/core`. It
is framework-neutral by design rule 6: no React, no Next.js, no Sanity client,
no GROQ execution, no network, and no clock reads. `asOf` and `now` are always
parameters, which is what makes the module reproducible enough to check
against an expected-output table written before it existed.

Three consumers import it: the Studio, for `wineDisplayName` in previews; the
Sanity App built with the App SDK; and Sanity Functions maintaining
projections. The Next.js fallback in `web/` is a fourth if ADR 0010's gate is
ever taken.

The exported surface is `acquired`, `consumed`, `inCellar`, `resolvedWindow`,
`bottleState`, `consumptionVerdict`, `verdictDrift`, `missedOpportunities`,
`drinkingIntervals`, `isDrinkSoon` and `wineDisplayName`, over a `Cellar`
built by `buildCellar`. `bottleState` and `consumptionVerdict` are what this
document calls `state` and `verdict`; they are renamed only because bare
`state` and `verdict` are unpleasant to import into React components.

GROQ does the filtering and fetching. It does not do the state machine.
Trying to express authority-tiered resolution in a single GROQ query is
possible and unreadable, and it would need rewriting the first time a tier is
added. The module exports the queries as strings — `CELLAR_QUERY` and
`WINE_SCOPED_QUERY` — and each consumer executes them with whatever client it
already has. **Run them against the published perspective**, or an unpublished
draft assessment will change what the cellar says before anyone published
anything.

## Wine display names

`wine.title` is optional. When it is absent the display name is composed as
**vintage, producer, cuvee** — "2018 Cristom Louise Vineyard". That
composition is `wineDisplayName` in the shared module rather than a Studio
preview detail, so the Studio, the App and any Function name a wine
identically. A composition that exists in one surface only is one that drifts.

## Changes during implementation

### 2026-09-22, Stage 2

The module was built and this document met a type checker for the first time.

**Spec error: the missed-opportunities boundary set was incomplete.** The
original text named "period start, period end, each `drinkFrom` and
`drinkUntil` from assessments visible in the period, and each acquisition date
in the period" and asserted that evaluating there was sufficient "because
state only changes at them". It is not, and state does not.

`assessedAt` was missing. A newly visible assessment swaps which window
resolves, and that can flip a bottle out of DRINKING without any window bound
being crossed. The seed data does exactly this:
`paradis-vineyards-estate-marechal-foch-2021` reads DRINKING under the
producer window 2023–2027 until 2024-02-21, when a personal claim replaces it
with 2023–2024 and the bottle is past window from that day forward. A scan
built from the original list evaluates nothing at 2024-02-21 and can report a
bottle as never having peaked when it peaked for fourteen months.

The boundary set above is the corrected one, stated as a discontinuity set
with the sufficiency argument attached so the next reader can check it rather
than trust it. `rules.test.mts` carries a fixture whose only DRINKING interval
begins at an `assessedAt`, which the original boundary list would have missed
entirely.

Two smaller corrections in the same section: the closing boundary is the day
*after* `drinkUntil`, since a bottle is DRINKING through `drinkUntil` itself;
and "period end" is unnecessary once the set is expressed as segment starts,
though it is harmless to include.

The refinements:

- **Comparison semantics stated precisely.** "All comparisons are date-level
  except `consumedAt`, which keeps its time" invited comparing a datetime
  against dates. `consumedAt` is now truncated to its UTC calendar date before
  any comparison and keeps its time only for same-day ordering, and every
  `asOf` comparison is documented as inclusive at both ends.
- **"Where this code lives" rewritten.** It described a separate frontend,
  which ADR 0010 superseded. It now names `packages/cellar-core`, the exported
  surface, and the published-perspective requirement.
- **`state` and `verdict` are exported as `bottleState` and
  `consumptionVerdict`.** Bare `state` and `verdict` are unpleasant to import
  into React components. The rules are unchanged.
- **`wineDisplayName` recorded here**, since `build-plan.md` assigned it to
  this module but no document defined the composition. Canonical order is
  vintage, producer, cuvee.
- **UTC truncation recorded as a known limitation** rather than solved.

Two rules in this document have no coverage from the expected-output tables,
and the reason is a property of the seed data rather than an oversight. All
161 assessments are `accepted`, so "only accepted assessments resolve" is
never exercised; and all 161 have distinct wine, tier and `assessedAt` keys,
so the tie-break never fires. Both are covered by synthetic fixtures in
`rules.test.mts`, which is consistency checking rather than independent
verification, and the file says so at the top.
