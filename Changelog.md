# Changelog

Milestone-level history of The Cellar. For decisions and their reasoning see
`docs/ADRs/`. For the experience of building it see `docs/friction-logs/friction-log.md`.
For every change, see the git log.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Stages refer to `docs/build-plan.md`.

## [Unreleased]

### Stage 3: the App (in progress)

- **ADR 0010's day-four gate passed.** Cellar Health renders live production
  data inside a Sanity App built with the App SDK, and its counts match the
  Stage 2 oracle exactly. The Next.js fallback is not taken; `web/` stays as a
  surviving option rather than a plan
- `app/` joins the workspace as a fourth member, importing `@cellar/core` for
  both resolution and display names. One `useQuery` runs `CELLAR_QUERY` on the
  published perspective; every count is `bottleState()` evaluated per bottle
- `now` switched from the fixed gate date to the viewer's calendar date. The
  clock is read in the app, never in `@cellar/core`
- App SDK moved from the template's pinned v2 to v3.4.0, and four
  documentation defects found along the way are recorded in the friction log

### Stage 2: temporal resolution

- `packages/cellar-core` (`@cellar/core`): the three predicates, window
  resolution, the state machine, derived verdicts, missed opportunities, and
  `wineDisplayName`. Framework-neutral — no client, no GROQ execution, no
  clock reads
- Repository is now an npm workspace so the Studio, the App, Functions and the
  Next.js fallback can all import one copy of the rules. `sanity build`
  confirmed the package bundles correctly with Studio auto-updates enabled
- 389 tests, no dependencies beyond Node's test runner. 352 of them drive
  three independently generated oracle tables — states and verdicts, missed
  opportunities computed by evaluating every calendar day, and verdict drift
  across all 294 consumptions. Every one passed on its first run against the
  module
- One spec error found and fixed: the missed-opportunities boundary set
  omitted `assessedAt`, which made it possible to miss a peak entirely.
  Recorded under "Changes during implementation" in
  `docs/temporal-resolution.md`

### Stage 1: schemas and import (in progress)

- Six document types in Studio: producer, wine, bottle, acquisition,
  consumption, assessment
- Content model corrected against the Sanity schema API before any code was
  written. Two spec errors found and fixed, recorded under "Changes during
  implementation" in `docs/content-model.md`

## 2026-09-21: Seed dataset accepted

- `sample_data/` holds 542 bottles across 98 wines, 1996 to 2026, as a
  chronological event ledger
- Drinking windows follow per-style rules for Oregon Pinot Noir, Riesling, and
  Marechal Foch; 2020 Oregon wines removed
- All eight demo moments pass `check.py`
- Real data exposed an ambiguity in ADR 0006: a 1999 personal assessment
  outranks every later critic assessment. Documented, not yet resolved

## 2026-09-18: Scaffold (Session 0)

- Sanity Studio scaffolded from the `clean` template in `studio/`
- Next.js 16.3.5 app scaffolded in `web/`, deliberately left unwired as the
  ADR 0010 fallback
- Sanity MCP server configured for Claude Code
- Vendor agent-setup prompt deliberately not run; reasons in the friction log

## 2026-09-18: Design complete

- Content model, temporal resolution spec, seed data plan, build plan, and
  article outline written before any implementation
- ADRs 0001 through 0011, including Path Two entry (0009), the App SDK as the
  temporal surface (0010), and assessment review as a workflow (0011)
- `CLAUDE.md` project instructions, `LICENSE` (MIT)