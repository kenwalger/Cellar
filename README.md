# The Cellar

Design workspace for a [DEV Challenge entry sponsored by Sanity](https://dev.to/challenges/sanity-2026-09-16). Contest runs
September 18 to October 4, 2026. Entering Path Two, "Vibe-Code Something
Strange", per [ADR 0009](docs/ADRs/0009-enter-path-two.md).

## What this is

A structured wine cellar built on [Sanity](https://www.sanity.io/), where the cellar's state at any point
in time is derived from an event log rather than stored as current inventory.
The application answers a question a flat inventory cannot: what was true then,
not just what is true now.

The accompanying article uses the cellar to make a content architecture
argument. Wine has a drinking window. So does documentation. The difference
between the two is where the argument ends up.

## Where this stands

Stage 0 is complete: every document here was written before a line of code
existed. That is not incidental. Path Two is judged first on the quality and
honesty of the build process writeup, and the comparison between spec-first
prompting and vibe-coding is what this entry has to say.

The build starts now. Capture goes in `docs/friction-log.md` daily, not at
the end.

## Documents

| Path | Purpose |
| --- | --- |
| `docs/content-model.md` | Document types, fields, references, validation rules, invariants |
| `docs/temporal-resolution.md` | The asOf predicates, window resolution, state machine, edge cases |
| `docs/seed-data-plan.md` | Ledger design, volume targets, and the demo moments the data must guarantee |
| `docs/build-plan.md` | Stage ladder, cut list, and how to adapt when the brief drops |
| `docs/article-outline.md` | Structure and spine of "Your Content Has a Drinking Window" |
| `docs/friction-log.md` | Live capture of surprises, confusions, and documentation gaps during the build |
| `docs/adr/` | Decision records, one per decision |

## Decision records

| ADR | Decision |
| --- | --- |
| [0001](docs/ADRs/0001-event-sourced-cellar-state.md) | Cellar state is event-sourced; stored status is a projection |
| [0002](docs/ADRs/0002-assessments-as-dated-claims.md) | Drinking windows are dated, attributed assessments, not fields on a wine |
| [0003](docs/ADRs/0003-collapse-wine-and-vintage.md) | Wine and vintage collapse into a single document |
| [0004](docs/ADRs/0004-acquisition-as-event.md) | Acquisition and consumption are independent event documents |
| [0005](docs/ADRs/0005-verdict-is-derived.md) | Consumption verdict is derived, never authored |
| [0006](docs/ADRs/0006-assessment-resolution-authority-then-recency.md) | Conflicting assessments resolve by source authority, then recency |
| [0007](docs/ADRs/0007-two-surfaces.md) | Two surfaces: Studio authors and governs, the frontend travels in time. Superseded by 0010. |
| [0008](docs/ADRs/0008-scope-enclusions.md) | Scope exclusions, including no pairing engine. Amended by 0011. |
| [0009](docs/ADRs/0009-enter-path-two.md) | Enter Path Two; defer Path One behind a September 28 gate |
| [0010](docs/ADRs/0010-time-machine-as-sanity-app.md) | The temporal view is a Sanity App built on the App SDK |
| [0011](docs/ADRs/0011-assessment-review-as-workflow.md) | Assessment review is modeled as a three-state workflow |

## The spine

> Do not store only what is true now when your application may need to know
> what was true then.

The word "only" is load-bearing. Most systems should store current state. The
architectural decision is recognizing when historical truth is itself a
requirement.
