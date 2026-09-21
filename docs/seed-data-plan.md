# Seed data plan

The demo lives or dies on this. A cellar generated as a current inventory and
then backfilled with history will produce a time machine with nothing to find.
The data has to be authored as a chronology from the start.

## Method

Write a single chronological ledger by hand, in date order, as a flat table.
One row per event. Then transform it into NDJSON at build time.

The ledger is authored content and can be written before September 16. The
transform script is code and waits.

Ledger columns:

```
date | type | wine | bottleRef | sourceType | sourceName | drinkFrom | drinkUntil | note
```

Where `type` is one of `acquire`, `assess`, `consume`. Bottle references are
short local handles like `cristom18-a` that the transform resolves into
document IDs.

Writing it in date order is what forces the data to make sense. You cannot
accidentally consume a bottle you have not bought yet if you are working
forward through time.

The ledger has no `reviewState` column, and it does not need one: every
assessment in it is hand-authored. The transform sets `reviewState: accepted`
on all seeded assessments. It has to be written explicitly, because
`initialValue` is a Studio mechanism and does not apply to imported documents,
and an assessment with no `reviewState` resolves no window at all. Proposed
assessments enter later, from the Agent Action, not from the ledger.

## Volume targets

| Thing | Target | Reasoning |
| --- | --- | --- |
| Producers | 10 to 12 | Enough variety, few enough to hand-write |
| Wines | 30 to 40 | Vintage-specific, so several vintages of a few producers |
| Bottles | 100 to 130 | Multiple bottles per wine is essential; single bottles cannot show verdict spread |
| Acquisitions | 100 to 130 | One per bottle |
| Consumptions | 50 to 60 | Roughly half the cellar drunk over the timeline |
| Assessments | 80 to 100 | Averaging two to three per wine, unevenly distributed |

Timeline spans 2016 through August 2026. Ten years is enough for windows to
open and close, and short enough to hand-author.

## Regional shape

Mostly Willamette Valley, which is both accurate to the setting and useful,
because Oregon Pinot has genuinely contested drinking windows and vintage
variation. Add a handful of contrast wines: a Northern Rhone syrah with a long
window, a couple of whites with short ones, one Champagne, one Barolo that
will not be ready until 2032.

The whites matter. A short window that opens and closes inside the timeline
gives the state machine something fast-moving to show.

## Demo moments the data must guarantee

Design these in deliberately, then check them after the ledger is written.
If the data does not produce these, the features have nothing to display.

1. **Regret set is non-empty now.** At least 3 bottles currently
   `PAST_WINDOW` with no consumption. At least one should be a wine where
   other bottles were drunk in window, so the contrast is visible.

2. **A specific bad year.** Pick March 2023 as the demo asOf date. At that
   moment at least 8 bottles are `DRINKING`, and only 2 consumptions occur in
   all of 2023. This is the screenshot.

3. **Authority actually overrides recency.** At least 2 wines where a personal
   assessment predates a later critic assessment, and the personal window is
   the one that wins. Without this, ADR 0006 is invisible.

4. **The feedback loop fires.** One wine where a tasting note in, say, 2022
   shortened the window, and the remaining bottles were then consumed earlier
   than the original producer window suggested. This is the `derivedFrom`
   chain and it is the best single illustration of why assessments are
   documents.

5. **An unassessed wine.** At least 2 wines with bottles and no assessment at
   all, so `UNASSESSED` appears in the dashboard rather than being a state
   that only exists in the spec.

6. **Verdict spread within one wine.** One wine with at least 4 bottles whose
   consumptions produce `EARLY`, `IN_WINDOW`, and `LATE`.

7. **A window that was revised after a bottle was opened.** So the UI can say
   the bottle was in window at the time, and would be judged differently now.
   This makes the "resolve as of the moment" rule tangible.

8. **A bottle bought already past window.** One acquisition where the
   resolved window had closed before the purchase date. Cheap to include and
   it exercises an edge case.

## Realism notes

- Consumption should cluster. Nobody opens bottles at a uniform rate.
  Holidays, a birthday, a run of three in one week, then four quiet months.
- Acquisition should cluster harder. Release allocations arrive in batches of
  three or six.
- Assessments should be sparse and irregular. Producer windows at release,
  critic windows a year or two later, personal notes only when a bottle was
  actually opened.
- Tasting notes should read like real notes, meaning short, inconsistent, and
  occasionally contradicting the previous one. These are also the input to the
  Agent Action demo, so at least a few should be genuinely messy free text.

## Fictional or real

Use real producers and real appellations for texture, but treat every window,
score, and note as invented. Do not attribute a fabricated drinking window to
a named critic. Attribute those to invented publication names, or to
`sourceType: critic` with a generic source name.

This costs nothing and avoids putting words in a real person's mouth in a
public submission.
