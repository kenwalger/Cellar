/**
 * @cellar/core — temporal resolution for The Cellar.
 *
 * Cellar health, Drink Soon, the asOf view, Missed Opportunities, and
 * consumption verdicts are all callers of what is in here. If this module is
 * right, those features are mostly presentation.
 *
 * Framework-neutral by design rule 6: no React, no Next.js, no Sanity client,
 * no GROQ execution, no network, and no clock reads. `asOf` and `now` are
 * always parameters. The same inputs always produce the same outputs, which
 * is what lets the whole thing be checked against an oracle table written
 * before the code existed.
 */

export {buildCellar, compareAssessments} from './cellar.js'
export type {AssessmentRecord, Cellar, ConsumptionRecord} from './cellar.js'

export {
  addDays,
  addMonths,
  isIsoDate,
  normalizeWindowBound,
  toEpochMs,
  toUtcDate,
  windowEndOfYear,
  windowStartOfYear,
} from './dates.js'

export {resolvedWindow} from './resolve.js'
export {acquired, bottleState, consumed, inCellar, isDrinkSoon} from './state.js'
export {consumptionVerdict, verdictDrift} from './verdict.js'
export {drinkingIntervals, missedOpportunities} from './missed.js'
export {wineDisplayName} from './display.js'
export type {WineDisplayInput} from './display.js'

export {CELLAR_QUERY, WINE_SCOPED_QUERY, toCellarSnapshot} from './queries.js'
export type {RawCellarResult} from './queries.js'

export {AUTHORITY_ORDER} from './types.js'
export type {
  AcquisitionInput,
  AssessmentInput,
  BottleInput,
  BottleState,
  BottleStateResult,
  CellarSnapshot,
  ConsumptionInput,
  IsoDate,
  IsoDateTime,
  MissedOpportunity,
  PeakInterval,
  Period,
  ResolvedWindow,
  ReviewState,
  SourceTier,
  Verdict,
  VerdictDriftResult,
  VerdictResult,
  Violation,
  ViolationKind,
  WineInput,
} from './types.js'
