# Build plan

Revised September 18 against the published brief. Entries due October 4,
11:59pm PDT. Sixteen days. Path Two, per ADR 0009.

## What the brief actually rewards

Path Two judging criteria, in their order:

1. Quality and honesty of the build process writeup
2. Functionality of the finished app
3. Thoughtfulness of the schema behind it
4. Creativity and originality

Bonuses named explicitly: App SDK, and Workflows modeled as data beside the
content.

Criterion 1 is capture, not writing, and it has to happen daily or it cannot
happen at all. Criterion 3 is already done and sitting in `content-model.md`.

## Stage 0: complete

Specs, ADRs, event ledger, article outline. Written before any code existed,
which is itself the writeup's central claim.

## Stage 1: schemas and Studio, days 1 to 2

Six document types including `reviewState` on assessment. Studio running.
Ledger imported. Nothing derived, nothing pretty.

Success test: a GROQ query returns every consumption in 2023 with its bottle
and wine resolved.

## Stage 2: temporal resolution, days 3 to 4

The three predicates, the state machine, the verdict function, as a
framework-neutral TypeScript module with no UI attached. Accepted assessments
only.

Success test: outputs match the hand-computed expected table for ten bottles
at four asOf dates, written from the ledger before the code existed.

The module must stay importable by a Sanity App, by a Next.js route, and by
Functions. ADR 0010's fallback depends on this.

## Stage 3: the App, days 5 to 8

Built with the App SDK, per ADR 0010. Cellar health, Drink Soon, the asOf
control, Missed Opportunities.

Decision gate at end of day 4: if the App SDK is not rendering real data,
fall back to a Next.js frontend and keep the attempt as friction log material.
Do not extend the gate.

Missed Opportunities is last of the four deliberately.

## Stage 4: workflow and agent, days 9 to 10

- Workflow: assessment review as `proposed`, `accepted`, `rejected`, with a
  review queue in Studio
- Agent Action: free-text tasting note to a `proposed` assessment with
  `derivedFrom` set
- Functions on publish of `consumption`, `acquisition`, and assessment
  acceptance, recomputing projections

The workflow and the agent are one feature, not two. The agent proposes, a
person decides. Neither half is interesting alone.

## Stage 5: polish, days 11 to 13

- Studio custom input: drinking window as a bar with today marked
- Badge on past-window bottles
- Structure organized by state
- Dataset health view

## Stage 6: submission, days 14 to 16

- Demo video, three minutes, asOf control moving
- Submission post on the Path Two template
- Article published separately and linked
- Claude Code transcript curated, checked for keys, uploaded, set public
- Sanity project ID in the post. Required.

Do not leave the video to the last day. It is the artifact most likely to be
cut under time pressure and the one judges are most likely to actually watch.

## Cut list, in order

1. Producer as its own document
2. Dataset health view
3. Studio custom input component
4. Structure Builder customization
5. Missed Opportunities
6. App SDK, falling back to Next.js per the day 4 gate

Do not cut: the event model, the assessment model, the asOf control, the
review workflow, the daily writeup capture.

## Path One gate

Revisit September 28. If Stages 1 through 4 are done and only polish and
writing remain, a second entry against the records corpus is viable. If not,
drop it and do not reopen the question.

## Explicit non-goals

No pairing engine. No chatbot. No vector search. No authentication. No
multi-user support. No inventory import from a third party service. See
ADR 0008.
