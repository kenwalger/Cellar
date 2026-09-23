import {
  bottleState,
  inCellar,
  isDrinkSoon,
  wineDisplayName,
  type Cellar,
  type IsoDate,
  type ResolvedWindow,
} from '@cellar/core'

/**
 * What Drink Soon lists, computed rather than rendered.
 *
 * Pure, synchronous, no React, and `asOf` is a parameter — the same properties
 * that make `@cellar/core` checkable against a table, for the same reason.
 * Everything here is arithmetic over `bottleState` results, so it belongs in a
 * file a test can import without a DOM. `DrinkSoon.tsx` only draws it.
 *
 * This is not in `@cellar/core`. The module already exports the predicate;
 * grouping by wine, sorting for a screen and counting the rows of an empty
 * state are presentation decisions, and design rule 6 keeps the module free of
 * them.
 *
 * Named `drinkSoonRows` rather than `drinkSoon` because `DrinkSoon.tsx` sits
 * beside it. Two files differing only in case resolve to whichever one the
 * filesystem feels like on Windows and macOS, and to different files on Linux;
 * `tsc` caught it here as TS1149 before it could become a build that works on
 * one machine and not another.
 */

/**
 * The horizon, fixed.
 *
 * Every `drinkUntil` in the dataset is 31 December, because a window given as
 * a year normalizes to one. Closing dates are therefore year-quantized and the
 * count is a step function with at most one step per year: at 2026-09-18 the
 * list holds 23 bottles at every horizon from 4 months to 14, then jumps to
 * 49. A control across that range would be flat for most of its travel, and a
 * slider that changes nothing teaches the reader the number is arbitrary.
 *
 * One consequence, left in place deliberately and recorded in the friction
 * log: a 12-month horizon over year-quantized bounds means exactly "closes
 * this calendar year", since `asOf + 12 months` always lands in the next year
 * but before its 31 December — except on 31 December itself, where it reaches
 * the following one and the view picks up two years at once.
 */
export const DRINK_SOON_MONTHS = 12

/**
 * One row is one wine, not one bottle.
 *
 * The resolved window is a property of the wine: `resolvedWindow` takes a wine
 * id, so every in-cellar bottle of a wine shares one window, one closing date
 * and one provenance on any given date. Per-bottle rows would print the same
 * provenance five consecutive times for the same underlying claim, which is
 * the opposite of what a view about provenance should do.
 */
export interface DrinkSoonRow {
  wineId: string
  /** `wineDisplayName`, so the Studio and every view name a wine identically. */
  name: string
  /** Bottles of this wine that are drink-soon on the date. Counted per bottle. */
  bottleCount: number
  window: ResolvedWindow
}

export interface DrinkSoonSummary {
  rows: DrinkSoonRow[]
  /** Bottles across all rows. The headline number. */
  bottleCount: number
  inCellarCount: number
  drinkingCount: number
  holdCount: number
  pastWindowCount: number
  unassessedCount: number
  /**
   * Earliest `drinkUntil` among DRINKING bottles, null when none are drinking.
   * This is what lets the empty state say how far away the next closing is
   * instead of only that there is nothing to show.
   */
  nearestClose: IsoDate | null
}

/**
 * Soonest closing first, then most bottles, then name, then wine id.
 *
 * The tail of that key is doing the visible work rather than padding it out.
 * Because every bound is 31 December, whole screens share a single
 * `drinkUntil` — all twelve rows at 2026-09-18 close at the end of 2026 — so
 * ordering on the date alone would leave the list in Map iteration order. Five
 * bottles closing outranks one closing. `wineId` last makes the order total,
 * for the same reason `_id` closes the assessment comparator in ADR 0006.
 */
export function compareDrinkSoonRows(a: DrinkSoonRow, b: DrinkSoonRow): number {
  if (a.window.drinkUntil !== b.window.drinkUntil) {
    return a.window.drinkUntil < b.window.drinkUntil ? -1 : 1
  }
  if (a.bottleCount !== b.bottleCount) return b.bottleCount - a.bottleCount
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  if (a.wineId !== b.wineId) return a.wineId < b.wineId ? -1 : 1
  return 0
}

/**
 * Everything the view needs from one pass over the ledger.
 *
 * The counts the empty state reads are gathered here rather than in a second
 * scan, because they are answers to the same question: a screen that lists
 * nothing still has to say what the cellar was doing instead.
 */
export function summarizeDrinkSoon(
  cellar: Cellar,
  asOf: IsoDate,
  withinMonths: number = DRINK_SOON_MONTHS,
): DrinkSoonSummary {
  const byWine = new Map<string, DrinkSoonRow>()
  let bottleCount = 0
  let inCellarCount = 0
  let drinkingCount = 0
  let holdCount = 0
  let pastWindowCount = 0
  let unassessedCount = 0
  let nearestClose: IsoDate | null = null

  for (const [bottleId, bottle] of cellar.bottles) {
    if (inCellar(cellar, bottleId, asOf)) inCellarCount++

    const result = bottleState(cellar, bottleId, asOf)
    if (result.state === 'HOLD') holdCount++
    if (result.state === 'PAST_WINDOW') pastWindowCount++
    if (result.state === 'UNASSESSED') unassessedCount++
    if (result.state !== 'DRINKING' || !result.window) continue

    drinkingCount++
    if (nearestClose === null || result.window.drinkUntil < nearestClose) {
      nearestClose = result.window.drinkUntil
    }

    if (!isDrinkSoon(result, asOf, withinMonths)) continue
    bottleCount++

    const existing = byWine.get(bottle.wineId)
    if (existing) {
      existing.bottleCount++
      continue
    }
    byWine.set(bottle.wineId, {
      wineId: bottle.wineId,
      name: wineDisplayName(cellar.wines.get(bottle.wineId) ?? {}),
      bottleCount: 1,
      // Safe to keep the first bottle's window for the whole row: the window
      // resolves from the wine, so every bottle in this group resolved the
      // identical object.
      window: result.window,
    })
  }

  return {
    rows: [...byWine.values()].sort(compareDrinkSoonRows),
    bottleCount,
    inCellarCount,
    drinkingCount,
    holdCount,
    pastWindowCount,
    unassessedCount,
    nearestClose,
  }
}

/**
 * The earliest acquisition in the ledger, or null for an empty dataset.
 *
 * Date-independent, so the view memoizes it on the cellar alone. It is only
 * read by the empty state, to tell a reader standing before the first
 * acquisition why the cellar is empty rather than leaving them to guess.
 */
export function firstAcquisitionDate(cellar: Cellar): IsoDate | null {
  let earliest: IsoDate | null = null
  for (const acquisition of cellar.acquisitionByBottle.values()) {
    if (earliest === null || acquisition.acquiredAt < earliest) earliest = acquisition.acquiredAt
  }
  return earliest
}
