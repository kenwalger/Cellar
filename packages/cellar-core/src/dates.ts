import type {IsoDate, IsoDateTime} from './types.js'

/**
 * Date handling for the whole module.
 *
 * Every temporal comparison is a calendar-date comparison, and `YYYY-MM-DD`
 * strings compare correctly with `<`, `<=` and `===`. No Date objects are
 * involved in the hot path, which keeps the resolution logic free of
 * timezone behaviour it would otherwise have to reason about.
 *
 * Nothing here reads the clock. `asOf` and `now` are always parameters, so
 * the same inputs always produce the same outputs.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE.test(value)
}

/**
 * Truncates an instant to its UTC calendar date.
 *
 * Parses rather than slicing the first ten characters, because an offset
 * timestamp such as `2025-09-06T21:00:00-07:00` belongs to the following UTC
 * day and slicing would silently keep the local one.
 *
 * Known limitation: this is why an evening Pacific opening lands on the next
 * calendar day. See "Known limitations" in docs/temporal-resolution.md.
 */
export function toUtcDate(value: IsoDateTime): IsoDate {
  if (ISO_DATE.test(value)) return value
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) throw new RangeError(`Not a parseable ISO timestamp: ${value}`)
  return new Date(ms).toISOString().slice(0, 10)
}

/** Milliseconds since the epoch, or 0 for anything unparseable. */
export function toEpochMs(value: IsoDateTime | null | undefined): number {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const ms = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(ms)) throw new RangeError(`Not an ISO date: ${date}`)
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Adds whole months, clamping to the end of the target month so that
 * 2024-01-31 plus one month is 2024-02-29 rather than spilling into March.
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

/** A drinking window stated as the year Y opens on Y-01-01. */
export function windowStartOfYear(year: number): IsoDate {
  return `${String(year).padStart(4, '0')}-01-01`
}

/** A drinking window stated as the year Y closes on Y-12-31. */
export function windowEndOfYear(year: number): IsoDate {
  return `${String(year).padStart(4, '0')}-12-31`
}

/**
 * Accepts a window bound written either as a year or as a date and returns
 * the normalized date. `which` decides which end of the year a bare year
 * means. Normalization happens on write, so this is a safety net for data
 * that arrived from somewhere that skipped it.
 */
export function normalizeWindowBound(value: string | number, which: 'from' | 'until'): IsoDate {
  const text = String(value).trim()
  if (ISO_DATE.test(text)) return text
  if (/^\d{4}$/.test(text)) {
    const year = Number(text)
    return which === 'from' ? windowStartOfYear(year) : windowEndOfYear(year)
  }
  throw new RangeError(`Not a year or ISO date: ${text}`)
}
