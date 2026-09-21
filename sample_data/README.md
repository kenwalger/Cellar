# Seed data

A scaffolded cellar history to be edited against reality, not used as-is.

## Files

| File | What it is |
| --- | --- |
| `wines.csv` | Reference list. One row per wine, vintage-specific per ADR 0003. |
| `ledger.csv` | The event log. One row per event, date ordered, 2014 to 2026. |
| `generate.py` | What produced them. Re-run to regenerate after editing the inputs. |
| `check.py` | Applies the temporal resolution rules and verifies the eight demo moments. |

## Current shape

```
wines            105
bottles          576
consumed         332
in cellar        244
ledger rows     1084

HOLD               9
DRINKING         195
PAST_WINDOW       36
UNASSESSED         4
```

The timeline runs 1996 to 2026, though everything except the Mouton starts in
2014.

All eight demo moments from `docs/seed-data-plan.md` pass. Run `check.py` after
any edit to confirm they still do.

The cellar is larger than the seed plan's original 100 to 130 bottle target.
That is a consequence of the real buying cadence: two clubs at six bottles a
quarter for five years, plus Brooks quarterly from 2014 to 2022, produces
roughly 560 acquisitions across the decade. Consumption is modelled to leave
about 237 bottles on hand, which is what a cellar looks like when acquisition
outpaces drinking. That is also the premise of the application, so the size is
arguably a feature.

If it proves unwieldy during the build, trimming rows from a CSV is trivial.
Expanding one is not.

## Ledger columns

```
date | type | wine | bottle | sourceType | sourceName | drinkFrom | drinkUntil | note
```

- `type` is `acquire`, `assess`, or `consume`.
- `wine` matches `wine_id` in `wines.csv`.
- `bottle` is a stable handle like `brooks-pinot-noir-2017-c`. Blank on
  assessments, which attach to the wine rather than a bottle.
- `sourceType` on assessments is `personal`, `producer`, `critic`, `merchant`,
  or `other`. Authority order per ADR 0006.
- `drinkFrom` and `drinkUntil` are years. Normalize to January 1 and
  December 31 at import, per the temporal spec.
- `note` is the tasting note on consumptions, the assessment rationale on
  assessments.

Assessments carry no `reviewState` column. Everything here is hand-authored
history, so all of it imports as `accepted` per ADR 0011. The `proposed` state
only appears when the agent starts creating assessments during the build.

## What is real and what is not

**Real:** the producers, their varietals, roughly when membership started and
stopped, the club cadence, and Willamette vintage character. 2020 Pinot is
absent on purpose, since wildfire smoke meant most producers declassified or
did not bottle it.

**Invented:** every vintage assignment, every drinking window, every critic,
and every tasting note. Critic assessments are attributed to four invented
publications, Cascadia Wine Review, The Vintner's Ledger, Northwest Cellar
Notes, and Pacific Vintage Quarterly, rather than to any real writer. Do not
swap those for real names. Attributing a fabricated window to a working critic
in a public submission is not worth the texture it would buy.

## What to edit first

In rough order of how much the realism improves per minute spent:

1. **Vintages you actually bought.** The generator assigns vintages by release
   lag. Correct them in `wines.csv` where you remember the real ones.
2. **Producer windows for the wines you can ask about.** You know these
   people. A real window from the person who made the wine is the single
   highest-value correction available, and it is the tier that beats critics.
3. **Your own tasting notes.** The personal assessments are the ones that will
   appear in screenshots and in the article. Generated notes read like
   generated notes. Ten real ones are worth a hundred invented.
4. **The quiet 2023.** Consumption is deliberately suppressed that year so
   Missed Opportunities has something to find. Adjust if a different year is
   the honest one.
5. **Gifts and grocery buys.** Currently generic Lodi Zinfandel and California
   Cabernet. Name the real ones if you remember them.

## The hand-specified cases

These carry demo moments the generated history does not reliably produce.
Edit carefully, and re-run `check.py` afterwards.

**1993 Chateau Mouton Rothschild, Balthus label.** Six bottles bought on
release in 1996, delayed by the label controversy. One opened in 1996 and
much admired. One opened in 1999 in a blind tasting against considerably
cheaper bottles, where it did not win. Four untouched since, labels pristine,
capsules tight, fill still in the neck.

This is the dataset's clearest argument that past-window is not the same as
worthless, and it is the example to put in the article. It also carries a
problem the specs did not anticipate, described below.

**Paradis Estate Marechal Foch 2021.** The producer called it long-lived, you
found it fading, and the bottles bear that out. Six bottles producing `EARLY`,
`IN_WINDOW`, and `LATE` verdicts, with three still past window. This is the
one wine that demonstrates the whole verdict mechanism at once.

**Farm on Golden Hill.** Personal assessments through 2025 recording the
peanut aroma, collapsing the windows, and cancelling the club. Explains why
those bottles sit unopened and supplies most of the regret set.

## What this dataset revealed about ADR 0006

The Mouton has no personal assessment after March 1999. It has critic
assessments from 2008 and 2019, both more generous than that 1999 note.

Under ADR 0006, authority beats recency without qualification, so resolution
takes the highest tier with any visible assessment and then the most recent
within that tier. The personal tier is non-empty, so a twenty-seven year old
tasting note wins, and every critic note written since is ignored.

That is arguably correct. It is your palate and your cellar, and the 1999
note was formed on the wine in question. It is also arguably wrong, since a
personal assessment made when the wine was six years old is being applied to
a bottle that is now thirty-three, and no amount of subsequent evidence can
displace it.

Either way the rule needs to state which it intends, because right now it
decides this case by accident rather than on purpose. Options worth
considering:

1. Leave it. Authority is absolute, and a stale personal note is the price.
2. Age out a tier. A personal assessment older than N years drops to the next
   tier down, or stops resolving.
3. Surface the conflict rather than resolving it. Show that the resolved
   window is decades old and that newer claims exist and disagree.

Option 3 is the most interesting for the article, since it is exactly what
Sanity Context does with contradictory sources, and it is the behaviour a
provenance-first system should probably have. Do not change the rule during
Stage 1. Note it, build the specified behaviour, and let the demo surface the
tension.

## Import

`generate.py` writes CSV. The transform to NDJSON for `sanity dataset import`
is a separate step and is part of Stage 1.

One bottle document per bottle handle, one acquisition and at most one
consumption per bottle, assessments referencing wines. No dates on `bottle`
documents. See `docs/content-model.md`.


## Disclaimer1
**About the data.** The cellar is loosely based on a real one. The producers, appellations, and club memberships are real, and some of the history is too. Everything evaluative is not. Drinking windows, scores, critic notes, and most tasting notes are invented for the purpose of the demo, and critic assessments are attributed to publications that do not exist. Nothing here should be read as a factual claim about any wine, and nothing attributed to a named producer reflects anything they have actually said.