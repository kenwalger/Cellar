import type {Cellar} from './cellar.js'
import {addMonths} from './dates.js'
import {resolvedWindow} from './resolve.js'
import type {BottleStateResult, IsoDate} from './types.js'

/**
 * Predicate 1: existence.
 *
 * An event dated on day T counts as having happened as of T, so both
 * comparisons are inclusive. A bottle acquired in 2021 is invisible in a 2019
 * view, which is the reason acquisition is an event and not a field. ADR 0004.
 */
export function acquired(cellar: Cellar, bottleId: string, asOf: IsoDate): boolean {
  const acquisition = cellar.acquisitionByBottle.get(bottleId)
  return acquisition !== undefined && acquisition.acquiredAt <= asOf
}

export function consumed(cellar: Cellar, bottleId: string, asOf: IsoDate): boolean {
  const consumption = cellar.consumptionByBottle.get(bottleId)
  return consumption !== undefined && consumption.consumedOn <= asOf
}

export function inCellar(cellar: Cellar, bottleId: string, asOf: IsoDate): boolean {
  return acquired(cellar, bottleId, asOf) && !consumed(cellar, bottleId, asOf)
}

/**
 * Predicate 3: state.
 *
 * A bottle whose document is missing, or which points at a wine that is not
 * in the snapshot, resolves no window and therefore reads UNASSESSED. The
 * underlying breakage is recorded as a violation at build time rather than
 * being reported through the state machine.
 */
export function bottleState(cellar: Cellar, bottleId: string, asOf: IsoDate): BottleStateResult {
  if (!acquired(cellar, bottleId, asOf)) return {state: 'NOT_YET_OWNED', window: null}
  if (consumed(cellar, bottleId, asOf)) return {state: 'CONSUMED', window: null}

  const wineId = cellar.bottles.get(bottleId)?.wineId
  const window = wineId ? resolvedWindow(cellar, wineId, asOf) : null
  if (!window) return {state: 'UNASSESSED', window: null}

  if (asOf < window.drinkFrom) return {state: 'HOLD', window}
  if (asOf <= window.drinkUntil) return {state: 'DRINKING', window}
  return {state: 'PAST_WINDOW', window}
}

/**
 * DRINK_SOON is a display bucket, not a state: a DRINKING bottle whose window
 * closes within `withinMonths`. Keeping it out of the state machine means the
 * threshold can move without touching the model.
 */
export function isDrinkSoon(result: BottleStateResult, asOf: IsoDate, withinMonths = 12): boolean {
  if (result.state !== 'DRINKING' || !result.window) return false
  return result.window.drinkUntil <= addMonths(asOf, withinMonths)
}
