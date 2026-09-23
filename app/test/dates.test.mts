import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {addDays, addMonths} from '@cellar/core'
import {
  ASOF_CEILING,
  ASOF_FLOOR,
  ASOF_SPAN_DAYS,
  calendarDelta,
  clampToRange,
  describeApproxSpan,
  describeAsOf,
  describeRemaining,
  formatLongDate,
  formatShortDate,
  fromDayIndex,
  parseDateInput,
  toDayIndex,
} from '../src/dates.ts'

/**
 * Tests for the asOf control's date arithmetic.
 *
 * These are consistency checks, not an independent oracle: there is no
 * hand-computed table behind them the way there is behind `@cellar/core`, and
 * the expectations here were written alongside the code rather than before it.
 * They earn their place anyway, because the borrow case below was a real bug
 * that shipped into a working component and was invisible on every date the
 * view is normally driven to.
 *
 * Run with `npm test --workspace cellar-app`. No dependencies beyond Node's
 * test runner, matching `@cellar/core`.
 */

const VERIFICATION_DATES = ['1999-06-01', '2019-12-31', '2023-03-15', '2025-06-01', '2026-09-18']

describe('slider index', () => {
  it('round-trips every verification date and both endpoints', () => {
    for (const date of [ASOF_FLOOR, ...VERIFICATION_DATES, '2026-09-22', ASOF_CEILING]) {
      assert.equal(fromDayIndex(toDayIndex(date)), date, date)
    }
  })

  it('anchors the floor at 0 and the ceiling at the span', () => {
    assert.equal(toDayIndex(ASOF_FLOOR), 0)
    assert.equal(toDayIndex(ASOF_CEILING), ASOF_SPAN_DAYS)
    assert.equal(fromDayIndex(0), ASOF_FLOOR)
    assert.equal(fromDayIndex(ASOF_SPAN_DAYS), ASOF_CEILING)
  })

  /**
   * Every position the slider can be dragged to, not a sample. The control has
   * 17,167 of them and any one that produced a malformed date, a repeat, or a
   * date out of order would be a hole the user could drag into on camera.
   */
  it('maps all 17,167 positions to strictly increasing ISO dates', () => {
    assert.equal(ASOF_SPAN_DAYS + 1, 17167)

    let previous = ''
    for (let index = 0; index <= ASOF_SPAN_DAYS; index++) {
      const date = fromDayIndex(index)
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `position ${index}`)
      assert.ok(date > previous, `position ${index}: ${date} did not follow ${previous}`)
      assert.equal(toDayIndex(date), index, `position ${index} did not round-trip`)
      previous = date
    }
    assert.equal(previous, ASOF_CEILING)
  })
})

describe('date input handling', () => {
  it('ignores a partly typed date rather than moving the view', () => {
    assert.equal(parseDateInput(''), null)
    assert.equal(parseDateInput('2026-09-'), null)
    assert.equal(parseDateInput('2026'), null)
    assert.equal(parseDateInput('not a date'), null)
  })

  it('clamps out-of-range dates to the slider domain', () => {
    assert.equal(parseDateInput('1901-01-01'), ASOF_FLOOR)
    assert.equal(parseDateInput('2099-01-01'), ASOF_CEILING)
    assert.equal(clampToRange('1901-01-01'), ASOF_FLOOR)
    assert.equal(clampToRange('2099-01-01'), ASOF_CEILING)
  })

  it('passes a usable date through unchanged', () => {
    for (const date of VERIFICATION_DATES) assert.equal(parseDateInput(date), date)
  })
})

describe('calendarDelta', () => {
  /**
   * The regression that produced this suite.
   *
   * The first implementation subtracted the two dates field by field and
   * borrowed once when the day-of-month went negative. From 31 January, the
   * borrow takes 28 days out of February and is still two short, so the day
   * count came out negative and the remainder was silently dropped: the view
   * read "1 month ago" for a gap of one month and one day. Every date the
   * control is normally driven to has a day-of-month small enough that a
   * single borrow is sufficient, which is why it survived the component.
   */
  it('borrows correctly out of a month shorter than the start day', () => {
    assert.deepEqual(calendarDelta('2026-01-31', '2026-03-01'), {years: 0, months: 1, days: 1})
    assert.equal(describeAsOf('2026-01-31', '2026-03-01').distance, '1 month, 1 day ago')
  })

  it('clamps to the end of a short month rather than overshooting', () => {
    assert.deepEqual(calendarDelta('2026-01-31', '2026-02-28'), {years: 0, months: 1, days: 0})
    assert.deepEqual(calendarDelta('2024-01-31', '2024-02-29'), {years: 0, months: 1, days: 0})
    assert.deepEqual(calendarDelta('2026-01-31', '2026-04-30'), {years: 0, months: 3, days: 0})
  })

  it('handles a leap day anniversary', () => {
    assert.deepEqual(calendarDelta('2024-02-29', '2025-02-28'), {years: 1, months: 0, days: 0})
    assert.deepEqual(calendarDelta('2024-02-29', '2028-02-29'), {years: 4, months: 0, days: 0})
  })

  it('is zero for a date against itself', () => {
    assert.deepEqual(calendarDelta('2026-09-22', '2026-09-22'), {years: 0, months: 0, days: 0})
  })

  /**
   * The anchor identity, over 5,568 pairs spanning the whole slider domain:
   * `from` plus the whole months of the delta lands no later than `to`, and
   * one month more lands strictly after it. Everything the component shows is
   * downstream of this holding, and it is what the borrow bug violated.
   */
  it('satisfies the anchor identity across the slider domain', () => {
    const offsets = [1, 27, 28, 29, 30, 31, 59, 90, 365, 366, 1000, 4000]
    let pairs = 0

    for (let index = 0; index <= ASOF_SPAN_DAYS; index += 37) {
      const from = fromDayIndex(index)
      for (const offset of offsets) {
        const to = addDays(from, offset)
        const {years, months, days} = calendarDelta(from, to)
        const whole = years * 12 + months
        const label = `${from} -> ${to}`

        assert.ok(days >= 0, `${label}: negative days ${days}`)
        assert.ok(months >= 0 && months < 12, `${label}: months out of range ${months}`)
        assert.ok(years >= 0, `${label}: negative years ${years}`)
        assert.ok(addMonths(from, whole) <= to, `${label}: anchor overshot`)
        assert.ok(addMonths(from, whole + 1) > to, `${label}: anchor undershot`)
        assert.equal(
          addDays(addMonths(from, whole), days),
          to,
          `${label}: remainder ${days} does not close the gap`,
        )
        pairs++
      }
    }

    assert.equal(pairs, 5568)
  })
})

describe('formatLongDate', () => {
  /**
   * Fixed to en-GB and UTC on purpose: this string is read off a screen
   * recording, so it must not vary with the machine it is filmed on. A local
   * timezone west of Greenwich would render the day before.
   */
  it('formats a bare calendar date without shifting it', () => {
    assert.equal(formatLongDate('2023-03-15'), '15 March 2023')
    assert.equal(formatLongDate('1999-06-01'), '1 June 1999')
    assert.equal(formatLongDate('2019-12-31'), '31 December 2019')
    assert.equal(formatLongDate('2026-01-01'), '1 January 2026')
  })
})

describe('formatShortDate', () => {
  it('formats the provenance date without shifting it', () => {
    assert.equal(formatShortDate('2025-04-05'), '5 Apr 2025')
    assert.equal(formatShortDate('2022-06-12'), '12 Jun 2022')
    assert.equal(formatShortDate('2018-11-13'), '13 Nov 2018')
    assert.equal(formatShortDate('2025-12-05'), '5 Dec 2025')
  })
})

describe('describeApproxSpan and describeRemaining', () => {
  /**
   * No day precision, and that is a statement about the inputs rather than
   * about brevity. `drinkUntil` is 31 December because normalization put it
   * there — nobody wrote that date — so "3 months, 13 days" would report a
   * resolution the claim does not have.
   */
  it('never reports days', () => {
    assert.equal(describeApproxSpan('2026-09-18', '2026-12-31'), '3 months')
    assert.equal(describeApproxSpan('2025-06-01', '2025-12-31'), '6 months')
    assert.equal(describeApproxSpan('2023-03-15', '2024-12-31'), '1 year, 9 months')
    assert.equal(describeApproxSpan('2019-12-31', '2026-12-31'), '7 years')
    assert.equal(describeApproxSpan('1999-06-01', '2012-12-31'), '13 years, 6 months')
  })

  it('falls back below a month rather than rounding to zero', () => {
    assert.equal(describeApproxSpan('2026-12-05', '2026-12-31'), 'less than a month')
    assert.equal(describeApproxSpan('2026-12-31', '2026-12-31'), 'less than a month')
  })

  it('reads as time left in a window', () => {
    assert.equal(describeRemaining('2026-09-18', '2026-12-31'), 'about 3 months left')
    assert.equal(describeRemaining('2025-06-01', '2025-12-31'), 'about 6 months left')
    assert.equal(describeRemaining('2026-01-01', '2026-12-31'), 'about 11 months left')
    assert.equal(describeRemaining('2026-12-05', '2026-12-31'), 'less than a month left')
  })

  /**
   * `drinkUntil` is inclusive — a bottle is DRINKING through it — so the two
   * dates being equal is the last day, not an expired window.
   */
  it('calls the closing day the last day rather than nothing left', () => {
    assert.equal(describeRemaining('2026-12-31', '2026-12-31'), 'today is the last day')
  })

  it('singularises a unit of one', () => {
    assert.equal(describeApproxSpan('2026-01-01', '2026-02-01'), '1 month')
    assert.equal(describeApproxSpan('2026-01-01', '2027-01-01'), '1 year')
    assert.equal(describeApproxSpan('2026-01-01', '2027-02-01'), '1 year, 1 month')
  })
})

describe('describeAsOf', () => {
  const TODAY = '2026-09-22'

  it('names the present without a distance in the past tense', () => {
    assert.deepEqual(describeAsOf(TODAY, TODAY), {
      tense: 'present',
      date: '22 September 2026',
      distance: 'today',
    })
  })

  it('describes each verification date as the view will show it', () => {
    const expected: Record<string, string> = {
      '1999-06-01': '27 years, 3 months ago',
      '2019-12-31': '6 years, 8 months ago',
      '2023-03-15': '3 years, 6 months ago',
      '2025-06-01': '1 year, 3 months ago',
      '2026-09-18': '4 days ago',
    }

    for (const date of VERIFICATION_DATES) {
      const {tense, distance} = describeAsOf(date, TODAY)
      assert.equal(tense, 'past', date)
      assert.equal(distance, expected[date], date)
    }
  })

  /**
   * The tense is what licenses the wording. A future count is a projection
   * that assumes nothing further is added to the ledger, and the component
   * renders that assumption only when this says 'future'.
   */
  it('marks a date after today as future', () => {
    assert.deepEqual(describeAsOf('2030-06-01', TODAY), {
      tense: 'future',
      date: '1 June 2030',
      distance: 'in 3 years, 8 months',
    })
    assert.equal(describeAsOf('2026-09-23', TODAY).tense, 'future')
    assert.equal(describeAsOf('2026-09-23', TODAY).distance, 'in 1 day')
    assert.equal(describeAsOf(ASOF_CEILING, TODAY).tense, 'future')
  })

  it('singularises a unit of one', () => {
    assert.equal(describeAsOf('2026-09-21', TODAY).distance, '1 day ago')
    assert.equal(describeAsOf('2026-08-22', TODAY).distance, '1 month ago')
    assert.equal(describeAsOf('2025-09-22', TODAY).distance, '1 year ago')
    assert.equal(describeAsOf('2025-08-22', TODAY).distance, '1 year, 1 month ago')
  })

  /**
   * Coarsest two units only, and the finer one is dropped when it is zero
   * rather than printed as "0 days". Anything longer stops being glanceable,
   * which is the only thing this line is for.
   */
  it('reports at most two units and drops an empty one', () => {
    assert.equal(describeAsOf('2023-09-22', TODAY).distance, '3 years ago')
    assert.equal(describeAsOf('2026-07-22', TODAY).distance, '2 months ago')
    assert.equal(describeAsOf('2026-07-20', TODAY).distance, '2 months, 2 days ago')
  })

  it('never renders an empty or malformed distance anywhere on the slider', () => {
    for (let index = 0; index <= ASOF_SPAN_DAYS; index += 11) {
      const date = fromDayIndex(index)
      const {tense, distance, date: formatted} = describeAsOf(date, TODAY)

      assert.ok(formatted.length > 0, date)
      assert.ok(distance.length > 0, date)
      assert.doesNotMatch(distance, /\b0 (day|month|year)s?\b/, date)
      assert.doesNotMatch(distance, /-\d/, date)
      assert.doesNotMatch(distance, /^\s*(ago|in\s*)$/, date)

      if (date === TODAY) assert.equal(tense, 'present', date)
      else if (date < TODAY) assert.equal(tense, 'past', date)
      else assert.equal(tense, 'future', date)
    }
  })
})
