# ADR 0012: Projections carry the date they were computed, and claims carry how they were drafted

Date: 2026-09-23
Status: Accepted
Amends: `docs/content-model.md`, and grows the model beyond ADR 0011

## Context

Stage 4 is the first stage that writes. Designing it surfaced three problems
in documents that were written before any code existed, two of them errors in
`content-model.md` and one a gap that only appears once an agent is real.

**A wine has no state.** `content-model.md` lists
`wine.derived.cellarState`, "See the state machine in the temporal spec". The
state machine in `temporal-resolution.md` is `state(bottle, T)`. It is defined
per bottle, and a wine holds bottles in several states at once — of the six
bottles of `paradis-vineyards-estate-marechal-foch-2021`, three are CONSUMED
and three are PAST_WINDOW on the same day. No rule in any spec collapses that
into one value, and inventing one during implementation would be deciding a
model question in a Function.

**Design rule 1 is not satisfiable for a projection that reads a clock.** The
rule says every projection must be reproducible from events and accepted
assessments alone. `bottle.derived.status` is not. A bottle reading HOLD today
reads DRINKING on 1 January with no event anywhere in the dataset, no
assessment having changed, and nothing to trigger a recomputation — Functions
fire on document events, and the passage of time is not one. The same applies
to `wine.derived.windowFrom`, `windowUntil` and `windowSourceType`, since
visibility is `assessedAt <= T`.

This is not a bug in the Function. It is the rule being stated one input
short.

**`derivedFrom` does not record that a model was involved.** ADR 0011 gives
the agent a review state and stops there, on the reasoning that the workflow
is three states and two transitions and should not grow. But an accepted
proposal is, by design, indistinguishable from a claim the owner wrote by
hand: same `sourceType: personal`, same `sourceName: me`, same `derivedFrom`.
The reference is not the distinguishing mark — 38 of the 161 seeded
assessments carry `derivedFrom` and every one was written by a person from a
note they had already read.

Two things are true about an accepted proposal, and the model as it stood
could only express one of them. Accepting a claim makes it the owner's, at the
highest authority tier, outranking every producer and critic claim for that
wine. That a model drafted it stays true afterwards.

## Decision

**1. `wine.derived.cellarState` is removed from the content model.** It is
recorded as a spec error rather than quietly dropped. `bottle.derived.status`
carries state at the level where the state machine defines it.

**2. Every clock-dependent projection carries `derived.asOf`**, a datetime
recording when it was computed. With it, the projection is reproducible from
events, accepted assessments, and a stated date — so design rule 1 is amended
to name the third input rather than weakened to excuse the omission.

**3. `assessment.sourceMethod` records how the window was drafted**, as
`authored` or `extracted`. The agent writes `extracted`; documents created in
the Studio default to `authored`; absence is read as `authored`, which is what
the 161 imported assessments are.

`sourceMethod` is not the authority tier and does not participate in
resolution. The tier says whose claim it is. This says who did the typing.

## Consequences

- The model grows by one field beyond ADR 0011's "three states and two
  transitions. It does not grow beyond that during this build." That sentence
  was about the *workflow*, and the workflow is unchanged: still three states,
  still two transitions out of `proposed`. This is a provenance field on the
  claim, and a project whose central argument is that claims carry their
  provenance cannot leave "a model drafted this" out of the record.
- `derived.asOf` makes staleness visible instead of silent. Nothing in the App
  reads projections — Cellar Health, Drink Soon and Missed Opportunities all
  resolve live from the event log — so a stale projection is a stale label in
  one Studio pane rather than a wrong count. The field is what lets a reader
  see that, rather than trusting a number computed three months ago.
- Nothing recomputes on the passage of time, and this ADR does not add
  anything that does. A nightly scheduled Function would close the gap;
  scheduled functions are organization-scoped, requiring a one-way
  `blueprints promote` and an explicit robot token, which is a larger change
  than a stale label justifies. Revisit if a projection is ever read by
  something that matters.
- The 161 existing assessments have no `sourceMethod`. Backfilling them is a
  write to production and is deferred to Stage 4b, alongside the first writes
  the agent makes. Until then the absence rule carries them, and only
  `extracted` is ever rendered — labelling the ordinary case would put a word
  on every row of the review queue to say nothing.
- `reviewState` and `sourceMethod` are both `readOnly` in the Studio form. The
  first is because the Accept and Reject actions are the workflow and a
  workflow you can bypass with a radio button is decorated rather than
  modelled. The second is because it records how a document came to exist,
  which the code that created it knows and an editor revising it later would
  be guessing at. Neither is enforcement: the Content Lake accepts any write
  without consulting the schema, which is exactly how the import, the agent,
  and the review actions themselves set these fields.

---

## Amendment, 28 September 2026: the projections are cut

Status of this amendment: Accepted.
Supersedes decision 2 above, and removes the fields decision 1 left standing.

### What is cut

The `recompute-wine` Function is not being built. With it go every field this
ADR's decision 2 introduced:

- `wine.derived` — `bottlesOnHand`, `bottlesConsumed`, `windowFrom`,
  `windowUntil`, `windowSourceType`, `asOf`
- `bottle.derived` — `status`, `asOf`
- the `wineDerived` and `bottleDerived` object types

**They are removed from the schema rather than left declared and empty.**

The removal is free and reversible, which is what makes it the right call
rather than merely the tidy one. No Function ever ran, so **no document in the
dataset has a `derived` key at all**. Removing the declaration changes nothing
in the Content Lake, needs no migration, and touches no data. No schema is
deployed, so it is not a production write. No test references the fields. The
App never read them — Cellar Health, Drink Soon and Missed Opportunities all
resolve live from the event log, which was already recorded above.

The argument for leaving them is that they record intent. But intent is what an
ADR is for, and this is the ADR. A schema is a description of what documents
contain, and a schema that declares eight fields no document has and no code
writes is a to-do list wearing a description's clothes. The concrete cost of
leaving them is on screen: a collapsed, greyed `Derived` panel, empty on all
640 wines and bottles, on the surface the Stage 4a review workflow is
demonstrated on. An empty panel reads as broken, not as deferred.

### What else in the repository assumes they exist

| Location | What it assumes |
| --- | --- |
| `studio/schemaTypes/derived.ts` | the whole file — both object types |
| `studio/schemaTypes/wine.ts` | the `derived` field declaration |
| `studio/schemaTypes/bottle.ts` | the `derived` field declaration, and a comment describing `derived.status` as a cache |
| `studio/schemaTypes/index.ts` | imports both object types, and a header comment describing a "Projections" layer |
| `docs/content-model.md` | field tables for both objects, the `derived.asOf` rationale, and the note that there is no `derived.cellarState` |
| `docs/build-plan.md`, Stage 4 | "Functions on publish of `consumption`, `acquisition`, and assessment" |
| `docs/stage-5-polish.md`, items 5 and 6 | the past-window badge and structure-by-state are recorded as blocked on this Function |
| `sanity.blueprint.ts`, `functions/cellar-core-probe/` | the ADR 0010 bundling probe, which `recompute-wine` was to replace |

Nothing in `app/`, `packages/cellar-core/`, or any test refers to them.

### Why, stated as three separate costs rather than one

The reasoning is not "the cache is unnecessary". It is that a projection here
buys one thing, cannot buy a second, and the third thing it would buy is real
and is being given up knowingly.

**1. The computation it would cache costs 0.07 ms.** Measured in session 4: a
full re-tally of all 542 bottle states is 0.07 ms at p50. Building the index
that the tally runs over is about 6 ms and happens once per fetch. So a
projection would cache the cheaper half of an operation that is already
imperceptible. This is the weakest of the three arguments and it is the one
usually given first.

**2. A projection cannot answer this project's question at all.** `state` is a
function of a bottle *and a date*. A stored field has room for one of those.
This ADR already conceded the point by requiring `derived.asOf` — a field whose
entire job is to admit that the value beside it is true on one day and unknown
on every other. The App's premise is the asOf control, which is the act of
asking at many dates, and a projection can serve exactly one of them. It was
never going to serve the primary view; it was only ever for the Studio.

**3. A projection is also what makes state queryable, and that cost is real and
is being paid now.** Without it, grouping bottles by cellar state in the Studio
requires re-implementing authority-then-recency resolution in GROQ.

`docs/temporal-resolution.md` is precise about this and is worth quoting rather
than paraphrasing: expressing authority-tiered resolution in a single GROQ
query is *"possible and unreadable, and it would need rewriting the first time a
tier is added."* Not impossible. The objection is duplication and legibility,
not capability — a second implementation of the load-bearing rule, in a second
language, in a place the test suite does not reach.

That is why `docs/stage-5-polish.md` items 5 and 6 — the past-window badge on
bottles and the Studio structure organised by state — are recorded as blocked.
They are blocked now, at 542 bottles, for a reason that has nothing to do with
scale. Cutting the Function means accepting that the Studio stays organised by
document type rather than by state.

### What breaks first at scale

Recorded because the obvious defence of a projection is "it will matter when
the cellar is large", and measurement says it will matter in a different place
than expected.

| | Today | ×100 | ×2767 (1.5M bottles) |
| --- | ---: | ---: | ---: |
| Bottles | 542 | 54,200 | 1,499,714 |
| `CELLAR_QUERY` payload | **211.9 KB** | 20.7 MB | **572.6 MB** |
| Full state tally | 0.07 ms | ~7 ms | ~200 ms |

Measured against production on 28 September: 1,637 documents, 211.9 KB, about
400 bytes per bottle.

At 1.5 million bottles the linear scan reaches roughly 200 ms — slow enough to
feel on a slider drag, not slow enough to break anything. Fetching the whole
ledger into a browser at that size means **572 MB of JSON**, parsed and indexed
client-side, which does not work at all. The fetch becomes impractical somewhere
around 20 MB, near 50,000 bottles — roughly **two orders of magnitude before
the scan becomes noticeable**.

So the answer at scale is a scoped query, not a projection. A projection would
not save the fetch; it would only change what the fetch returns, and the thing
that has to change is *how much of the ledger crosses the network at once*.
`WINE_SCOPED_QUERY` already exists in `@cellar/core` for exactly this, which
means the scale answer is already in the codebase and the Function was never it.

### Consequences of the amendment

- Decision 2 of this ADR is withdrawn. `derived.asOf` was the right answer to a
  real problem, and the problem goes away with the projection that had it.
- Decision 1 stands unchanged and is now moot in practice: `wine.derived.cellarState`
  was already removed as a spec error, and the object it would have lived in is
  now removed too. It remains recorded as an error, because it was one.
- Decision 3, `assessment.sourceMethod`, is untouched. It is a provenance field
  on a claim, not a projection, and Stage 4b writes it.
- Design rule 1 — "every projection must be reproducible from events and
  accepted assessments alone" — is satisfied vacuously. There are no
  projections. The rule is retained rather than deleted because the next person
  to propose one needs to meet it, and because the amendment this ADR originally
  made to it (naming the date as a third input) is the correct answer if one is
  ever built.
- The Studio stays organised by document type. Polish items 5 and 6 are not
  deferred pending a Function; they are cut with it, and should be restated in
  `docs/stage-5-polish.md` as cut rather than blocked.
- `sanity.blueprint.ts` and `functions/cellar-core-probe/` now have no successor
  and are dead. ADR 0010's bundling finding — that `@cellar/core` imports
  cleanly into a Function — stands on its own as a recorded result; it simply
  has no consumer in this build.
- **Nothing about this amendment touches the dataset.** No migration, no
  unset, no schema deploy.
