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
