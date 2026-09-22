/** An ISO 8601 calendar date, `YYYY-MM-DD`. Every temporal comparison uses these. */
export type IsoDate = string

/** A full ISO 8601 instant. Only `consumedAt` is stored this way. */
export type IsoDateTime = string

/**
 * Assessment authority tiers, in resolution order. The highest tier with any
 * visible assessment wins outright; recency only breaks ties inside a tier.
 * See ADR 0006.
 */
export const AUTHORITY_ORDER = ['personal', 'producer', 'critic', 'merchant', 'other'] as const

export type SourceTier = (typeof AUTHORITY_ORDER)[number]

export type ReviewState = 'proposed' | 'accepted' | 'rejected'

export type BottleState =
  'NOT_YET_OWNED' | 'CONSUMED' | 'UNASSESSED' | 'HOLD' | 'DRINKING' | 'PAST_WINDOW'

export type Verdict = 'EARLY' | 'IN_WINDOW' | 'LATE' | 'UNKNOWN'

// --- Input shape -----------------------------------------------------------
//
// Flat and id-keyed. Every reference is already resolved to an id, so the
// module never follows a pointer it would have to fetch.

export interface WineInput {
  id: string
  title?: string | null
  cuvee?: string | null
  vintageYear?: number | null
  producerName?: string | null
  appellation?: string | null
}

export interface BottleInput {
  id: string
  wineId: string
  format?: string | null
  location?: string | null
}

export interface AcquisitionInput {
  id: string
  bottleId: string
  acquiredAt: IsoDate
}

export interface ConsumptionInput {
  id: string
  bottleId: string
  consumedAt: IsoDateTime
}

export interface AssessmentInput {
  id: string
  wineId: string
  sourceType: SourceTier
  sourceName: string
  assessedAt: IsoDate
  drinkFrom: IsoDate
  drinkUntil: IsoDate
  reviewState: ReviewState
  /** The document's `_createdAt`. Second key in the tie-break. */
  createdAt: IsoDateTime
}

export interface CellarSnapshot {
  wines: readonly WineInput[]
  bottles: readonly BottleInput[]
  acquisitions: readonly AcquisitionInput[]
  consumptions: readonly ConsumptionInput[]
  assessments: readonly AssessmentInput[]
}

// --- Output shape ----------------------------------------------------------

/**
 * A resolved drinking window, carrying its provenance so the UI can say where
 * the window came from and how many claims stand behind it without a second
 * query.
 */
export interface ResolvedWindow {
  drinkFrom: IsoDate
  drinkUntil: IsoDate
  sourceType: SourceTier
  sourceName: string
  assessedAt: IsoDate
  assessmentId: string
  /** Accepted assessments for this wine visible as of the resolution date. */
  visibleCount: number
}

export interface BottleStateResult {
  state: BottleState
  window: ResolvedWindow | null
}

export interface VerdictResult {
  verdict: Verdict
  /** `consumedAt` truncated to its UTC calendar date. */
  consumedOn: IsoDate
  windowAtConsumption: ResolvedWindow | null
}

/**
 * The verdict at the time of drinking alongside the verdict today's window
 * would give the same bottle. ADR 0005 asks the UI to show this sentence.
 */
export interface VerdictDriftResult extends VerdictResult {
  verdictNow: Verdict
  windowNow: ResolvedWindow | null
  /** True when a later claim would have judged the same opening differently. */
  changed: boolean
}

export interface Period {
  start: IsoDate
  end: IsoDate
}

export interface PeakInterval {
  from: IsoDate
  until: IsoDate
}

export interface MissedOpportunity {
  bottleId: string
  wineId: string
  /** Sub-intervals of the period during which the bottle read DRINKING. */
  peakIntervals: PeakInterval[]
  windowNow: ResolvedWindow | null
}

// --- Dataset health --------------------------------------------------------

export type ViolationKind =
  | 'DUPLICATE_ACQUISITION'
  | 'DUPLICATE_CONSUMPTION'
  | 'CONSUMPTION_BEFORE_ACQUISITION'
  | 'BOTTLE_WITHOUT_ACQUISITION'
  | 'BOTTLE_WITHOUT_WINE'
  | 'EVENT_WITHOUT_BOTTLE'
  | 'ASSESSMENT_WITHOUT_WINE'

/**
 * A cross-document invariant that schema validation cannot enforce. Recorded
 * rather than thrown: bad data should surface in a health view, not take down
 * every view that touches it.
 */
export interface Violation {
  kind: ViolationKind
  /** The document that carries the problem. */
  id: string
  detail: string
}
