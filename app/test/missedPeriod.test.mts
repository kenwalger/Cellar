import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {addDays, addMonths} from '@cellar/core'
import {
  ASOF_CEILING,
  ASOF_FLOOR,
  ASOF_SPAN_DAYS,
  formatDateSpan,
  formatDayMonth,
  fromDayIndex,
} from '../src/dates.ts'
import {
  MISSED_PERIOD_MONTHS,
  describePeakSpan,
  trailingPeriod,
  type PeakSpan,
} from '../src/missedRows.ts'

/**
 * The period derivation and the phrases built from it.
 *
 * Deliberately separate from `missedRows.test.mts`, which drives the oracle.
 * Nothing here touches the dataset: these are properties of the arithmetic and
 * of the formatting, and they hold for every date the slider can reach rather
 * than for the dates the seed data happens to make interesting. Keeping the two
 * apart means a failure says which of the two layers moved.
 */

const PERIOD = {start: '2024-01-01', end: '2024-12-31'}

describe('trailingPeriod', () => {
  it('ends at asOf', () => {
    for (const asOf of ['1996-01-01', '2023-06-15', '2026-09-23', '2042-12-31']) {
      assert.equal(trailingPeriod(asOf).end, asOf, asOf)
    }
  })

  /**
   * The identity the whole design leans on: twelve months ending on 31
   * December is that calendar year. It is why the oracle's 2023 and 2024
   * periods are reachable from the control, and why the number on screen at
   * those dates is the number the oracle checks.
   */
  it('derives the calendar year from a 31 December asOf', () => {
    for (let year = 1997; year <= 2042; year++) {
      assert.deepEqual(
        trailingPeriod(`${year}-12-31`),
        {start: `${year}-01-01`, end: `${year}-12-31`},
        String(year),
      )
    }
  })

  /**
   * The leap-day wart, pinned rather than fixed.
   *
   * `addMonths` clamps to the end of the target month, so 29 February walks
   * back to 28 February and the period opens on 1 March — 365 days rather than
   * 366. Fixing it means a second month-arithmetic convention beside the one
   * `calendarDelta` already depends on, for one day every four years. The
   * assertion is here so that the behaviour is a decision rather than a
   * surprise the next reader has to rediscover.
   */
  it('clamps a 29 February asOf to a 365-day period', () => {
    assert.deepEqual(trailingPeriod('2024-02-29'), {start: '2023-03-01', end: '2024-02-29'})
    assert.deepEqual(trailingPeriod('2024-03-01'), {start: '2023-03-02', end: '2024-03-01'})
  })

  /**
   * Every position the slider can take, not a sample. The control spans
   * 17,168 days and the derivation is called on every one of them as the thumb
   * moves, so the cheap exhaustive check is the right one.
   */
  it('holds its invariants at every slider position', () => {
    for (let index = 0; index <= ASOF_SPAN_DAYS; index++) {
      const asOf = fromDayIndex(index)
      const period = trailingPeriod(asOf)

      assert.equal(period.end, asOf)
      assert.ok(period.start < period.end, `${asOf}: start is not before end`)
      assert.equal(
        period.start,
        addDays(addMonths(asOf, -MISSED_PERIOD_MONTHS), 1),
        `${asOf}: start`,
      )

      // A year of days, give or take the leap clamp. Never a fortnight, which
      // is what an off-by-one in the month arithmetic would produce.
      const days = (Date.parse(period.end) - Date.parse(period.start)) / 86_400_000 + 1
      assert.ok(days === 365 || days === 366, `${asOf}: ${days} days`)
    }
  })

  it('reaches the whole slider domain', () => {
    assert.equal(fromDayIndex(0), ASOF_FLOOR)
    assert.equal(fromDayIndex(ASOF_SPAN_DAYS), ASOF_CEILING)
  })
})

describe('describePeakSpan', () => {
  const span = (
    from: string,
    lastFrom: string,
    until: string,
    extra?: Partial<PeakSpan>,
  ): PeakSpan => ({
    from,
    lastFrom,
    until,
    wholePeriod: false,
    varies: false,
    ...extra,
  })

  it('says "the whole period" when the peak filled it', () => {
    assert.equal(
      describePeakSpan(span('2024-01-01', '2024-01-01', '2024-12-31', {wholePeriod: true}), PERIOD),
      'the whole period',
    )
  })

  /**
   * The case that earns the column. A late start is a late acquisition in this
   * dataset, so "from 12 May 2024" is really "you bought it already in
   * window" — a sharper regret than having held it all year.
   */
  it('names a late start when the peak ran to the end of the period', () => {
    assert.equal(
      describePeakSpan(span('2024-05-12', '2024-05-12', '2024-12-31'), PERIOD),
      'from 12 May 2024',
    )
  })

  /**
   * Not symmetrical with the case above, and it should not be. A window that
   * closed inside the period is the common shape once the period stops being a
   * calendar year: the twelve months ending in September 2026 contain the 31
   * December 2025 closing, which is the whole reason the period trails.
   */
  it('names an early end when the peak ran from the start of the period', () => {
    assert.equal(
      describePeakSpan(span('2024-01-01', '2024-01-01', '2024-05-04'), PERIOD),
      'until 4 May 2024',
    )
  })

  it('gives both ends when the peak sat inside the period', () => {
    assert.equal(
      describePeakSpan(span('2024-05-12', '2024-05-12', '2024-12-09'), PERIOD),
      '12 May – 9 Dec 2024',
    )
    assert.equal(
      describePeakSpan(span('2024-07-01', '2024-07-01', '2025-05-04'), {
        start: '2024-07-01',
        end: '2025-06-30',
      }),
      'until 4 May 2025',
    )
  })

  /**
   * Where the group's bottles disagree the phrase describes the longest-held
   * one and the view adds the latest start beneath it. Widening the phrase to
   * cover every bottle would make it true of none of them.
   */
  it('describes the longest-held bottle when a group varies', () => {
    assert.equal(
      describePeakSpan(
        span('2024-01-01', '2024-12-09', '2024-12-31', {wholePeriod: false, varies: true}),
        PERIOD,
      ),
      'the whole period',
    )
  })
})

describe('span formatting', () => {
  it('states the year once when both ends share it', () => {
    assert.equal(formatDateSpan('2024-05-12', '2024-12-31'), '12 May – 31 Dec 2024')
  })

  it('states both years when the span crosses one', () => {
    assert.equal(formatDateSpan('2024-07-01', '2025-05-04'), '1 Jul 2024 – 4 May 2025')
  })

  it('formats a day and month without a year', () => {
    assert.equal(formatDayMonth('2024-01-01'), '1 Jan')
    assert.equal(formatDayMonth('2024-12-31'), '31 Dec')
  })
})
