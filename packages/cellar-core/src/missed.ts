import type {Cellar} from './cellar.js'
import {addDays} from './dates.js'
import {bottleState} from './state.js'
import type {IsoDate, MissedOpportunity, PeakInterval, Period} from './types.js'

/**
 * Every date at which `bottleState(bottle, ·)` can change value.
 *
 * State is a step function of five inputs, and it moves only where one of
 * them moves:
 *
 *   acquiredAt              NOT_YET_OWNED leaves
 *   consumedOn              CONSUMED begins
 *   assessedAt              a new claim becomes visible and the resolved
 *                           window may swap for a different one
 *   drinkFrom               HOLD becomes DRINKING
 *   dayAfter(drinkUntil)    DRINKING becomes PAST_WINDOW
 *
 * `assessedAt` is the one that is easy to miss and the reason this is not
 * just a scan of window bounds. A newly visible assessment can flip a bottle
 * out of DRINKING without any window bound being crossed: in the seed data
 * `paradis-vineyards-estate-marechal-foch-2021` reads DRINKING under the
 * producer window 2023-2027 until 2024-02-21, when a personal claim replaces
 * it with 2023-2024 and the bottle is past window from that day. The spec's
 * original boundary list omitted this; see "Changes during implementation" in
 * docs/temporal-resolution.md.
 *
 * `dayAfter(drinkUntil)` rather than `drinkUntil`, because a bottle is
 * DRINKING through `drinkUntil` inclusive; the transition lands the next day.
 *
 * Windows range over every accepted assessment's own bounds, which is safe
 * because the window that resolves at any instant is always one of them.
 */
function changePoints(cellar: Cellar, bottleId: string, period: Period): IsoDate[] {
  // The period start anchors the segment that is already in progress when the
  // period opens. Every other segment intersecting the period begins at a
  // change point inside it.
  const points = new Set<IsoDate>([period.start])

  const add = (date: IsoDate | undefined): void => {
    if (date && date > period.start && date <= period.end) points.add(date)
  }

  add(cellar.acquisitionByBottle.get(bottleId)?.acquiredAt)
  add(cellar.consumptionByBottle.get(bottleId)?.consumedOn)

  const wineId = cellar.bottles.get(bottleId)?.wineId
  if (wineId) {
    for (const assessment of cellar.acceptedByWine.get(wineId) ?? []) {
      add(assessment.assessedAt)
      add(assessment.drinkFrom)
      add(addDays(assessment.drinkUntil, 1))
    }
  }

  return [...points].sort()
}

/**
 * The sub-intervals of `period` during which the bottle read DRINKING.
 *
 * Exact, not sampled. Every constant segment of the state function that
 * intersects the period either begins at a change point inside the period or
 * already contains `period.start`, so evaluating at `period.start` plus every
 * in-period change point visits every segment. No interval can be skipped,
 * however brief — a window that opened and closed inside a single week is
 * caught, where monthly sampling would miss it silently.
 */
export function drinkingIntervals(
  cellar: Cellar,
  bottleId: string,
  period: Period,
): PeakInterval[] {
  const points = changePoints(cellar, bottleId, period)
  const intervals: PeakInterval[] = []

  let openFrom: IsoDate | null = null
  let openUntil: IsoDate | null = null

  for (let index = 0; index < points.length; index++) {
    const from = points[index]!
    const next = points[index + 1]
    const until = next ? addDays(next, -1) : period.end

    if (bottleState(cellar, bottleId, from).state === 'DRINKING') {
      // Segments are contiguous, so a run of DRINKING segments extends the
      // interval already open rather than starting a new one.
      if (openFrom === null) openFrom = from
      openUntil = until
    } else if (openFrom !== null) {
      intervals.push({from: openFrom, until: openUntil!})
      openFrom = null
      openUntil = null
    }
  }

  if (openFrom !== null) intervals.push({from: openFrom, until: openUntil!})

  return intervals
}

/**
 * Bottles that were at their peak during the period, were not opened during
 * it, and are past window now.
 *
 *   regret(period) = peaked(period)
 *                    minus opened(period)
 *                    restricted to state(bottle, now) == PAST_WINDOW
 *
 * `now` is a parameter rather than a clock read, so the result is
 * reproducible and the tests do not rot when the date changes.
 */
export function missedOpportunities(
  cellar: Cellar,
  period: Period,
  now: IsoDate,
): MissedOpportunity[] {
  const missed: MissedOpportunity[] = []

  for (const [bottleId, bottle] of cellar.bottles) {
    const stateNow = bottleState(cellar, bottleId, now)
    if (stateNow.state !== 'PAST_WINDOW') continue

    const consumption = cellar.consumptionByBottle.get(bottleId)
    if (
      consumption &&
      consumption.consumedOn >= period.start &&
      consumption.consumedOn <= period.end
    ) {
      continue
    }

    const peakIntervals = drinkingIntervals(cellar, bottleId, period)
    if (peakIntervals.length === 0) continue

    missed.push({bottleId, wineId: bottle.wineId, peakIntervals, windowNow: stateNow.window})
  }

  return missed.sort((a, b) => (a.bottleId < b.bottleId ? -1 : a.bottleId > b.bottleId ? 1 : 0))
}
