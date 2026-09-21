# Changelog

Milestone-level history of The Cellar. For decisions and their reasoning see
`docs/ADRs/`. For the experience of building it see `docs/friction-log.md`.
For every change, see the git log.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Stages refer to `docs/build-plan.md`.

## [Unreleased]

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