# ADR 0003: Wine and vintage collapse into a single document

Date: 2026-08-31
Status: Accepted

## Context

A four-level hierarchy of producer, wine, vintage, bottle mirrors how
bibliography separates work, edition, issue, and copy. It is defensible. But
in practice a wine is identified by producer plus label plus year, and the
abstract label document would carry almost no fields and appear in no query.

Every reference hop is GROQ to write and Studio navigation for a reader to
follow.

## Decision

`wine` is vintage-specific. The 2018 and 2019 bottlings of the same vineyard
are two documents. `vintageYear` is a field on `wine`.

## Consequences

- Cross-vintage queries, such as every vintage of one bottling, are done by
  grouping on producer plus cuvee rather than by following a reference. This
  is acceptable at the planned scale.
- If a genuine cross-vintage requirement appears, adding the abstraction later
  is cheaper than carrying an unused hop through every query from day one.
- The producer document survives, but thinly, and it is first on the cut list.
