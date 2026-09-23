/**
 * NOT THE ORACLE.
 *
 * These are synthetic fixtures covering rules the seed data structurally
 * cannot exercise: every assessment in the dataset is `accepted`, and there
 * are no same-tier same-day ties for the tie-break to resolve. Verified
 * directly against the dataset — 161 accepted assessments, 161 distinct
 * wine/tier/date keys.
 *
 * They prove the implementation matches a reading of the spec. They are not
 * independent verification the way expected-states.csv and
 * expected-misses.csv are, and a failure here means one of the two is wrong
 * without saying which. Keep the distinction.
 */

import assert from 'node:assert/strict'
import {describe, test} from 'node:test'
import {
  addMonths,
  bottleState,
  buildCellar,
  consumptionVerdict,
  drinkingIntervals,
  isDrinkSoon,
  missedOpportunities,
  normalizeWindowBound,
  resolvedWindow,
  toUtcDate,
  verdictDrift,
  wineDisplayName,
  type AssessmentInput,
  type CellarSnapshot,
} from '../dist/index.js'

const NOW = '2026-09-18'

function assessment(overrides: Partial<AssessmentInput> & {id: string}): AssessmentInput {
  return {
    wineId: 'w',
    sourceType: 'producer',
    sourceName: 'Fixture',
    assessedAt: '2020-01-01',
    drinkFrom: '2020-01-01',
    drinkUntil: '2030-12-31',
    reviewState: 'accepted',
    createdAt: '2020-01-01T00:00:00Z',
    ...overrides,
  }
}

function snapshot(assessments: AssessmentInput[], overrides: Partial<CellarSnapshot> = {}) {
  return {
    wines: [{id: 'w', vintageYear: 2018, producerName: 'Fixture Estate', cuvee: 'Reserve'}],
    bottles: [{id: 'b', wineId: 'w'}],
    acquisitions: [{id: 'acq-b', bottleId: 'b', acquiredAt: '2019-01-01'}],
    consumptions: [],
    assessments,
    ...overrides,
  }
}

describe('only accepted assessments resolve', () => {
  test('a proposed assessment does not affect the window', () => {
    const cellar = buildCellar(
      snapshot([
        assessment({id: 'a-accepted', drinkFrom: '2020-01-01', drinkUntil: '2030-12-31'}),
        assessment({
          id: 'a-proposed',
          sourceType: 'personal',
          reviewState: 'proposed',
          assessedAt: '2024-01-01',
          drinkFrom: '2021-01-01',
          drinkUntil: '2022-12-31',
        }),
      ]),
    )
    const window = resolvedWindow(cellar, 'w', NOW)
    assert.equal(window?.assessmentId, 'a-accepted')
    assert.equal(window?.visibleCount, 1, 'proposed claims are not counted as visible')
  })

  test('a rejected assessment does not affect the window', () => {
    const cellar = buildCellar(
      snapshot([
        assessment({id: 'a-accepted'}),
        assessment({
          id: 'a-rejected',
          sourceType: 'personal',
          reviewState: 'rejected',
          assessedAt: '2024-01-01',
        }),
      ]),
    )
    assert.equal(resolvedWindow(cellar, 'w', NOW)?.assessmentId, 'a-accepted')
  })

  test('a wine whose only assessments are proposed resolves null, so its bottles read UNASSESSED', () => {
    const cellar = buildCellar(snapshot([assessment({id: 'a-proposed', reviewState: 'proposed'})]))
    assert.equal(resolvedWindow(cellar, 'w', NOW), null)
    assert.equal(bottleState(cellar, 'b', NOW).state, 'UNASSESSED')
  })
})

describe('authority beats recency', () => {
  test('an older personal claim beats a newer critic claim', () => {
    const cellar = buildCellar(
      snapshot([
        assessment({id: 'a-personal', sourceType: 'personal', assessedAt: '2019-01-01'}),
        assessment({id: 'a-critic', sourceType: 'critic', assessedAt: '2026-01-01'}),
      ]),
    )
    const window = resolvedWindow(cellar, 'w', NOW)
    assert.equal(window?.assessmentId, 'a-personal')
    assert.equal(window?.visibleCount, 2, 'the losing claim still counts as visible')
  })

  test('the full tier order holds', () => {
    const tiers = ['personal', 'producer', 'critic', 'merchant', 'other'] as const
    for (let i = 0; i < tiers.length; i++) {
      const cellar = buildCellar(
        snapshot(
          tiers.slice(i).map((tier, offset) =>
            assessment({
              id: `a-${tier}`,
              sourceType: tier,
              // Later tiers get later dates, so recency would pick the wrong one.
              assessedAt: `202${offset}-01-01`,
            }),
          ),
        ),
      )
      assert.equal(
        resolvedWindow(cellar, 'w', NOW)?.assessmentId,
        `a-${tiers[i]}`,
        `highest available tier should be ${tiers[i]}`,
      )
    }
  })

  test('within a tier the most recent assessedAt wins', () => {
    const cellar = buildCellar(
      snapshot([
        assessment({id: 'a-old', sourceType: 'personal', assessedAt: '2021-01-01'}),
        assessment({id: 'a-new', sourceType: 'personal', assessedAt: '2023-01-01'}),
      ]),
    )
    assert.equal(resolvedWindow(cellar, 'w', NOW)?.assessmentId, 'a-new')
  })
})

describe('tie-break chain', () => {
  test('equal assessedAt falls through to _createdAt descending', () => {
    const cellar = buildCellar(
      snapshot([
        assessment({id: 'a-first', assessedAt: '2022-01-01', createdAt: '2022-01-01T09:00:00Z'}),
        assessment({id: 'a-second', assessedAt: '2022-01-01', createdAt: '2022-01-01T17:00:00Z'}),
      ]),
    )
    assert.equal(resolvedWindow(cellar, 'w', NOW)?.assessmentId, 'a-second')
  })

  test('equal assessedAt and _createdAt falls through to _id descending', () => {
    // This is the case the seed import creates: a bulk import stamps every
    // document with the same _createdAt, so _id is the only key left.
    const shared = '2026-09-21T22:26:40Z'
    const cellar = buildCellar(
      snapshot([
        assessment({id: 'assess-aaa', assessedAt: '2022-01-01', createdAt: shared}),
        assessment({id: 'assess-zzz', assessedAt: '2022-01-01', createdAt: shared}),
      ]),
    )
    assert.equal(resolvedWindow(cellar, 'w', NOW)?.assessmentId, 'assess-zzz')
  })

  test('the ordering is stable regardless of input order', () => {
    const shared = '2026-09-21T22:26:40Z'
    const a = assessment({id: 'assess-aaa', assessedAt: '2022-01-01', createdAt: shared})
    const z = assessment({id: 'assess-zzz', assessedAt: '2022-01-01', createdAt: shared})
    assert.equal(
      resolvedWindow(buildCellar(snapshot([a, z])), 'w', NOW)?.assessmentId,
      resolvedWindow(buildCellar(snapshot([z, a])), 'w', NOW)?.assessmentId,
    )
  })
})

describe('inclusive date boundaries', () => {
  test('an event dated on day T has happened as of T', () => {
    // The claim and its window both predate the acquisition, so the only
    // boundary under test is the acquisition itself.
    const cellar = buildCellar(
      snapshot([assessment({id: 'a', assessedAt: '2010-01-01', drinkFrom: '2010-01-01'})]),
    )
    assert.equal(bottleState(cellar, 'b', '2018-12-31').state, 'NOT_YET_OWNED')
    assert.equal(bottleState(cellar, 'b', '2019-01-01').state, 'DRINKING')
  })

  test('an assessment is visible on its assessedAt, not the day after', () => {
    const cellar = buildCellar(snapshot([assessment({id: 'a', assessedAt: '2022-06-15'})]))
    assert.equal(resolvedWindow(cellar, 'w', '2022-06-14'), null)
    assert.ok(resolvedWindow(cellar, 'w', '2022-06-15'))
  })

  test('a bottle is DRINKING through drinkUntil and PAST_WINDOW the next day', () => {
    const cellar = buildCellar(
      snapshot([
        assessment({
          id: 'a',
          assessedAt: '2010-01-01',
          drinkFrom: '2020-01-01',
          drinkUntil: '2024-12-31',
        }),
      ]),
    )
    assert.equal(bottleState(cellar, 'b', '2019-12-31').state, 'HOLD')
    assert.equal(bottleState(cellar, 'b', '2020-01-01').state, 'DRINKING')
    assert.equal(bottleState(cellar, 'b', '2024-12-31').state, 'DRINKING')
    assert.equal(bottleState(cellar, 'b', '2025-01-01').state, 'PAST_WINDOW')
  })
})

describe('consumedAt truncates to its UTC calendar date', () => {
  test('noon UTC keeps the day', () => {
    assert.equal(toUtcDate('2024-02-20T12:00:00Z'), '2024-02-20')
  })

  test('an offset timestamp is converted, not sliced', () => {
    // 21:00 Pacific is the following day in UTC. Known limitation, recorded
    // in docs/temporal-resolution.md.
    assert.equal(toUtcDate('2025-09-06T21:00:00-07:00'), '2025-09-07')
  })

  test('a bare date passes through', () => {
    assert.equal(toUtcDate('2023-03-15'), '2023-03-15')
  })
})

describe('window year normalization', () => {
  test('a year as drinkFrom opens on January 1', () => {
    assert.equal(normalizeWindowBound(2024, 'from'), '2024-01-01')
    assert.equal(normalizeWindowBound('2024', 'from'), '2024-01-01')
  })

  test('a year as drinkUntil closes on December 31', () => {
    assert.equal(normalizeWindowBound(2024, 'until'), '2024-12-31')
  })

  test('an already-normalized date is left alone', () => {
    assert.equal(normalizeWindowBound('2024-05-06', 'from'), '2024-05-06')
    assert.equal(normalizeWindowBound('2024-05-06', 'until'), '2024-05-06')
  })
})

describe('verdict resolves as of the moment of drinking', () => {
  const claims = [
    assessment({
      id: 'a-producer',
      sourceType: 'producer',
      assessedAt: '2021-01-01',
      drinkFrom: '2022-01-01',
      drinkUntil: '2028-12-31',
    }),
    assessment({
      id: 'a-personal-later',
      sourceType: 'personal',
      assessedAt: '2025-01-01',
      drinkFrom: '2022-01-01',
      drinkUntil: '2023-12-31',
    }),
  ]
  const cellar = buildCellar(
    snapshot(claims, {
      consumptions: [{id: 'con-b', bottleId: 'b', consumedAt: '2024-06-01T12:00:00Z'}],
    }),
  )

  test('a claim written after the opening cannot change that verdict', () => {
    const result = consumptionVerdict(cellar, 'b')
    assert.equal(result?.verdict, 'IN_WINDOW')
    assert.equal(result?.windowAtConsumption?.assessmentId, 'a-producer')
  })

  test('verdictDrift reports what a later claim would have said', () => {
    const drift = verdictDrift(cellar, 'b', NOW)
    assert.equal(drift?.verdict, 'IN_WINDOW')
    assert.equal(drift?.verdictNow, 'LATE')
    assert.equal(drift?.windowNow?.assessmentId, 'a-personal-later')
    assert.equal(drift?.changed, true)
  })

  test('an unopened bottle has no verdict', () => {
    const unopened = buildCellar(snapshot([assessment({id: 'a'})]))
    assert.equal(consumptionVerdict(unopened, 'b'), null)
    assert.equal(verdictDrift(unopened, 'b', NOW), null)
  })

  test('a wine with no visible claim gives UNKNOWN', () => {
    const cellar = buildCellar(
      snapshot([], {
        consumptions: [{id: 'con-b', bottleId: 'b', consumedAt: '2024-06-01T12:00:00Z'}],
      }),
    )
    assert.equal(consumptionVerdict(cellar, 'b')?.verdict, 'UNKNOWN')
  })
})

describe('missed opportunities use exact state-change boundaries', () => {
  // The case that makes assessedAt a required boundary.
  //
  // The bottle is on HOLD under a producer window of 2030-2035 for most of
  // 2024. On 2024-06-15 a personal claim of 2024-01-01 to 2024-06-30 becomes
  // visible and outranks it, so the bottle is DRINKING. On 2024-07-01 a second
  // personal claim of 2020-2023 supersedes it and the bottle is past window.
  //
  // The only DRINKING interval in the whole year is 2024-06-15 to 2024-06-30,
  // and it begins at an assessedAt. A boundary set built only from window
  // bounds and acquisition dates — which is what the spec originally
  // specified — finds nothing here and reports no missed opportunity.
  const cellar = buildCellar(
    snapshot([
      assessment({
        id: 'a-producer',
        sourceType: 'producer',
        assessedAt: '2020-01-01',
        drinkFrom: '2030-01-01',
        drinkUntil: '2035-12-31',
      }),
      assessment({
        id: 'a-personal-open',
        sourceType: 'personal',
        assessedAt: '2024-06-15',
        drinkFrom: '2024-01-01',
        drinkUntil: '2024-06-30',
      }),
      assessment({
        id: 'a-personal-close',
        sourceType: 'personal',
        assessedAt: '2024-07-01',
        drinkFrom: '2020-01-01',
        drinkUntil: '2023-12-31',
      }),
    ]),
  )
  const period = {start: '2024-01-01', end: '2024-12-31'}

  test('the interval opened by an assessedAt is found exactly', () => {
    assert.deepEqual(drinkingIntervals(cellar, 'b', period), [
      {from: '2024-06-15', until: '2024-06-30'},
    ])
  })

  test('the bottle is reported as a missed opportunity', () => {
    const missed = missedOpportunities(cellar, period, NOW)
    assert.equal(missed.length, 1)
    assert.equal(missed[0]?.bottleId, 'b')
    assert.deepEqual(missed[0]?.peakIntervals, [{from: '2024-06-15', until: '2024-06-30'}])
  })

  /**
   * The `minus opened(period)` clause, isolated.
   *
   * The spec defines the regret set as three independent conditions: peaked in
   * the period, minus opened in the period, restricted to past window now. For
   * any period ending at or before `now` the middle one never fires — a bottle
   * opened inside such a period reads CONSUMED at `now`, and CONSUMED is not
   * PAST_WINDOW, so the third condition has already excluded it. That is the
   * session 7 finding, and the test below records it.
   *
   * The clause is live in exactly one situation: a period that extends past
   * the `now` being asked about. This fixture is that situation, built
   * entirely from dates in the past so that nothing here is data the content
   * model forbids. `now` is a parameter, not the clock; asking "as of June
   * 2024, what had I missed that year?" is an ordinary call.
   *
   *   2024-01-01  period opens. Producer 2020-2023 resolves, so PAST_WINDOW.
   *   2024-06-01  the `now` being asked about. Still PAST_WINDOW, and the
   *               bottle has not been opened yet, so the state gate lets it
   *               through.
   *   2024-08-01  a personal claim of 2020-2030 becomes visible and outranks
   *               the producer. DRINKING — the bottle peaks inside the period.
   *   2024-10-01  opened, inside the period and after `now`.
   *
   * Every other condition is satisfied, so the clause is the only thing that
   * can exclude it. Delete the clause and this test fails, which is the
   * property the previous fixture did not have.
   */
  test('the opened-in-period clause excludes a bottle when the period runs past now', () => {
    const localNow = '2024-06-01'
    const openedLate = buildCellar(
      snapshot(
        [
          assessment({
            id: 'a-producer',
            sourceType: 'producer',
            assessedAt: '2020-01-01',
            drinkFrom: '2020-01-01',
            drinkUntil: '2023-12-31',
          }),
          assessment({
            id: 'a-personal',
            sourceType: 'personal',
            assessedAt: '2024-08-01',
            drinkFrom: '2020-01-01',
            drinkUntil: '2030-12-31',
          }),
        ],
        {consumptions: [{id: 'con-b', bottleId: 'b', consumedAt: '2024-10-01T12:00:00Z'}]},
      ),
    )

    // The three conditions the clause is not responsible for, stated rather
    // than assumed. If any of these drifts the test stops isolating anything.
    assert.equal(bottleState(openedLate, 'b', localNow).state, 'PAST_WINDOW', 'state at now')
    assert.deepEqual(
      drinkingIntervals(openedLate, 'b', period),
      [{from: '2024-08-01', until: '2024-09-30'}],
      'peaked inside the period',
    )
    assert.ok(period.start <= '2024-10-01' && '2024-10-01' <= period.end, 'opened in the period')

    assert.deepEqual(missedOpportunities(openedLate, period, localNow), [])
  })

  /**
   * The ordinary case, asserting what is actually true about it.
   *
   * This is the fixture the suite had, and its assertion held for a reason its
   * name did not describe: with `now` after the period, the bottle reads
   * CONSUMED and the state gate excludes it before the opened-in-period clause
   * is consulted. Deleting the clause left the old test green.
   *
   * So the state is named here instead of left implicit. What this records is
   * that for every period the views can actually ask about — they all end at
   * or before `now` — exclusion comes from the state machine, and the spec's
   * second condition is a restatement of its third. See "A spec that states
   * three conditions where the data has two" in docs/friction-logs/session7.md.
   */
  test('for a period ending before now, the state gate is what excludes an opened bottle', () => {
    const opened = buildCellar(
      snapshot(
        [
          assessment({
            id: 'a',
            drinkFrom: '2024-01-01',
            drinkUntil: '2024-12-31',
            assessedAt: '2020-01-01',
          }),
        ],
        {consumptions: [{id: 'con-b', bottleId: 'b', consumedAt: '2024-05-01T12:00:00Z'}]},
      ),
    )
    assert.equal(
      bottleState(opened, 'b', NOW).state,
      'CONSUMED',
      'not PAST_WINDOW, so the gate bites',
    )
    assert.deepEqual(missedOpportunities(opened, period, NOW), [])
  })

  test('a bottle not past window now is not a missed opportunity', () => {
    const stillGood = buildCellar(
      snapshot([assessment({id: 'a', drinkFrom: '2024-01-01', drinkUntil: '2040-12-31'})]),
    )
    assert.deepEqual(missedOpportunities(stillGood, period, NOW), [])
  })

  test('a one-day window inside the period is still found', () => {
    // Monthly sampling misses this with overwhelming probability.
    const fleeting = buildCellar(
      snapshot([
        assessment({
          id: 'a',
          assessedAt: '2020-01-01',
          drinkFrom: '2024-07-04',
          drinkUntil: '2024-07-04',
        }),
      ]),
    )
    assert.deepEqual(drinkingIntervals(fleeting, 'b', period), [
      {from: '2024-07-04', until: '2024-07-04'},
    ])
    assert.equal(missedOpportunities(fleeting, period, NOW).length, 1)
  })
})

describe('cross-document violations are exposed, not thrown', () => {
  test('a duplicate acquisition is recorded and the earliest wins', () => {
    const cellar = buildCellar(
      snapshot([assessment({id: 'a'})], {
        acquisitions: [
          {id: 'acq-late', bottleId: 'b', acquiredAt: '2021-01-01'},
          {id: 'acq-early', bottleId: 'b', acquiredAt: '2019-01-01'},
        ],
      }),
    )
    assert.equal(cellar.acquisitionByBottle.get('b')?.id, 'acq-early')
    assert.ok(cellar.violations.some((v) => v.kind === 'DUPLICATE_ACQUISITION'))
  })

  test('a duplicate consumption is recorded and the earliest wins', () => {
    const cellar = buildCellar(
      snapshot([assessment({id: 'a'})], {
        consumptions: [
          {id: 'con-late', bottleId: 'b', consumedAt: '2024-06-01T12:00:00Z'},
          {id: 'con-early', bottleId: 'b', consumedAt: '2023-06-01T12:00:00Z'},
        ],
      }),
    )
    assert.equal(cellar.consumptionByBottle.get('b')?.id, 'con-early')
    assert.ok(cellar.violations.some((v) => v.kind === 'DUPLICATE_CONSUMPTION'))
  })

  test('a consumption predating its acquisition is flagged, not interpreted', () => {
    const cellar = buildCellar(
      snapshot([assessment({id: 'a'})], {
        consumptions: [{id: 'con-b', bottleId: 'b', consumedAt: '2018-06-01T12:00:00Z'}],
      }),
    )
    assert.ok(cellar.violations.some((v) => v.kind === 'CONSUMPTION_BEFORE_ACQUISITION'))
  })

  test('a bottle with no acquisition is flagged and excluded from every view', () => {
    const cellar = buildCellar(snapshot([assessment({id: 'a'})], {acquisitions: []}))
    assert.ok(cellar.violations.some((v) => v.kind === 'BOTTLE_WITHOUT_ACQUISITION'))
    assert.equal(bottleState(cellar, 'b', NOW).state, 'NOT_YET_OWNED')
  })

  test('the seed dataset has no violations', async () => {
    const {loadCellarFromNdjson} = await import('./helpers/fixture.mts')
    assert.deepEqual(loadCellarFromNdjson().violations, [])
  })
})

describe('display bucket and wine names', () => {
  test('DRINK_SOON is a bucket over DRINKING, not a state', () => {
    const cellar = buildCellar(
      snapshot([assessment({id: 'a', drinkFrom: '2020-01-01', drinkUntil: '2027-01-31'})]),
    )
    const result = bottleState(cellar, 'b', NOW)
    assert.equal(result.state, 'DRINKING')
    assert.equal(isDrinkSoon(result, NOW), true)
    assert.equal(isDrinkSoon(result, NOW, 3), false)
  })

  /**
   * The window has to close *inside* the horizon for this to test anything.
   *
   * It first used 2030–2031, which is HOLD at `NOW` and also more than twelve
   * months from closing — so it returned false for two reasons and isolated
   * neither. Deleting the state guard from `isDrinkSoon` left it green, which
   * means it proved only that a far-future window is not imminent, something
   * nothing disputes.
   *
   * 2026-11-01 to 2026-12-31 at a `NOW` of 2026-09-18 is HOLD, because the
   * window has not opened, and closes well within the twelve-month horizon.
   * The date arithmetic alone says drink-soon; only the state check says no.
   */
  test('a HOLD bottle is never drink-soon, even when its window closes inside the horizon', () => {
    const cellar = buildCellar(
      snapshot([assessment({id: 'a', drinkFrom: '2026-11-01', drinkUntil: '2026-12-31'})]),
    )
    const result = bottleState(cellar, 'b', NOW)
    assert.equal(result.state, 'HOLD', 'fixture no longer produces HOLD')
    assert.ok(
      result.window!.drinkUntil <= addMonths(NOW, 12),
      'fixture no longer closes inside the horizon, so the state guard is not what is under test',
    )
    assert.equal(isDrinkSoon(result, NOW), false)
  })

  test('wineDisplayName prefers an explicit title', () => {
    assert.equal(
      wineDisplayName({title: '2018 Cristom Louise Vineyard', vintageYear: 2018}),
      '2018 Cristom Louise Vineyard',
    )
  })

  test('wineDisplayName composes vintage, producer, cuvee', () => {
    assert.equal(
      wineDisplayName({vintageYear: 2018, producerName: 'Cristom', cuvee: 'Louise Vineyard'}),
      '2018 Cristom Louise Vineyard',
    )
  })

  test('wineDisplayName skips missing parts rather than leaving gaps', () => {
    assert.equal(wineDisplayName({vintageYear: 2018, cuvee: 'Reserve'}), '2018 Reserve')
    assert.equal(wineDisplayName({}), 'Untitled wine')
  })
})
