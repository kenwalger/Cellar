import {toEpochMs, toUtcDate} from './dates.js'
import type {
  AcquisitionInput,
  AssessmentInput,
  BottleInput,
  CellarSnapshot,
  ConsumptionInput,
  IsoDate,
  Violation,
  WineInput,
} from './types.js'

/** A consumption with its UTC calendar date precomputed. */
export interface ConsumptionRecord extends ConsumptionInput {
  consumedOn: IsoDate
}

/** An accepted assessment with its tie-break key precomputed. */
export interface AssessmentRecord extends AssessmentInput {
  createdAtMs: number
}

/**
 * An indexed, immutable view of the cellar.
 *
 * Built once and queried many times: missed opportunities alone evaluates
 * hundreds of bottles at a dozen boundary dates each, and rescanning flat
 * arrays per call would be wasteful for no benefit.
 */
export interface Cellar {
  readonly wines: ReadonlyMap<string, WineInput>
  readonly bottles: ReadonlyMap<string, BottleInput>
  readonly acquisitionByBottle: ReadonlyMap<string, AcquisitionInput>
  readonly consumptionByBottle: ReadonlyMap<string, ConsumptionRecord>
  /**
   * Accepted assessments per wine, pre-sorted by the full resolution
   * comparator so that the first match in a tier is the winner.
   */
  readonly acceptedByWine: ReadonlyMap<string, readonly AssessmentRecord[]>
  /** Cross-document invariant breaches found while indexing. */
  readonly violations: readonly Violation[]
}

/**
 * Orders assessments within a tier: `assessedAt` descending, then
 * `_createdAt` descending, then `_id` descending.
 *
 * The `_id` key is what makes the ordering total. A bulk import stamps every
 * document with the same `_createdAt` — in the seed dataset all 161
 * assessments share one — so without it, same-tier same-day claims would
 * resolve in whatever order the transport happened to return. See ADR 0006.
 */
export function compareAssessments(a: AssessmentRecord, b: AssessmentRecord): number {
  if (a.assessedAt !== b.assessedAt) return a.assessedAt < b.assessedAt ? 1 : -1
  if (a.createdAtMs !== b.createdAtMs) return b.createdAtMs - a.createdAtMs
  if (a.id !== b.id) return a.id < b.id ? 1 : -1
  return 0
}

/**
 * Indexes a snapshot.
 *
 * Where the data breaks a cross-document invariant the module records a
 * violation and keeps going on a stated rule: the earliest acquisition and
 * the earliest consumption win. Throwing would take down every view over one
 * bad row, and these invariants are precisely the ones schema validation
 * cannot enforce.
 */
export function buildCellar(snapshot: CellarSnapshot): Cellar {
  const violations: Violation[] = []

  const wines = new Map<string, WineInput>()
  for (const wine of snapshot.wines) wines.set(wine.id, wine)

  const bottles = new Map<string, BottleInput>()
  for (const bottle of snapshot.bottles) {
    if (!bottle.wineId || !wines.has(bottle.wineId)) {
      violations.push({
        kind: 'BOTTLE_WITHOUT_WINE',
        id: bottle.id,
        detail: bottle.wineId
          ? `references missing wine "${bottle.wineId}"`
          : 'has no wine reference',
      })
    }
    bottles.set(bottle.id, bottle)
  }

  const acquisitionByBottle = new Map<string, AcquisitionInput>()
  for (const acquisition of snapshot.acquisitions) {
    if (!acquisition.bottleId) {
      violations.push({
        kind: 'EVENT_WITHOUT_BOTTLE',
        id: acquisition.id,
        detail: 'acquisition has no bottle reference',
      })
      continue
    }
    const existing = acquisitionByBottle.get(acquisition.bottleId)
    if (existing) {
      violations.push({
        kind: 'DUPLICATE_ACQUISITION',
        id: acquisition.bottleId,
        detail: `acquired more than once (${existing.id}, ${acquisition.id}); earliest wins`,
      })
      if (acquisition.acquiredAt >= existing.acquiredAt) continue
    }
    acquisitionByBottle.set(acquisition.bottleId, acquisition)
  }

  const consumptionByBottle = new Map<string, ConsumptionRecord>()
  for (const consumption of snapshot.consumptions) {
    if (!consumption.bottleId) {
      violations.push({
        kind: 'EVENT_WITHOUT_BOTTLE',
        id: consumption.id,
        detail: 'consumption has no bottle reference',
      })
      continue
    }
    const record: ConsumptionRecord = {
      ...consumption,
      consumedOn: toUtcDate(consumption.consumedAt),
    }
    const existing = consumptionByBottle.get(record.bottleId)
    if (existing) {
      violations.push({
        kind: 'DUPLICATE_CONSUMPTION',
        id: record.bottleId,
        detail: `consumed more than once (${existing.id}, ${record.id}); earliest wins`,
      })
      if (record.consumedOn >= existing.consumedOn) continue
    }
    consumptionByBottle.set(record.bottleId, record)
  }

  for (const [bottleId, consumption] of consumptionByBottle) {
    const acquisition = acquisitionByBottle.get(bottleId)
    if (!acquisition) continue
    if (consumption.consumedOn < acquisition.acquiredAt) {
      violations.push({
        kind: 'CONSUMPTION_BEFORE_ACQUISITION',
        id: bottleId,
        detail: `consumed ${consumption.consumedOn}, acquired ${acquisition.acquiredAt}`,
      })
    }
  }

  for (const bottleId of bottles.keys()) {
    if (!acquisitionByBottle.has(bottleId)) {
      violations.push({
        kind: 'BOTTLE_WITHOUT_ACQUISITION',
        id: bottleId,
        detail: 'no acquisition; excluded from every view',
      })
    }
  }

  // Only accepted assessments are indexed. A proposed claim sitting in the
  // review queue has no effect on any window until a person accepts it, and a
  // rejected one never does. ADR 0011.
  const grouped = new Map<string, AssessmentRecord[]>()
  for (const assessment of snapshot.assessments) {
    if (!assessment.wineId || !wines.has(assessment.wineId)) {
      violations.push({
        kind: 'ASSESSMENT_WITHOUT_WINE',
        id: assessment.id,
        detail: assessment.wineId
          ? `references missing wine "${assessment.wineId}"`
          : 'has no wine reference',
      })
      continue
    }
    if (assessment.reviewState !== 'accepted') continue

    const record: AssessmentRecord = {...assessment, createdAtMs: toEpochMs(assessment.createdAt)}
    const list = grouped.get(record.wineId)
    if (list) list.push(record)
    else grouped.set(record.wineId, [record])
  }

  const acceptedByWine = new Map<string, readonly AssessmentRecord[]>()
  for (const [wineId, list] of grouped) {
    acceptedByWine.set(wineId, list.sort(compareAssessments))
  }

  return {wines, bottles, acquisitionByBottle, consumptionByBottle, acceptedByWine, violations}
}
