# ADR 0001: Cellar state is event-sourced

Date: 2026-08-31
Status: Accepted

## Context

The application's headline feature is an asOf control that reconstructs the
cellar at any past date. An early draft of the model put a `status` field on
`bottle` and nested consumption inside it.

A stored status holds exactly one value, today's. GROQ has no temporal join
and will not reconstruct prior values. Sanity's own document revision history
records who edited what, which is an editorial audit trail, not domain time.
Building the time machine on revision history means fighting the platform.

## Decision

The event log is the source of truth. Acquisition and consumption are
independent documents with their own dates. Every state, count, and bucket is
derived by evaluating those events against an asOf date.

Stored status fields may exist as projections, maintained by Functions, and
are treated as cache. Any projection that cannot be recomputed from events and
assessments alone is a bug in the model.

## Consequences

- Every view becomes a caller of one resolution module rather than reading a
  field. This is more code up front and less code per feature after.
- Retrofitting this later would be expensive, which is why it is decided
  before implementation starts.
- Projections must be recomputed when an assessment is added, not only when a
  bottle event occurs, because a new assessment can change the state of every
  bottle of that wine.
- The dataset carries more documents than a conventional inventory. At the
  planned scale, roughly 250 event and claim documents, this is irrelevant.
