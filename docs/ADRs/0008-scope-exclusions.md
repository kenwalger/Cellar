# ADR 0008: Scope exclusions

Date: 2026-08-31
Status: Accepted, amended by ADR 0011

## Context

The build window is roughly two weeks alongside other work. Several obvious
features were considered and rejected, and recording why prevents them being
relitigated at the point when time is shortest.

## Decision

Excluded from V1:

**Food pairing.** The most saturated demo genre in this space. A strong
implementation would still make the entry look like everything else in the
pile. The interesting question is not what to drink with dinner, it is what
you are about to lose.

**Chatbot interface.** Bolting a conversational layer onto a CMS is the
default AI demo and it is ornamental here. The one AI surface is a schema
aware Agent Action that converts a free-text tasting note into a structured,
attributed assessment. AI's job in this project is to turn human observation
into governed structured content, not to answer questions.

**Vector search and RAG.** The model is a graph with authority rules. Flattening
it into embeddings would discard exactly the structure the article argues for.

**Authentication, multi-user, multi-cellar, bottle movement, ownership
transfer, purchase lots, condition tracking.** Each is another event type and
none earns its keep.

## Consequences

- The build is small enough to finish early, which leaves time for the
  article and the polish that actually gets noticed.
- If a judging category specifically rewards one of these, the decision can be
  revisited with the cost already understood.
- The Agent Action is deliberately small and should not be allowed to grow
  into a chat surface under time pressure.

## Amendment

The single Agent Action described above is now modeled as a three-state review
workflow. See ADR 0011. The exclusions in this record are unchanged.
