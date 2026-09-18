# ADR 0006: Conflicting assessments resolve by authority, then recency

Date: 2026-08-31
Status: Accepted

## Context

Once windows are claims rather than fields, something has to decide which
claim is current. The obvious rule, newest wins, is wrong. It would let a
critic's assessment published last month override the owner's own tasting note
from a bottle opened two years ago.

## Decision

Source type is an enum with a fixed authority order: personal, producer,
critic, merchant, other. Resolution takes the highest tier that has any
assessment visible as of T, then the most recent within that tier, with ties
broken by creation timestamp.

No confidence scoring engine in V1. The `confidence` field is recorded and
displayed but does not participate in resolution.

## Consequences

- The rule is stateable in one sentence, which matters because the article has
  to state it.
- Authority becomes part of the data model rather than a convention in
  someone's head. This is the governance point that transfers directly to
  content operations.
- If a judging category rewards sophistication here, confidence-weighted
  resolution is an obvious extension rather than a rewrite.
- Seed data must include at least two wines where authority visibly overrides
  recency, or the decision is invisible in the demo.
