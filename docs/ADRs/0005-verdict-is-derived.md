# ADR 0005: Consumption verdict is derived, never authored

Date: 2026-08-31
Status: Accepted

## Context

An early draft placed a `verdict` field on `consumption` with values such as
early, in window, and late. That makes the verdict a human judgement typed at
some unspecified moment, disconnected from the assessments that should
determine it.

## Decision

`consumption` records facts only: the bottle, the datetime, the occasion, and
the tasting note as written. Verdict is computed by comparing `consumedAt`
against the window resolved as of `consumedAt`.

## Consequences

- Missed Opportunities, cellar health, historical state, and verdict
  distribution all become consumers of one temporal resolution function
  instead of four features independently approximating the same idea.
- An assessment written after a bottle was opened cannot retroactively change
  that bottle's verdict, which is correct: that information was not available
  at the time.
- The UI gains a genuinely interesting sentence to display, comparing the
  verdict at the time against what a later revision would have said.
