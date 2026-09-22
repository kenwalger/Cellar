/**
 * THE ORACLE.
 *
 * These tests drive three expected-output tables that were produced
 * independently of this module, before it existed:
 *
 *   expected-states.csv    states and verdicts for eleven bottles at four
 *                          asOf dates; six of them worked by hand
 *   expected-misses.csv    missed opportunities for 2023 and 2024, generated
 *                          by evaluating state on every calendar day of each
 *                          period — a deliberately different method from the
 *                          boundary scan this module uses
 *   expected-drift.csv     one row per consumption: the verdict under the
 *                          window in force when the bottle was opened, and
 *                          the verdict under the window resolving as of now
 *
 * The tables are the authority. If a test here fails, the implementation is
 * what is wrong until proven otherwise. Do not edit the CSVs to make these
 * pass.
 */

import assert from 'node:assert/strict'
import {join} from 'node:path'
import {describe, test} from 'node:test'
import {
  bottleState,
  consumptionVerdict,
  missedOpportunities,
  verdictDrift,
  type ResolvedWindow,
} from '../dist/index.js'
import {readCsv} from './helpers/csv.mts'
import {loadCellarFromNdjson, ORACLE_NOW, SAMPLE_DATA} from './helpers/fixture.mts'

const cellar = loadCellarFromNdjson()

/** The oracle writes a window's provenance as "<sourceType> <assessedAt>". */
function windowSource(window: {sourceType: string; assessedAt: string} | null): string {
  return window ? `${window.sourceType} ${window.assessedAt}` : ''
}

function assertWindow(
  window: {drinkFrom: string; drinkUntil: string; sourceType: string; assessedAt: string} | null,
  row: Record<string, string>,
  context: string,
): void {
  // Checking provenance, not just the label. A resolution bug that picks the
  // wrong claim can still land on the right state by luck; it cannot also
  // land on the right source and dates.
  assert.equal(window?.drinkFrom ?? '', row.windowFrom, `${context}: drinkFrom`)
  assert.equal(window?.drinkUntil ?? '', row.windowUntil, `${context}: drinkUntil`)
  assert.equal(windowSource(window), row.windowSource, `${context}: window source`)
}

describe('expected-states.csv', () => {
  const rows = readCsv(join(SAMPLE_DATA, 'expected-states.csv'))

  test('the oracle table is not empty', () => {
    assert.ok(rows.length > 0, 'expected-states.csv has no rows')
  })

  for (const row of rows) {
    const label = `${row.kind} ${row.bottle} @ ${row.date} (${row.check})`

    if (row.kind === 'state') {
      test(label, () => {
        const result = bottleState(cellar, row.bottle!, row.date!)
        assert.equal(result.state, row.expected, `${label}: state`)
        assertWindow(result.window, row, label)
      })
      continue
    }

    if (row.kind === 'verdict') {
      test(label, () => {
        const result = consumptionVerdict(cellar, row.bottle!)
        assert.ok(result, `${label}: bottle has no consumption`)
        // The date column on a verdict row is the consumption date, so it
        // doubles as a check that consumedAt truncated to its UTC calendar
        // date is the day the ledger recorded.
        assert.equal(result.consumedOn, row.date, `${label}: consumedOn`)
        assert.equal(result.verdict, row.expected, `${label}: verdict`)
        assertWindow(result.windowAtConsumption, row, label)
      })
      continue
    }

    test(label, () => {
      assert.fail(`unknown kind "${row.kind}" in expected-states.csv`)
    })
  }
})

describe('expected-misses.csv', () => {
  const rows = readCsv(join(SAMPLE_DATA, 'expected-misses.csv'))

  const byPeriod = new Map<string, {start: string; end: string; bottles: string[]}>()
  for (const row of rows) {
    const period = byPeriod.get(row.period!)
    if (period) period.bottles.push(row.bottle!)
    else byPeriod.set(row.period!, {start: row.start!, end: row.end!, bottles: [row.bottle!]})
  }

  test('the oracle table is not empty', () => {
    assert.ok(byPeriod.size > 0, 'expected-misses.csv has no rows')
  })

  test(`every row is checked (${rows.length} rows across ${byPeriod.size} periods)`, () => {
    // Each period below asserts a complete set equality, so every row of the
    // file participates in exactly one comparison. This test makes that
    // arithmetic explicit: the file has more rows than it has tests, and the
    // two numbers should not have to be reconciled by reading the code.
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

    test(`missed opportunities for ${name} (${expected.length} bottles)`, () => {
      const actual = missedOpportunities(
        cellar,
        {start: period.start, end: period.end},
        ORACLE_NOW,
      ).map((missed) => missed.bottleId)

      // Compare as sets so a failure names the disagreement rather than
      // reporting an ordering difference as a mismatch.
      const missing = expected.filter((id) => !actual.includes(id))
      const extra = actual.filter((id) => !expected.includes(id))

      assert.deepEqual(
        {missing, extra},
        {missing: [], extra: []},
        `${name}: boundary scan disagrees with the every-day oracle.\n` +
          `  in oracle, not produced: ${missing.join(', ') || '(none)'}\n` +
          `  produced, not in oracle: ${extra.join(', ') || '(none)'}`,
      )
      assert.deepEqual(actual, expected, `${name}: bottle set`)
    })

    test(`every ${name} miss carries at least one peak interval`, () => {
      const produced = missedOpportunities(
        cellar,
        {start: period.start, end: period.end},
        ORACLE_NOW,
      )
      for (const missed of produced) {
        assert.ok(
          missed.peakIntervals.length > 0,
          `${missed.bottleId} was reported as missed with no DRINKING interval`,
        )
        for (const interval of missed.peakIntervals) {
          assert.ok(
            interval.from >= period.start,
            `${missed.bottleId}: interval starts before period`,
          )
          assert.ok(interval.until <= period.end, `${missed.bottleId}: interval ends after period`)
          assert.ok(interval.from <= interval.until, `${missed.bottleId}: inverted interval`)
        }
      }
    })
  }
})

describe('expected-drift.csv', () => {
  const rows = readCsv(join(SAMPLE_DATA, 'expected-drift.csv'))

  /** The drift oracle writes a window as "<fromYear>-<untilYear> <tier> <assessedAt>". */
  const summarize = (window: ResolvedWindow | null): string =>
    window
      ? `${window.drinkFrom.slice(0, 4)}-${window.drinkUntil.slice(0, 4)} ` +
        `${window.sourceType} ${window.assessedAt}`
      : ''

  test('the oracle table is not empty', () => {
    assert.ok(rows.length > 0, 'expected-drift.csv has no rows')
  })

  test('the oracle covers every consumption in the dataset', () => {
    // Guards against the table and the dataset drifting apart: a consumption
    // added to the ledger without regenerating the oracle would otherwise go
    // silently unchecked.
    assert.equal(rows.length, cellar.consumptionByBottle.size)
    const covered = new Set(rows.map((row) => row.bottle))
    const uncovered = [...cellar.consumptionByBottle.keys()].filter((id) => !covered.has(id))
    assert.deepEqual(uncovered, [], 'consumptions with no oracle row')
  })

  for (const row of rows) {
    const label = `drift ${row.bottle} @ ${row.consumedOn}`

    test(label, () => {
      const drift = verdictDrift(cellar, row.bottle!, ORACLE_NOW)
      assert.ok(drift, `${label}: bottle has no consumption`)

      assert.equal(drift.consumedOn, row.consumedOn, `${label}: consumedOn`)
      assert.equal(drift.verdict, row.verdictThen, `${label}: verdict at the time`)
      assert.equal(drift.verdictNow, row.verdictNow, `${label}: verdict under today's window`)
      assert.equal(summarize(drift.windowAtConsumption), row.windowThen, `${label}: window then`)
      assert.equal(summarize(drift.windowNow), row.windowNow, `${label}: window now`)
      assert.equal(
        drift.changed,
        row.verdictThen !== row.verdictNow,
        `${label}: changed flag disagrees with the two verdicts`,
      )
    })
  }

  test('the count of drifted verdicts matches the oracle', () => {
    const expected = rows.filter((row) => row.verdictThen !== row.verdictNow).length
    const actual = rows.filter(
      (row) => verdictDrift(cellar, row.bottle!, ORACLE_NOW)?.changed === true,
    ).length
    assert.equal(actual, expected, 'number of bottles a later claim would judge differently')
  })
})
