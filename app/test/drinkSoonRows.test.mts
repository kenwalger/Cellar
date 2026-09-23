import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {addMonths, bottleState, isDrinkSoon} from '@cellar/core'
import {loadCellarFromNdjson} from '../../packages/cellar-core/test/helpers/fixture.mts'
import {
  compareDrinkSoonRows,
  DRINK_SOON_MONTHS,
  firstAcquisitionDate,
  summarizeDrinkSoon,
} from '../src/drinkSoonRows.ts'

/**
 * Tests for the Drink Soon view's arithmetic.
 *
 * Every number below was agreed before the component existed, from a scan of
 * `sample_data/cellar.ndjson` through `@cellar/core`, and reviewed against the
 * five verification dates in the build record. They are expectations, not
 * observations: if the code disagrees with them the code is what changes.
 *
 * The fixture loader comes from `@cellar/core`'s own test helpers rather than
 * being reimplemented here. It reads the same NDJSON that was imported,
 * offline, and a second loader in this file would be a second thing to keep in
 * step with the dataset. Two caveats it carries forward: the NDJSON has no
 * `_createdAt`, so tie-breaks fall through to `_id`, and the seed data has no
 * same-tier same-day ties for that to matter to.
 */

const cellar = loadCellarFromNdjson()

/** Name, bottles, tier, source, assessedAt, accepted claims visible. */
type Row = [string, number, string, string, string, number]

function rowsAt(asOf: string): Row[] {
  return summarizeDrinkSoon(cellar, asOf).rows.map((row) => [
    row.name,
    row.bottleCount,
    row.window.sourceType,
    row.window.sourceName,
    row.window.assessedAt,
    row.window.visibleCount,
  ])
}

describe('the five verification dates', () => {
  /**
   * The table the view is checked against by hand. Drink Soon is empty at
   * three of the five, which is why the empty state is a normal reading of
   * this view rather than an error path.
   */
  const EXPECTED = [
    {asOf: '1999-06-01', soon: 0, wines: 0, drinking: 4, inCellar: 4, nearest: '2012-12-31'},
    {asOf: '2019-12-31', soon: 0, wines: 0, drinking: 39, inCellar: 124, nearest: '2026-12-31'},
    {asOf: '2023-03-15', soon: 0, wines: 0, drinking: 122, inCellar: 198, nearest: '2024-12-31'},
    {asOf: '2025-06-01', soon: 10, wines: 4, drinking: 147, inCellar: 226, nearest: '2025-12-31'},
    {asOf: '2026-09-18', soon: 23, wines: 12, drinking: 166, inCellar: 248, nearest: '2026-12-31'},
  ]

  for (const {asOf, soon, wines, drinking, inCellar, nearest} of EXPECTED) {
    it(`reports ${soon} of ${drinking} drinking at ${asOf}`, () => {
      const summary = summarizeDrinkSoon(cellar, asOf)
      assert.equal(summary.bottleCount, soon, 'bottles')
      assert.equal(summary.rows.length, wines, 'wines')
      assert.equal(summary.drinkingCount, drinking, 'drinking')
      assert.equal(summary.inCellarCount, inCellar, 'in cellar')
      assert.equal(summary.nearestClose, nearest, 'nearest close')
    })
  }

  /**
   * The four in-cellar states partition the cellar, so this is the same check
   * `CellarHealth` makes against `inCellar()` — cheap, and it fails loudly if
   * the scan ever drops a bottle into no bucket at all.
   */
  it('accounts for every in-cellar bottle in exactly one state', () => {
    for (const {asOf, inCellar} of EXPECTED) {
      const s = summarizeDrinkSoon(cellar, asOf)
      assert.equal(
        s.drinkingCount + s.holdCount + s.pastWindowCount + s.unassessedCount,
        inCellar,
        asOf,
      )
    }
  })
})

describe('rows at 2025-06-01', () => {
  it('lists four wines, ten bottles, all closing at the end of 2025', () => {
    assert.deepEqual(rowsAt('2025-06-01'), [
      ['2022 Farm on Golden Hill Chardonnay', 5, 'personal', 'me', '2025-04-26', 3],
      ['2019 Paradis Vineyards Pinot Noir', 2, 'personal', 'me', '2022-08-17', 3],
      ['2021 Vitis Ridge Rose of Pinot Noir', 2, 'producer', 'Vitis Ridge', '2022-06-12', 1],
      ['2021 Paradis Vineyards Pinot Gris', 1, 'personal', 'me', '2024-03-04', 3],
    ])

    for (const row of summarizeDrinkSoon(cellar, '2025-06-01').rows) {
      assert.equal(row.window.drinkUntil, '2025-12-31', row.name)
    }
  })
})

describe('rows at 2026-09-18', () => {
  it('lists twelve wines, twenty-three bottles, all closing at the end of 2026', () => {
    assert.deepEqual(rowsAt('2026-09-18'), [
      ['2024 Farm on Golden Hill Rose', 5, 'personal', 'me', '2025-04-05', 2],
      ['2024 Paradis Vineyards Marechal Foch', 4, 'personal', 'me', '2025-12-05', 2],
      ['2014 Brooks Riesling', 3, 'personal', 'me', '2020-09-12', 3],
      ['2013 Brooks Pinot Noir', 2, 'personal', 'me', '2018-11-13', 2],
      ['2021 Vitis Ridge Pinot Noir', 2, 'producer', 'Vitis Ridge', '2023-05-12', 2],
      ['2019 Lodi (assorted) Zinfandel', 1, 'personal', 'me', '2025-03-05', 2],
      ['2021 Paradis Vineyards Pinot Noir', 1, 'producer', 'Paradis Vineyards', '2023-07-12', 1],
      ["2021 St. Josef's Pinot Noir", 1, 'producer', "St. Josef's", '2023-06-12', 2],
      ['2021 Vitis Ridge Pinot Gris', 1, 'producer', 'Vitis Ridge', '2022-04-12', 1],
      ['2022 Vitis Ridge Marechal Foch', 1, 'producer', 'Vitis Ridge', '2023-04-12', 1],
      ['2022 Vitis Ridge Pinot Gris', 1, 'personal', 'me', '2025-06-02', 2],
      ['2022 Vitis Ridge Rose of Pinot Noir', 1, 'producer', 'Vitis Ridge', '2023-05-12', 2],
    ])

    for (const row of summarizeDrinkSoon(cellar, '2026-09-18').rows) {
      assert.equal(row.window.drinkUntil, '2026-12-31', row.name)
    }
  })

  /**
   * Only personal and producer claims resolve in this set. Worth asserting:
   * the tier mix is the resolution rule made visible, and a change to
   * AUTHORITY_ORDER or to `reviewState` handling would show up here first.
   */
  it('resolves sixteen bottles from personal claims and seven from producer', () => {
    const byTier = new Map<string, number>()
    for (const row of summarizeDrinkSoon(cellar, '2026-09-18').rows) {
      byTier.set(row.window.sourceType, (byTier.get(row.window.sourceType) ?? 0) + row.bottleCount)
    }
    assert.deepEqual([...byTier].sort(), [
      ['personal', 16],
      ['producer', 7],
    ])
  })
})

describe('grouping by wine', () => {
  /**
   * The claim that licenses a row being a wine rather than a bottle: the
   * window resolves from the wine, so every drink-soon bottle of a wine
   * resolved the identical window on the date. If this ever failed, the row's
   * single provenance line would be speaking for bottles it does not describe.
   */
  it('gives every bottle of a wine the same window', () => {
    for (const asOf of ['2025-06-01', '2026-09-18']) {
      const seen = new Map<string, Set<string>>()
      let counted = 0

      for (const [bottleId, bottle] of cellar.bottles) {
        const result = bottleState(cellar, bottleId, asOf)
        if (!isDrinkSoon(result, asOf, DRINK_SOON_MONTHS) || !result.window) continue
        counted++
        const key = `${result.window.assessmentId}|${result.window.drinkFrom}|${result.window.drinkUntil}`
        const windows = seen.get(bottle.wineId) ?? new Set<string>()
        windows.add(key)
        seen.set(bottle.wineId, windows)
      }

      for (const [wineId, windows] of seen) {
        assert.equal(windows.size, 1, `${asOf}: ${wineId} resolved ${windows.size} windows`)
      }
      assert.equal(counted, summarizeDrinkSoon(cellar, asOf).bottleCount, asOf)
    }
  })

  it('orders on close date, then bottles, then name, then id', () => {
    const window = (drinkUntil: string) =>
      ({
        drinkFrom: '2020-01-01',
        drinkUntil,
        sourceType: 'personal',
        sourceName: 'me',
        assessedAt: '2020-01-01',
        assessmentId: 'a',
        visibleCount: 1,
      }) as const

    const row = (wineId: string, name: string, bottleCount: number, drinkUntil: string) => ({
      wineId,
      name,
      bottleCount,
      window: window(drinkUntil),
    })

    // Soonest close wins outright, even against a much larger group.
    assert.ok(
      compareDrinkSoonRows(row('w1', 'A', 1, '2026-12-31'), row('w2', 'A', 9, '2027-12-31')) < 0,
    )
    // Same close: more bottles first.
    assert.ok(
      compareDrinkSoonRows(row('w1', 'B', 5, '2026-12-31'), row('w2', 'A', 1, '2026-12-31')) < 0,
    )
    // Same close and count: name ascending.
    assert.ok(
      compareDrinkSoonRows(row('w1', 'A', 1, '2026-12-31'), row('w2', 'B', 1, '2026-12-31')) < 0,
    )
    // Identical on every visible key: the id makes the order total.
    assert.ok(
      compareDrinkSoonRows(row('w1', 'A', 1, '2026-12-31'), row('w2', 'A', 1, '2026-12-31')) < 0,
    )
    assert.equal(
      compareDrinkSoonRows(row('w1', 'A', 1, '2026-12-31'), row('w1', 'A', 1, '2026-12-31')),
      0,
    )
  })
})

describe('the horizon', () => {
  /**
   * The step function that argues the horizon should be fixed.
   *
   * Every `drinkUntil` in the dataset is 31 December, so the count can only
   * move as the horizon crosses a year boundary. At 2026-09-18 it is 23 from
   * four months through fourteen. A slider across that range would be flat for
   * most of its travel.
   */
  it('moves a year at a time', () => {
    const HORIZONS = [1, 3, 6, 12, 18, 24, 36, 60]
    const EXPECTED: Record<string, number[]> = {
      '1999-06-01': [0, 0, 0, 0, 0, 0, 0, 0],
      '2019-12-31': [0, 0, 0, 0, 0, 0, 0, 0],
      '2023-03-15': [0, 0, 0, 0, 0, 9, 33, 59],
      '2025-06-01': [0, 0, 0, 10, 10, 30, 63, 77],
      '2026-09-18': [0, 0, 23, 23, 49, 49, 67, 106],
    }

    for (const [asOf, counts] of Object.entries(EXPECTED)) {
      assert.deepEqual(
        HORIZONS.map((months) => summarizeDrinkSoon(cellar, asOf, months).bottleCount),
        counts,
        asOf,
      )
    }
  })

  it('is every accepted window bound, so the quantization is a property of the data', () => {
    let bounds = 0
    for (const list of cellar.acceptedByWine.values()) {
      for (const a of list) {
        assert.ok(a.drinkFrom.endsWith('-01-01'), a.id)
        assert.ok(a.drinkUntil.endsWith('-12-31'), a.id)
        bounds++
      }
    }
    assert.equal(bounds, 161)
  })

  /**
   * The 31 December discontinuity, recorded rather than fixed.
   *
   * On any other date a 12-month horizon reaches into the next year but stops
   * short of its 31 December, so it means exactly "closes this calendar year".
   * On 31 December it reaches the following one and the view takes in two
   * years at once. 2019-12-31 is one of the verification dates and sits
   * exactly on it; the count there is 0 either way, because the nearest
   * closing window is 2026-12-31, so the edge is documented here rather than
   * visible in the table.
   */
  it('reaches two calendar years when asOf is 31 December', () => {
    assert.equal(addMonths('2026-09-18', 12), '2027-09-18')
    assert.ok(addMonths('2026-09-18', 12) < '2027-12-31')

    assert.equal(addMonths('2019-12-31', 12), '2020-12-31')
    assert.ok(addMonths('2019-12-31', 12) >= '2020-12-31')

    const summary = summarizeDrinkSoon(cellar, '2019-12-31')
    assert.equal(summary.bottleCount, 0)
    assert.equal(summary.nearestClose, '2026-12-31')
  })
})

describe('the empty states', () => {
  it('has nothing in the cellar before the first acquisition', () => {
    const first = firstAcquisitionDate(cellar)
    assert.equal(first, '1996-05-18')

    const summary = summarizeDrinkSoon(cellar, '1996-05-17')
    assert.equal(summary.inCellarCount, 0)
    assert.equal(summary.drinkingCount, 0)
    assert.equal(summary.rows.length, 0)

    // Six bottles share that first date, which is why the empty state says
    // the ledger begins there rather than naming "the first bottle".
    assert.equal(summarizeDrinkSoon(cellar, '1996-05-18').inCellarCount, 6)
  })

  /**
   * The common case, and the good one: bottles are drinking, none is closing.
   * `nearestClose` is what lets the view say how far off the next one is
   * rather than reporting an absence and stopping.
   */
  it('names the next closing window when nothing is closing yet', () => {
    for (const [asOf, nearest] of [
      ['1999-06-01', '2012-12-31'],
      ['2019-12-31', '2026-12-31'],
      ['2023-03-15', '2024-12-31'],
    ]) {
      const summary = summarizeDrinkSoon(cellar, asOf)
      assert.equal(summary.rows.length, 0, asOf)
      assert.ok(summary.drinkingCount > 0, asOf)
      assert.equal(summary.nearestClose, nearest, asOf)
      assert.ok(summary.nearestClose! > addMonths(asOf, DRINK_SOON_MONTHS), asOf)
    }
  })

  it('has no nearest close when nothing is drinking', () => {
    const summary = summarizeDrinkSoon(cellar, '1996-05-18')
    assert.equal(summary.nearestClose, null)
  })
})
