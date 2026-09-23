import assert from 'node:assert/strict'
import {join} from 'node:path'
import {describe, it, test} from 'node:test'
import {drinkingIntervals} from '@cellar/core'
import {readCsv} from '../../packages/cellar-core/test/helpers/csv.mts'
import {
  loadCellarFromNdjson,
  ORACLE_NOW,
  SAMPLE_DATA,
} from '../../packages/cellar-core/test/helpers/fixture.mts'
import {
  compareMissedRows,
  explainEmptyMissed,
  scanPeriod,
  summarizeMissed,
  trailingPeriod,
  type MissedRow,
} from '../src/missedRows.ts'

/**
 * THE ORACLE, one layer up.
 *
 * `sample_data/expected-misses.csv` was generated on 19 September by evaluating
 * the state on every calendar day of each period — a brute-force method,
 * deliberately different from the boundary scan, and written before this view
 * existed. `packages/cellar-core/test/oracle.test.mts` already drives it
 * against `missedOpportunities` directly, so repeating that here would assert
 * nothing new.
 *
 * What these tests check is the layer core cannot see: that the rows the screen
 * draws expand back into exactly the oracle's set of bottles. A grouping that
 * drops a bottle, a sort that loses a row, a filter applied twice or a count
 * that does not match its own group are all invisible to a test of the
 * predicate and all visible here.
 *
 * The table is the authority. If one of these fails, the view is what is wrong
 * until proven otherwise. Do not edit the CSV to make them pass.
 */

const cellar = loadCellarFromNdjson()

const rows = readCsv(join(SAMPLE_DATA, 'expected-misses.csv'))

interface OraclePeriod {
  start: string
  end: string
  bottles: string[]
  wineOf: Map<string, string>
}

const byPeriod = new Map<string, OraclePeriod>()
for (const row of rows) {
  let period = byPeriod.get(row.period!)
  if (!period) {
    period = {start: row.start!, end: row.end!, bottles: [], wineOf: new Map()}
    byPeriod.set(row.period!, period)
  }
  period.bottles.push(row.bottle!)
  period.wineOf.set(row.bottle!, row.wine!)
}

/** Every bottle listed by the view, across all its rows. */
function listedBottles(viewRows: readonly MissedRow[]): string[] {
  return viewRows.flatMap((row) => row.bottleIds).sort()
}

describe('expected-misses.csv, expanded through the view', () => {
  test('the oracle table is not empty', () => {
    assert.ok(byPeriod.size > 0, 'expected-misses.csv has no rows')
  })

  test(`every row is checked (${rows.length} rows across ${byPeriod.size} periods)`, () => {
    // Each period below asserts a complete set equality and each bottle gets a
    // test of its own, so every row of the file participates. This makes the
    // arithmetic explicit rather than leaving it to be reconciled by reading.
    const grouped = [...byPeriod.values()].reduce((total, p) => total + p.bottles.length, 0)
    assert.equal(grouped, rows.length, 'rows lost while grouping by period')

    for (const [name, period] of byPeriod) {
      assert.equal(
        new Set(period.bottles).size,
        period.bottles.length,
        `${name}: duplicate bottle rows would mask a missing one`,
      )
    }
  })

  for (const [name, period] of byPeriod) {
    const expected = [...period.bottles].sort()
    const summary = summarizeMissed(cellar, {start: period.start, end: period.end}, ORACLE_NOW)

    describe(`${name} (${expected.length} bottles)`, () => {
      test('the rows expand to exactly the oracle set', () => {
        const actual = listedBottles(summary.rows)

        const missing = expected.filter((id) => !actual.includes(id))
        const extra = actual.filter((id) => !expected.includes(id))

        assert.deepEqual(
          {missing, extra},
          {missing: [], extra: []},
          `${name}: the view's rows disagree with the every-day oracle.\n` +
            `  in oracle, not listed: ${missing.join(', ') || '(none)'}\n` +
            `  listed, not in oracle: ${extra.join(', ') || '(none)'}`,
        )
        assert.deepEqual(actual, expected, `${name}: bottle set`)
      })

      // One assertion per row of the file. A set comparison can pass while a
      // bottle sits under the wrong wine; this cannot.
      for (const bottleId of expected) {
        test(`${bottleId} is listed under ${period.wineOf.get(bottleId)}`, () => {
          const holders = summary.rows.filter((row) => row.bottleIds.includes(bottleId))
          assert.equal(holders.length, 1, `${bottleId}: expected exactly one row to carry it`)
          assert.equal(holders[0]!.wineId, period.wineOf.get(bottleId), `${bottleId}: wine`)
        })
      }

      test('the headline count is the sum of its rows', () => {
        const summed = summary.rows.reduce((total, row) => total + row.bottleCount, 0)
        assert.equal(summed, expected.length, 'sum of row counts')
        assert.equal(summary.bottleCount, expected.length, 'headline')
        for (const row of summary.rows) {
          assert.equal(row.bottleIds.length, row.bottleCount, `${row.wineId}: count vs members`)
        }
      })

      test('the rows partition the oracle set by wine', () => {
        const seen = new Set<string>()
        for (const row of summary.rows) {
          assert.ok(row.bottleCount > 0, `${row.wineId}: empty row`)
          for (const bottleId of row.bottleIds) {
            assert.ok(!seen.has(bottleId), `${bottleId} appears in more than one row`)
            seen.add(bottleId)
            assert.equal(
              cellar.bottles.get(bottleId)?.wineId,
              row.wineId,
              `${bottleId}: grouped under the wrong wine`,
            )
          }
        }
      })

      /**
       * The four roles account for every at-peak bottle of a listed wine. This
       * is what makes "3 of 5" a statement rather than a ratio: the other two
       * are in the same row, named.
       */
      test('every at-peak bottle of a listed wine is in exactly one role', () => {
        for (const row of summary.rows) {
          assert.equal(
            row.bottleCount + row.openedInPeriod + row.openedLater + row.heldStill,
            row.peakedCount,
            `${row.wineId}: roles do not sum to the at-peak count`,
          )
          assert.ok(row.peakedCount >= row.bottleCount, `${row.wineId}: fewer at peak than lost`)
        }
      })

      /**
       * The gate, checked from the other side.
       *
       * `summarizeMissed` reaches its answer through `missedOpportunities`,
       * which tests `state(bottle, now) == PAST_WINDOW` first and only runs the
       * boundary scan on the 33 bottles that pass. `scanPeriod` runs the scan on
       * all 542 and classifies afterwards. The two paths must agree, and if the
       * gate ever excludes a bottle it should not, this is what notices.
       */
      test('the ungated scan finds the same number of lost bottles', () => {
        const scan = scanPeriod(cellar, {start: period.start, end: period.end}, ORACLE_NOW)
        assert.equal(scan.lostCount, expected.length, 'lost')
        assert.equal(
          scan.peakedCount,
          scan.lostCount + scan.openedInPeriod + scan.openedLater + scan.heldStill,
          'roles do not sum to the at-peak count',
        )
        assert.ok(scan.peakedCount >= scan.lostCount, 'fewer at peak than lost')
      })

      test('every row carries the window that judges it past', () => {
        for (const row of summary.rows) {
          assert.ok(row.window, `${row.wineId}: PAST_WINDOW without a resolved window`)
          assert.ok(
            row.window!.drinkUntil < ORACLE_NOW,
            `${row.wineId}: window has not closed as of ${ORACLE_NOW}`,
          )
        }
      })

      /**
       * The assumption the "At peak" column is built on. Peak ends come from
       * the window, which belongs to the wine, so a group shares one; peak
       * starts can come from `acquiredAt`, so a group need not. The phrase
       * describes the longest-held bottle and the view prints the latest start
       * beneath it, which is only sound while this holds.
       */
      test('a wine group shares one peak end', () => {
        for (const row of summary.rows) {
          const ends = new Set(
            row.bottleIds.map((bottleId) => {
              const intervals = drinkingIntervals(cellar, bottleId, {
                start: period.start,
                end: period.end,
              })
              return intervals[intervals.length - 1]!.until
            }),
          )
          assert.equal(ends.size, 1, `${row.wineId}: bottles ended their peaks apart`)
          assert.equal(row.peak.until, [...ends][0], `${row.wineId}: span end`)
        }
      })

      test('the rows are in display order', () => {
        for (let index = 1; index < summary.rows.length; index++) {
          assert.ok(
            compareMissedRows(summary.rows[index - 1]!, summary.rows[index]!) <= 0,
            `${summary.rows[index - 1]!.wineId} should not precede ${summary.rows[index]!.wineId}`,
          )
        }
      })
    })
  }

  /**
   * The identity that ties the control to the oracle.
   *
   * Twelve months ending on 31 December is that calendar year, so dragging the
   * date field to 2023-12-31 shows the oracle's 2023 period. Without this the
   * automated check and the number on screen would be the same code reached by
   * different arguments; with it they are the same number.
   */
  describe('reached through the control rather than by hand', () => {
    for (const [name, period] of byPeriod) {
      it(`asOf ${period.end} shows the ${name} set`, () => {
        const derived = trailingPeriod(period.end)
        assert.deepEqual(derived, {start: period.start, end: period.end}, 'derived period')

        const summary = summarizeMissed(cellar, derived, ORACLE_NOW)
        assert.equal(summary.bottleCount, period.bottles.length, 'headline count')
        assert.deepEqual(listedBottles(summary.rows), [...period.bottles].sort(), 'bottle set')
      })
    }
  })

  /**
   * Why the live app agrees with a table pinned to 18 September.
   *
   * The app reads the real clock, and the oracle cannot. Nothing in the ledger
   * changes state between the two dates, so both produce the same sets — which
   * is a property of this data rather than a rule, and is asserted here so that
   * "17 bottles on screen" and "17 rows in the CSV" stay the same claim.
   */
  it('gives the same sets at the oracle date and at the build date', () => {
    for (const [name, period] of byPeriod) {
      const at = (now: string) =>
        listedBottles(summarizeMissed(cellar, {start: period.start, end: period.end}, now).rows)
      assert.deepEqual(at('2026-09-23'), at(ORACLE_NOW), `${name}: sets differ between the dates`)
    }
  })
})

/**
 * The empty state.
 *
 * Empty is the common reading of this view and the reasons are different claims
 * about the cellar, so each one gets a period that reaches it. The counts were
 * taken from a standalone scan of `cellar.ndjson` before `missedRows.ts`
 * existed — a plain loop over `drinkingIntervals` and `bottleState` rather than
 * this module — which is what makes them expectations rather than observations.
 */
describe('the empty state', () => {
  const year = (y: number) => ({start: `${y}-01-01`, end: `${y}-12-31`})

  it('reports a period that has not happened yet without scanning', () => {
    const reason = explainEmptyMissed(cellar, year(2030), ORACLE_NOW)
    assert.equal(reason.kind, 'FUTURE_PERIOD')
    assert.equal(reason.peakedCount, 0, 'the scan should be skipped entirely')
  })

  it('reports an empty cellar before the ledger begins', () => {
    const reason = explainEmptyMissed(cellar, year(1995), ORACLE_NOW)
    assert.equal(reason.kind, 'EMPTY_CELLAR')
    assert.equal(reason.firstAcquisition, '1996-05-18')
  })

  it('reports bottles with no open window', () => {
    const reason = explainEmptyMissed(cellar, year(2015), ORACLE_NOW)
    assert.equal(reason.kind, 'NONE_AT_PEAK')
    assert.equal(reason.peakedCount, 0)
  })

  /**
   * The common empty reading, and the good one: bottles peaked, most were left,
   * and not one of them was wasted. This is the branch the lazy full scan pays
   * for — the sentence needs all four numbers.
   */
  it('reports a period where nothing was lost', () => {
    const reason = explainEmptyMissed(cellar, year(2019), ORACLE_NOW)
    assert.equal(reason.kind, 'NOTHING_LOST')
    assert.equal(reason.peakedCount, 47, 'at peak')
    assert.equal(reason.openedInPeriod, 8, 'opened during the period')
    assert.equal(reason.openedLater, 32, 'opened since')
    assert.equal(reason.heldStill, 7, 'still in hand and not past window')
    assert.equal(reason.lostCount, 0, 'lost')
  })

  it('agrees with the row builder about every period being empty', () => {
    for (const y of [1995, 2015, 2019, 2030]) {
      assert.equal(summarizeMissed(cellar, year(y), ORACLE_NOW).rows.length, 0, String(y))
    }
  })

  /**
   * ALL_OPENED has no period in this dataset that reaches it: every year with a
   * bottle at peak also has one that went unopened. The branch is written
   * anyway, and this records the gap rather than letting a passing suite imply
   * coverage it does not have.
   */
  it('has no seed-data period that reaches ALL_OPENED', () => {
    const reached: number[] = []
    for (let y = 1996; y <= 2026; y++) {
      const scan = scanPeriod(cellar, year(y), ORACLE_NOW)
      if (scan.peakedCount > 0 && scan.openedInPeriod === scan.peakedCount) reached.push(y)
    }
    assert.deepEqual(reached, [], 'a period now reaches ALL_OPENED; the branch is testable')
  })
})
