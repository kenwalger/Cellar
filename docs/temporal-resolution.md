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

All comparisons are date-level, not datetime, except `consumedAt`, which
keeps its time for ordering multiple bottles opened the same evening.

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
                   ties broken by _createdAt descending
    return null
```

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

Computing `peaked` exactly requires evaluating the state at interval
boundaries rather than sampling. The boundaries that matter are: period start,
period end, each `drinkFrom` and `drinkUntil` from assessments visible in the
period, and each acquisition date in the period. Evaluating at those points is
sufficient because state only changes at them.

Sampling monthly would be simpler and would be wrong in ways nobody would
notice in a demo. Do it properly anyway. It is a small amount of extra logic
and the correctness is part of the argument.

## Edge cases

| Case | Behaviour |
| --- | --- |
| asOf earlier than every event | Empty cellar. Valid, not an error. |
| Bottle with no acquisition | Excluded from all views. Flagged as a dataset health violation. |
| Consumption predating acquisition | Flagged. Do not attempt to interpret it. |
| Two assessments, same tier, same day | Tie-break on `_createdAt` descending. |
| Assessment revised by editing rather than adding | Prevented by convention and by an ADR, not by the schema. Worth a note in the Studio UI. |
| Wine with assessments but no bottles | Valid. It is a wish list entry. Exclude from cellar counts. |
| Wine whose only assessments are proposed | Resolves to null, so its bottles read `UNASSESSED`. Correct, and a useful nudge toward the review queue. |
| Assessment accepted after a bottle was opened | Does not change that bottle's verdict. Acceptance date is irrelevant; `assessedAt` is what the resolution uses. |
| Window entirely in the past at acquisition | Valid and interesting. Someone bought a bottle already past window. |
| `drinkUntil` in the far future | No special handling. Some wines really are 2060. |

## Where this code lives

The resolution logic is written once, in the frontend, in TypeScript. Sanity
Functions call the same logic to maintain projections, which means it needs to
be importable by both rather than living inside a React component.

GROQ does the filtering and fetching. It does not do the state machine.
Trying to express authority-tiered resolution in a single GROQ query is
possible and unreadable, and it would need rewriting the first time a tier is
added.
