import type {Cellar} from './cellar.js'
import {AUTHORITY_ORDER, type IsoDate, type ResolvedWindow} from './types.js'

/**
 * Predicate 2: window resolution.
 *
 * Authority first, recency second. Take the highest tier with any assessment
 * visible as of `asOf`, then the most recent claim within that tier. A
 * critic's assessment from last month does not override your own tasting note
 * from two years ago. See ADR 0006.
 *
 * Accepted claims only; `buildCellar` has already filtered the rest out.
 *
 * Returns null when no accepted assessment for the wine is visible yet, which
 * is a real condition rather than an error: it is what makes a bottle read
 * UNASSESSED.
 */
export function resolvedWindow(
  cellar: Cellar,
  wineId: string,
  asOf: IsoDate,
): ResolvedWindow | null {
  const candidates = cellar.acceptedByWine.get(wineId)
  if (!candidates || candidates.length === 0) return null

  let visibleCount = 0
  for (const candidate of candidates) {
    if (candidate.assessedAt <= asOf) visibleCount++
  }
  if (visibleCount === 0) return null

  for (const tier of AUTHORITY_ORDER) {
    // `candidates` is pre-sorted by the full comparator, so the first visible
    // match in a tier is the winner for that tier.
    for (const candidate of candidates) {
      if (candidate.sourceType !== tier) continue
      if (candidate.assessedAt > asOf) continue
      return {
        drinkFrom: candidate.drinkFrom,
        drinkUntil: candidate.drinkUntil,
        sourceType: candidate.sourceType,
        sourceName: candidate.sourceName,
        assessedAt: candidate.assessedAt,
        assessmentId: candidate.id,
        visibleCount,
      }
    }
  }

  return null
}
