# ADR 0007: Two surfaces, Studio and frontend

Date: 2026-08-31
Status: Superseded by ADR 0010

## Context

Sanity Studio has no native global date control that filters an entire
workspace, so the asOf experience cannot live there. Attempting to make one
interface do everything would mean either a weak time machine or a weak
authoring experience.

## Decision

Two complementary surfaces, presented as a deliberate split rather than a
limitation.

Studio handles authoring and governance: acquisitions, consumptions,
assessments, source typing, the window input component, dataset health, and
the Agent Action that structures tasting notes.

The frontend handles the temporal view: cellar health, Drink Soon, the asOf
control, Missed Opportunities.

## Consequences

- The demo needs screenshots of both, and the article structure should account
  for that.
- The framing is an improvement rather than a compromise. Studio shows how
  knowledge enters the system and how it is governed. The application shows
  what becomes possible because it was modeled correctly.
- The temporal resolution module must be importable by the frontend and by
  Functions, so it cannot live inside a React component.

## Superseded

The App SDK, named as a bonus in the published brief, provides the custom
interface this ADR concluded was unavailable. See ADR 0010. The reasoning
about Studio's lack of a global date control remains correct; the conclusion
that a separate frontend was therefore required does not.
