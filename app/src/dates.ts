import {addDays, addMonths, isIsoDate, type IsoDate} from '@cellar/core'

/**
 * Date arithmetic and formatting for the asOf control.
 *
 * This is presentation, which is why it lives in the app and not in
 * `@cellar/core`. The module compares `YYYY-MM-DD` strings and never formats
 * one; locale-aware month names and "3 years, 6 months ago" are a property of
 * the view, and putting them in the shared module would give Functions and the
 * Next.js fallback a dependency on `Intl` they have no use for.
 *
 * Nothing here reads the clock either. `today` is a parameter everywhere it
 * appears, for the same reason it is a parameter in the module: a function
 * that reads a clock cannot be checked against a table.
 */

/**
 * The slider's domain.
 *
 * The seed ledger runs from the first acquisition on 1996-05-18 to the last
 * consumption on 2026-09-17, and accepted assessments carry `drinkUntil`
 * bounds out to 2041-12-31. The floor sits just below the earliest event and
 * the ceiling just past the furthest window, so the control can reach every
 * date at which anything in the dataset changes state — including the future
 * ones, where the point is watching HOLD become DRINKING rather than being
 * told that it will.
 */
export const ASOF_FLOOR: IsoDate = '1996-01-01'
export const ASOF_CEILING: IsoDate = '2042-12-31'

const MS_PER_DAY = 86_400_000

function epochDay(date: IsoDate): number {
  const ms = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(ms)) throw new RangeError(`Not an ISO date: ${date}`)
  return Math.round(ms / MS_PER_DAY)
}

const FLOOR_DAY = epochDay(ASOF_FLOOR)

/** Slider positions between the floor and the ceiling, inclusive. */
export const ASOF_SPAN_DAYS = epochDay(ASOF_CEILING) - FLOOR_DAY

/** Slider position for a date. The inverse of `fromDayIndex`. */
export function toDayIndex(date: IsoDate): number {
  return epochDay(date) - FLOOR_DAY
}

/** Date for a slider position. The inverse of `toDayIndex`. */
export function fromDayIndex(index: number): IsoDate {
  return addDays(ASOF_FLOOR, index)
}

export function clampToRange(date: IsoDate): IsoDate {
  if (date < ASOF_FLOOR) return ASOF_FLOOR
  if (date > ASOF_CEILING) return ASOF_CEILING
  return date
}

/**
 * Accepts a value from a date input, which is `''` while a date is partly
 * typed and can be out of range even with `min` and `max` set. Returns null
 * for anything that is not a usable date so the caller can leave `asOf` alone
 * rather than snapping the whole view to a half-entered year.
 */
export function parseDateInput(value: string): IsoDate | null {
  if (!isIsoDate(value)) return null
  return clampToRange(value)
}

/**
 * "15 March 2023".
 *
 * `en-GB` rather than the viewer's locale on purpose: this string is read off
 * a screen recording, so it has to be the same every time it is filmed, and
 * day-month-year is the form every document in this repository already uses.
 * UTC rather than local because the input is a bare calendar date with no
 * timezone, and formatting it in a negative offset would show the day before.
 */
const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatLongDate(date: IsoDate): string {
  return LONG_DATE.format(new Date(`${date}T00:00:00Z`))
}

interface CalendarDelta {
  years: number
  months: number
  days: number
}

/**
 * Calendar difference between two dates, `from` no later than `to`.
 *
 * Anchored on `addMonths` rather than subtracting the two dates field by
 * field. Field-wise subtraction needs a borrow when the day-of-month goes
 * negative, and a single borrow is not always enough: 31 January to 1 March
 * borrows 28 days out of February and is still two days short, which silently
 * drops the remainder. `addMonths` already clamps to the end of the target
 * month, so walking whole months forward and measuring what is left gives
 * "1 month, 1 day" and cannot produce a negative day count.
 */
function calendarDelta(from: IsoDate, to: IsoDate): CalendarDelta {
  const [fromYear, fromMonth] = from.split('-').map(Number) as [number, number, number]
  const [toYear, toMonth] = to.split('-').map(Number) as [number, number, number]

  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth)
  if (months > 0 && addMonths(from, months) > to) months -= 1
  if (months < 0) months = 0

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: epochDay(to) - epochDay(addMonths(from, months)),
  }
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

/**
 * "3 years, 6 months", "4 days", "" when the two dates are the same.
 *
 * Coarsest two units only. "3 years, 6 months and 12 days ago" is precise and
 * unreadable at a glance, and glanceable is the requirement here.
 */
function describeDelta(delta: CalendarDelta): string {
  const {years, months, days} = delta
  if (years > 0) {
    return months > 0
      ? `${plural(years, 'year')}, ${plural(months, 'month')}`
      : plural(years, 'year')
  }
  if (months > 0) {
    return days > 0 ? `${plural(months, 'month')}, ${plural(days, 'day')}` : plural(months, 'month')
  }
  if (days > 0) return plural(days, 'day')
  return ''
}

export type AsOfTense = 'past' | 'present' | 'future'

export interface AsOfDescription {
  tense: AsOfTense
  /** The formatted date, always present. */
  date: string
  /** "4 days ago", "in 3 years, 8 months", or "today". */
  distance: string
}

/**
 * How the view should talk about a date.
 *
 * The three cases are genuinely different claims. A past count is a historical
 * fact, a present count is the current state of the cellar, and a future count
 * is a projection that assumes nothing else happens. Wording them identically
 * would present the third as the first.
 */
export function describeAsOf(asOf: IsoDate, today: IsoDate): AsOfDescription {
  const date = formatLongDate(asOf)
  if (asOf === today) return {tense: 'present', date, distance: 'today'}
  if (asOf < today) {
    return {tense: 'past', date, distance: `${describeDelta(calendarDelta(asOf, today))} ago`}
  }
  return {tense: 'future', date, distance: `in ${describeDelta(calendarDelta(today, asOf))}`}
}
