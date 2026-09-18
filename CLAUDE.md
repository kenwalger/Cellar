# The Cellar

A structured wine cellar built on Sanity, where cellar state at any point in
time is derived from an event log rather than stored as current inventory.
Entry for the DEV Challenge Path Two, "Vibe-Code Something Strange", due
October 4, 2026.

## Stack

TypeScript throughout. Sanity Studio, the Sanity App SDK, Sanity Functions,
GROQ. Node. No Python anywhere in this project.

Development is on Windows with PowerShell. Sanity's quickstarts often assume a
Unix shell, so adapt commands rather than pasting them, and flag it when a
documented command does not work as written.

## Read these first

The design is specified before implementation. These documents are
authoritative and were written deliberately:

- `docs/content-model.md` describes the six document types, their fields, and
  the validation rules and invariants.
- `docs/temporal-resolution.md` describes the predicates, window resolution,
  the state machine, and the edge cases. This is the core of the project.
- `docs/adr/` holds the decision records. These are decisions, not
  suggestions. Several record an option that was considered and rejected.
- `docs/build-plan.md` holds the stage ladder, the cut list, and the gates.
- `docs/seed-data-plan.md` describes the event ledger and the demo moments the
  seed data must produce.

When implementing something these documents cover, follow them. If a spec
looks wrong, say so and explain why rather than quietly doing something else.
Discovering that a spec was wrong is a useful outcome and needs to be recorded,
not worked around.

## Design rules that must not be violated

These are the load-bearing decisions. Breaking one silently breaks the
project's central feature.

1. **Cellar state is derived, never stored as truth.** Acquisition and
   consumption are separate documents with their own dates. `bottle` carries
   no dates. Any status field is a projection maintained by a Function and is
   treated as cache. Every projection must be reproducible from events and
   accepted assessments alone.

2. **Drinking windows are claims, not fields.** Windows live on `assessment`
   documents with a source, a source type, and an `assessedAt` date. Nothing
   overwrites a window. Never add `drinkFrom` or `drinkUntil` to `wine`.

3. **Windows resolve by authority, then recency.** Tier order is personal,
   producer, critic, merchant, other. Take the highest tier with any visible
   assessment, then the most recent within that tier. Ties break on
   `_createdAt` descending.

4. **Only accepted assessments resolve.** An assessment carries `reviewState`
   of proposed, accepted, or rejected. Agents create proposed. People accept.
   Proposed and rejected assessments never affect a window.

5. **Verdicts are derived, never authored.** A consumption records facts only.
   Verdict compares `consumedAt` against the window resolved as of
   `consumedAt`, not as of now. There is no verdict field.

6. **The resolution module is framework-neutral.** It is imported by the App
   SDK app and by Functions. It must not depend on React, on Next.js, or on
   anything that would make a fallback expensive.

## Conventions

- Dates: `drinkFrom` given as a year becomes January 1, `drinkUntil` becomes
  December 31. Store dates, display years. Comparisons are date-level except
  `consumedAt`, which keeps its time.
- Derived fields use a naming convention marking them as projections. Confirm
  whether Sanity permits leading underscores on custom fields before adopting
  that form; underscore is reserved for system fields.
- Cross-document invariants (one acquisition per bottle, at most one
  consumption, no consumption before acquisition) cannot be enforced by schema
  validation. They surface as dataset health warnings.

## How to work in this repo

- Do not invent Sanity APIs. If you are unsure whether a function, hook, or
  configuration option exists, say so and check the documentation rather than
  producing plausible code. Confidently wrong API surface is the single most
  expensive failure mode here, and when it happens it is worth noting.
- Prefer small, verifiable steps. The Stage 2 module is verified against a
  hand-computed expected-output table written before the code existed. Do not
  adjust the table to match the code.
- Scope is controlled by `docs/build-plan.md`. There is a cut list and a set
  of explicit non-goals. No pairing engine, no chatbot, no vector search, no
  authentication. Do not add features that are not on the plan.
- When something in Sanity is surprising, confusing, poorly documented, or
  delightful, mention it. It goes in `docs/friction-log.md`, which feeds the
  first judging criterion.

## About the writeup

This entry is judged first on the quality and honesty of the build process
writeup. That means the prompts that failed matter as much as the ones that
worked, and where a model got stuck is material rather than embarrassment.

The specs in this repo were written before any code. Whether that helped is an
open question the writeup has to answer honestly. If spec-first prompting
turns out to be overhead, that is the finding.