import {
  addDays,
  addMonths,
  bottleState,
  drinkingIntervals,
  missedOpportunities,
  wineDisplayName,
  type Cellar,
  type IsoDate,
  type PeakInterval,
  type Period,
  type ResolvedWindow,
} from '@cellar/core'
// Explicit `.ts` extensions, which the other view modules do not need because
// they have no relative imports at all. `node --test` runs this file directly
// from source and Node's ESM resolver does not guess extensions; the Vite
// bundler behind `sanity build` accepts them, and `module: "Preserve"` in
// tsconfig allows them. Dropping them makes the test suite unable to load the
// module at all, which is a loud enough failure to leave undocumented.
import {formatDateSpan, formatShortDate} from './dates.ts'
import {firstAcquisitionDate} from './drinkSoonRows.ts'

/**
 * What Missed Opportunities lists, computed rather than rendered.
 *
 * Pure, synchronous, no React, and both dates are parameters — the same
 * properties that make `@cellar/core` checkable against a table, for the same
 * reason. `MissedOpportunities.tsx` only draws what is here.
 *
 * The regret set itself comes from `@cellar/core`. Everything this file adds is
 * presentation over the same index: grouping by wine, compressing the boundary
 * scan's intervals into a phrase, counting what happened to the rest of the
 * bottles of the same wine, and working out what an empty screen should say.
 * Design rule 6 keeps those out of the shared module, exactly as
 * `drinkSoonRows.ts` does.
 */

/**
 * The period is the twelve months ending at `asOf`, and it is derived rather
 * than chosen because the app has one date control and should keep it.
 *
 * The calendar year containing `asOf` was the other candidate and it is
 * structurally unusable here. Every `drinkUntil` in the dataset is 31 December,
 * because a window stated as a year normalizes to one, so no window closes
 * mid-year, so no bottle that was DRINKING during year Y can read PAST_WINDOW
 * before Y+1 begins. The regret set for the current calendar year is therefore
 * empty by construction, all year, every year — and `asOf` starts at today, so
 * that choice would have shipped a view that is empty on load for a reason no
 * reader could see. A trailing period puts the 31 December closing *inside* the
 * window it looks at, and the same dataset that returns nothing for calendar
 * 2026 returns eleven bottles for the twelve months ending today.
 *
 * It also moves. A calendar-year period is flat for 364 days of slider travel;
 * this one changes as the control changes, which is the whole argument of the
 * project and the thing the demo has to show.
 *
 * One identity worth knowing, because the tests and the screen both rely on it:
 * twelve months ending on 31 December *is* that calendar year. `asOf` of
 * 2023-12-31 derives exactly the oracle's 2023 period, so the number on screen
 * at that date is the number the oracle checks.
 *
 * Known wart, recorded rather than fixed: `addMonths` clamps to the end of the
 * target month, so an `asOf` of 29 February derives a start of 1 March and a
 * 365-day period rather than 366. It is one day, on one date every four years,
 * and the alternative is a second month-arithmetic convention living beside the
 * one `calendarDelta` already depends on.
 */
export const MISSED_PERIOD_MONTHS = 12

export function trailingPeriod(asOf: IsoDate, months: number = MISSED_PERIOD_MONTHS): Period {
  return {start: addDays(addMonths(asOf, -months), 1), end: asOf}
}

/**
 * What became of a bottle that was at peak during the period.
 *
 * The four roles partition the at-peak bottles of a wine, which is what lets a
 * row say "3 of 5" and have the other two accounted for rather than implied.
 */
export type PeakRole = 'LOST' | 'OPENED_IN_PERIOD' | 'OPENED_LATER' | 'HELD'

/**
 * Classifies a bottle already known to have been at peak during the period.
 *
 * `LOST` here is the same condition `missedOpportunities` applies, written in
 * the other order: it tests state first and then the consumption, this tests
 * the consumption first. The two agree unconditionally, because a bottle opened
 * during the period reads CONSUMED at any later date and never PAST_WINDOW.
 * `missedRows.test.mts` asserts the agreement against the oracle rather than
 * leaving it to that argument.
 */
export function peakRole(cellar: Cellar, bottleId: string, period: Period, now: IsoDate): PeakRole {
  const consumption = cellar.consumptionByBottle.get(bottleId)
  if (
    consumption &&
    consumption.consumedOn >= period.start &&
    consumption.consumedOn <= period.end
  ) {
    return 'OPENED_IN_PERIOD'
  }

  const {state} = bottleState(cellar, bottleId, now)
  if (state === 'PAST_WINDOW') return 'LOST'
  if (state === 'CONSUMED') return 'OPENED_LATER'
  return 'HELD'
}

/**
 * When the bottles of one wine were at peak inside the period, compressed.
 *
 * The boundary scan returns exact intervals per bottle and printing them is
 * noise: in the oracle's 2023 period all seventeen are exactly 1 January to 31
 * December, seventeen rows restating the period back at the reader. What is not
 * noise is a peak that *doesn't* fill the period, because in this dataset a
 * late start is always a late acquisition — "at peak from 12 May" is really
 * "you bought it already in window", which is a sharper regret than having held
 * it all year.
 *
 * Interval ends are shared across a wine's lost bottles and starts are not: the
 * closing boundary comes from the window, which belongs to the wine, while the
 * opening boundary can be the bottle's own acquisition. `until` is still taken
 * as a maximum rather than assumed, and the test asserts the sharing.
 */
export interface PeakSpan {
  /** Earliest peak start across the wine's lost bottles. */
  from: IsoDate
  /** Latest peak start. Equal to `from` unless the bottles arrived apart. */
  lastFrom: IsoDate
  /** Latest peak end. Shared across the group in every period in the dataset. */
  until: IsoDate
  /** Every lost bottle was at peak for the entire period, in one unbroken run. */
  wholePeriod: boolean
  /** The bottles' intervals are not all identical. */
  varies: boolean
}

function spanOf(intervalsByBottle: readonly PeakInterval[][], period: Period): PeakSpan {
  let from = period.end
  let lastFrom = period.start
  let until = period.start
  let wholePeriod = true

  // Identical interval lists mean the group can be described by one phrase.
  const shapes = new Set<string>()
  for (const intervals of intervalsByBottle) {
    const first = intervals[0]
    const last = intervals[intervals.length - 1]
    if (!first || !last) continue

    if (first.from < from) from = first.from
    if (first.from > lastFrom) lastFrom = first.from
    if (last.until > until) until = last.until
    if (intervals.length > 1 || first.from !== period.start || last.until !== period.end) {
      wholePeriod = false
    }
    shapes.add(JSON.stringify(intervals))
  }

  return {from, lastFrom, until, wholePeriod, varies: shapes.size > 1}
}

/**
 * The span as a phrase. "the whole period", "from 12 May 2024",
 * "until 4 May 2025", "1 Jul 2024 – 4 May 2025".
 *
 * Describes the longest-held bottle in the group. Where the group's bottles
 * disagree, the view adds the latest start beneath it rather than widening this
 * phrase into something true of no single bottle.
 */
export function describePeakSpan(span: PeakSpan, period: Period): string {
  if (span.wholePeriod) return 'the whole period'

  const flushStart = span.from === period.start
  const flushEnd = span.until === period.end
  if (flushStart && flushEnd) return 'the whole period'
  if (flushStart) return `until ${formatShortDate(span.until)}`
  if (flushEnd) return `from ${formatShortDate(span.from)}`
  return formatDateSpan(span.from, span.until)
}

/**
 * One row is one wine, for the reason Drink Soon groups by wine: the window
 * resolves from the wine, so every bottle in the group carries the identical
 * provenance and per-bottle rows would print the same claim five times.
 *
 * The reasoning only half-transfers, and the half that doesn't is why `peak`
 * exists. `windowNow` is constant inside the group; the peak intervals are not,
 * because the boundary set includes `acquiredAt` and bottles of one wine arrive
 * on different days. In the oracle's 2024 period one wine's three bottles were
 * acquired on 12 May, 11 August and 9 December and have three different peaks.
 * `PeakSpan` carries that difference instead of hiding it behind the first
 * bottle's dates.
 */
export interface MissedRow {
  wineId: string
  /** `wineDisplayName`, so the Studio and every view name a wine identically. */
  name: string
  /**
   * The lost bottles themselves, sorted.
   *
   * The screen shows a count rather than a list, but the group is a set of
   * bottles and keeping it lets the test expand the rows back into one and
   * compare it with the oracle. A row that carried only its count could be
   * wrong in two directions at once and still add up.
   */
  bottleIds: string[]
  /** Bottles lost: at peak in the period, unopened then, past window now. */
  bottleCount: number
  /** Bottles of this wine at peak at any point in the period. The denominator. */
  peakedCount: number
  /** Of those, opened during the period. The ones that got away with it. */
  openedInPeriod: number
  /** Of those, opened after the period but before now. */
  openedLater: number
  /** Of those, still held and not past window now. */
  heldStill: number
  peak: PeakSpan
  /** Per-bottle peaks, for the `title` attribute when `peak.varies`. */
  detail: string
  /**
   * The window that now judges the wine past, with its provenance.
   *
   * Typed nullable because `bottleState` is, though PAST_WINDOW cannot be
   * reached without a resolved window. If it were ever null the row still
   * renders, without its provenance line: dropping the row instead would make
   * the headline count disagree with the list underneath it.
   */
  window: ResolvedWindow | null
}

export interface MissedSummary {
  period: Period
  rows: MissedRow[]
  /** Bottles across all rows. The headline number. */
  bottleCount: number
  /** At-peak bottles of the listed wines, lost or not. */
  peakedCount: number
  /** Of those, opened during the period — the counterfactual on the same wines. */
  openedInPeriod: number
}

/**
 * Most bottles first, then the oldest closing, then name, then wine id.
 *
 * Drink Soon leads on urgency because urgency is its point. Nothing here is
 * urgent; it is all already lost, so magnitude leads and three bottles gone
 * outranks one. `wineId` closes the key to make the order total, for the reason
 * `_id` closes the assessment comparator in ADR 0006.
 */
export function compareMissedRows(a: MissedRow, b: MissedRow): number {
  if (a.bottleCount !== b.bottleCount) return b.bottleCount - a.bottleCount

  const aUntil = a.window?.drinkUntil ?? ''
  const bUntil = b.window?.drinkUntil ?? ''
  if (aUntil !== bUntil) return aUntil < bUntil ? -1 : 1
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  if (a.wineId !== b.wineId) return a.wineId < b.wineId ? -1 : 1
  return 0
}

/**
 * The regret set, grouped for the screen.
 *
 * `missedOpportunities` decides what is lost — that predicate belongs to
 * `@cellar/core` and is checked against the every-day oracle there. This walks
 * the result into wine groups and then makes one further pass, over the bottles
 * of the listed wines only, to find out what happened to the rest of them. That
 * second pass is what turns "3 bottles" into "3 of 5, and you opened 2 in
 * time", and it is scoped to the wines already on screen rather than the whole
 * ledger, which is the difference between about 70 boundary scans and 542.
 */
export function summarizeMissed(cellar: Cellar, period: Period, now: IsoDate): MissedSummary {
  const lost = missedOpportunities(cellar, period, now)

  interface Group {
    row: MissedRow
    /** Lost bottle and its peaks, kept together so the detail line can name it. */
    members: {bottleId: string; intervals: PeakInterval[]}[]
  }

  const byWine = new Map<string, Group>()
  for (const missed of lost) {
    let group = byWine.get(missed.wineId)
    if (!group) {
      group = {
        row: {
          wineId: missed.wineId,
          name: wineDisplayName(cellar.wines.get(missed.wineId) ?? {}),
          bottleIds: [],
          bottleCount: 0,
          peakedCount: 0,
          openedInPeriod: 0,
          openedLater: 0,
          heldStill: 0,
          peak: {
            from: period.start,
            lastFrom: period.start,
            until: period.end,
            wholePeriod: true,
            varies: false,
          },
          detail: '',
          // Safe to keep the first bottle's window for the whole row: the
          // window resolves from the wine, so every bottle in this group
          // resolved the identical object.
          window: missed.windowNow,
        },
        members: [],
      }
      byWine.set(missed.wineId, group)
    }

    group.row.bottleCount++
    group.members.push({bottleId: missed.bottleId, intervals: missed.peakIntervals})
  }

  // The rest of each listed wine's bottles. Lost ones are skipped rather than
  // rescanned — they are already known to have been at peak, and
  // `drinkingIntervals` is the expensive call in this file.
  const lostIds = new Set(lost.map((missed) => missed.bottleId))
  for (const [bottleId, bottle] of cellar.bottles) {
    const group = byWine.get(bottle.wineId)
    if (!group || lostIds.has(bottleId)) continue
    if (drinkingIntervals(cellar, bottleId, period).length === 0) continue

    const role = peakRole(cellar, bottleId, period, now)
    if (role === 'OPENED_IN_PERIOD') group.row.openedInPeriod++
    else if (role === 'OPENED_LATER') group.row.openedLater++
    else group.row.heldStill++
  }

  const rows: MissedRow[] = []
  let bottleCount = 0
  let peakedCount = 0
  let openedInPeriod = 0

  for (const group of byWine.values()) {
    const {row} = group
    const members = group.members.sort((a, b) => (a.bottleId < b.bottleId ? -1 : 1))

    row.bottleIds = members.map((member) => member.bottleId)
    row.peak = spanOf(
      members.map((member) => member.intervals),
      period,
    )
    row.detail = members
      .map(
        (member) =>
          `${member.bottleId}: ${member.intervals
            .map((interval) => formatDateSpan(interval.from, interval.until))
            .join(', ')}`,
      )
      .join('\n')
    row.peakedCount = row.bottleCount + row.openedInPeriod + row.openedLater + row.heldStill

    rows.push(row)
    bottleCount += row.bottleCount
    peakedCount += row.peakedCount
    openedInPeriod += row.openedInPeriod
  }

  return {period, rows: rows.sort(compareMissedRows), bottleCount, peakedCount, openedInPeriod}
}

/** Every at-peak bottle in the ledger, by what became of it. */
export interface PeriodScan {
  peakedCount: number
  lostCount: number
  openedInPeriod: number
  openedLater: number
  heldStill: number
}

/**
 * The same classification over the whole ledger rather than over the listed
 * wines.
 *
 * This is the expensive path and it exists for the empty state. Saying *why*
 * nothing is listed means knowing how many bottles were at peak at all, which
 * is a boundary scan on all 542 bottles instead of the few dozen `summarizeMissed`
 * touches — measured at about 2.3 ms against 0.6 ms, four times the cost of
 * drawing a full screen.
 *
 * So it is called only when there is nothing to draw. A view with no rows is a
 * view that spent nothing rendering, and two milliseconds of a frame it did not
 * otherwise use is invisible. It is exported separately from `summarizeMissed`
 * rather than folded into it precisely so that the cost is opt-in and visible
 * at the call site.
 *
 * It doubles as a check on the gate: `lostCount` here is reached without the
 * PAST_WINDOW shortcut and must equal `summarizeMissed`'s `bottleCount`.
 */
export function scanPeriod(cellar: Cellar, period: Period, now: IsoDate): PeriodScan {
  const scan: PeriodScan = {
    peakedCount: 0,
    lostCount: 0,
    openedInPeriod: 0,
    openedLater: 0,
    heldStill: 0,
  }

  for (const bottleId of cellar.bottles.keys()) {
    if (drinkingIntervals(cellar, bottleId, period).length === 0) continue
    scan.peakedCount++

    const role = peakRole(cellar, bottleId, period, now)
    if (role === 'LOST') scan.lostCount++
    else if (role === 'OPENED_IN_PERIOD') scan.openedInPeriod++
    else if (role === 'OPENED_LATER') scan.openedLater++
    else scan.heldStill++
  }

  return scan
}

/**
 * Why the view is empty. Five different claims about the cellar, not one
 * absence.
 *
 * `FUTURE_PERIOD`   the period has not happened yet, so nothing in it can be
 *                   past window today. Returns without scanning: the answer
 *                   does not depend on the data.
 * `EMPTY_CELLAR`    no bottle had been acquired by the end of the period.
 * `NONE_AT_PEAK`    bottles existed, none was in its drinking window.
 * `ALL_OPENED`      every bottle that was at peak was opened during the
 *                   period. The seed data never reaches this branch — there is
 *                   an unopened at-peak bottle in every period that has one at
 *                   all — and it is written anyway, because letting
 *                   `NOTHING_LOST` speak for it would put words in its mouth.
 * `NOTHING_LOST`    bottles were at peak and went unopened, and not one of them
 *                   is past window today. The common empty reading, and the
 *                   good one: at the twelve months ending in 2019 that is 39
 *                   bottles, 32 of which have since been opened.
 */
export type MissedEmptyKind =
  'FUTURE_PERIOD' | 'EMPTY_CELLAR' | 'NONE_AT_PEAK' | 'ALL_OPENED' | 'NOTHING_LOST'

export interface MissedEmptyReason extends PeriodScan {
  kind: MissedEmptyKind
  /** Null for an empty ledger. Read only by `EMPTY_CELLAR`. */
  firstAcquisition: IsoDate | null
}

export function explainEmptyMissed(
  cellar: Cellar,
  period: Period,
  now: IsoDate,
): MissedEmptyReason {
  const firstAcquisition = firstAcquisitionDate(cellar)
  const empty: PeriodScan = {
    peakedCount: 0,
    lostCount: 0,
    openedInPeriod: 0,
    openedLater: 0,
    heldStill: 0,
  }

  if (period.start > now) return {kind: 'FUTURE_PERIOD', ...empty, firstAcquisition}

  const scan = scanPeriod(cellar, period, now)

  if (scan.peakedCount === 0) {
    const kind =
      firstAcquisition === null || firstAcquisition > period.end ? 'EMPTY_CELLAR' : 'NONE_AT_PEAK'
    return {kind, ...scan, firstAcquisition}
  }

  if (scan.openedInPeriod === scan.peakedCount) {
    return {kind: 'ALL_OPENED', ...scan, firstAcquisition}
  }

  return {kind: 'NOTHING_LOST', ...scan, firstAcquisition}
}
