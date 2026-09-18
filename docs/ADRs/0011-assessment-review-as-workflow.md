# ADR 0011: Assessment review is modeled as a workflow

Date: 2026-09-18
Status: Accepted
Amends: ADR 0008

## Context

ADR 0008 named a single Agent Action as the project's only AI surface: free
text tasting note in, structured assessment out.

The published brief names Workflows as a bonus, described as modeling a
process as data next to the content so that an agent can move a draft forward
and a person can approve it through the same transitions.

The tasting-note path already is that process. It was simply not modeled.

## Decision

An assessment carries an explicit review state: `proposed`, `accepted`, or
`rejected`.

The agent creates assessments in `proposed` and never in `accepted`. A person
transitions them through the same modeled states the agent uses. Rejected
assessments remain in the dataset rather than being deleted.

Only `accepted` assessments participate in window resolution.

## Consequences

- `resolvedWindow` gains a filter. This is a real change to the temporal
  resolution spec, not a presentational detail, and the expected-output table
  must be written against accepted assessments only.
- Rejected assessments staying in the dataset is consistent with the project's
  central claim. Nothing is overwritten and nothing is destroyed, including
  claims that were considered and declined.
- The Studio gains a genuine review queue, which is more interesting to
  demonstrate than an action that silently writes documents.
- The AI's role becomes precisely stateable: it converts human observation
  into a structured proposal, and a person decides whether the proposal
  becomes a claim. That sentence is worth putting in the article.
- Scope risk. The workflow is three states and two transitions. It does not
  grow beyond that during this build.
