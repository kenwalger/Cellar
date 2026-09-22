import type {Cellar} from './cellar.js'
import {resolvedWindow} from './resolve.js'
import type {IsoDate, ResolvedWindow, Verdict, VerdictDriftResult, VerdictResult} from './types.js'

function judge(consumedOn: IsoDate, window: ResolvedWindow | null): Verdict {
  if (!window) return 'UNKNOWN'
  if (consumedOn < window.drinkFrom) return 'EARLY'
  if (consumedOn <= window.drinkUntil) return 'IN_WINDOW'
  return 'LATE'
}

/**
 * The derived verdict for a bottle that has been opened.
 *
 * Note which date resolves the window: `consumedOn`, not today. An assessment
 * written after the bottle was opened cannot change that bottle's verdict,
 * which is exactly right, because you did not have that information at the
 * time. There is no verdict field anywhere in the model. ADR 0005.
 *
 * Returns null for a bottle that has not been opened.
 */
export function consumptionVerdict(cellar: Cellar, bottleId: string): VerdictResult | null {
  const consumption = cellar.consumptionByBottle.get(bottleId)
  if (!consumption) return null

  const wineId = cellar.bottles.get(bottleId)?.wineId
  const windowAtConsumption = wineId ? resolvedWindow(cellar, wineId, consumption.consumedOn) : null

  return {
    verdict: judge(consumption.consumedOn, windowAtConsumption),
    consumedOn: consumption.consumedOn,
    windowAtConsumption,
  }
}

/**
 * The verdict at the time of drinking alongside the one today's window would
 * give the same opening.
 *
 * This is the sentence ADR 0005 asks the UI to show: "in window when you
 * opened it, though the 2027 revision would have called it late." The bottle's
 * actual verdict never changes; `verdictNow` is a counterfactual about what a
 * later claim would have said, not a correction.
 */
export function verdictDrift(
  cellar: Cellar,
  bottleId: string,
  now: IsoDate,
): VerdictDriftResult | null {
  const atTime = consumptionVerdict(cellar, bottleId)
  if (!atTime) return null

  const wineId = cellar.bottles.get(bottleId)?.wineId
  const windowNow = wineId ? resolvedWindow(cellar, wineId, now) : null
  const verdictNow = judge(atTime.consumedOn, windowNow)

  return {
    ...atTime,
    verdictNow,
    windowNow,
    changed: verdictNow !== atTime.verdict,
  }
}
