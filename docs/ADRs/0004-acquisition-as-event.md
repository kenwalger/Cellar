# ADR 0004: Acquisition and consumption are independent events

Date: 2026-08-31
Status: Accepted

## Context

Consumption was obviously an event. Acquisition was floated as optional
metadata on `bottle`, on the grounds that a bottle is acquired once and never
again.

But a bottle acquired in 2021 must be invisible in a 2019 asOf view. With
acquisition as a field, that filter still has to be written; it is simply
written inconsistently with everything else.

## Decision

Both are separate documents referencing `bottle`, each carrying its own date.
`bottle` carries no dates at all.

## Consequences

- The core predicates become uniform. Existence, availability, and window all
  resolve the same way: find the events on or before T.
- A view of acquisitions over time becomes free, and it produces a good
  screen: what you were buying while something else went past window.
- Cross-document invariants, one acquisition per bottle and at most one
  consumption, cannot be enforced by schema validation. They become Function
  checks surfaced as dataset health warnings.
