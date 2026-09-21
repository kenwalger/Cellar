# ADR 0006: Conflicting assessments resolve by authority, then recency

Date: 2026-08-31
Status: Accepted, amended 2026-09-21

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

## Amendment, 2026-09-21

The tie-break gains a second key: `_createdAt` descending, then `_id`
descending.

This record assumed `_createdAt` was sufficient to make resolution
deterministic, which holds for documents authored one at a time in the Studio.
It does not hold for the seed data. A bulk import stamps every document it
writes with essentially the same creation timestamp, so two same-tier,
same-day assessments arrive as a genuine tie and the order they resolve in can
vary between queries.

`_id` is an arbitrary key, and that is acceptable here. The rule's job at this
point is to be total and stable rather than meaningful: any two assessments
still tied after authority, `assessedAt`, and `_createdAt` are, by
construction, equally authoritative claims made on the same day. What matters
is that the resolution module and the expected-output table agree, every time.

The seed data currently contains no same-tier, same-day ties, so nothing in
the demo depends on this. It is recorded because the absence of a tie today is
a property of the ledger, not a guarantee, and the expected-output table is
written before the code.
