/**
 * THE WORKFLOW CLAIM, checked against the whole dataset.
 *
 * ADR 0011 says only accepted assessments resolve. Every view in the App
 * depends on it: a claim sitting in the review queue must not move a single
 * count until a person accepts it. `rules.test.mts` covers the rule on a
 * synthetic one-bottle fixture; this covers it where it actually has to hold,
 * across all 542 bottles of the seed dataset, with a claim chosen so that
 * accepting it demonstrably *does* move things.
 *
 * The shape of the test is the argument. Adding a proposed assessment must
 * change nothing — not one of 542 states, not one window, not one verdict.
 * Flipping that same document to accepted must change exactly the bottles of
 * its own wine and no others. A rule that only says "proposed changes nothing"
 * could be satisfied by a filter that drops everything; the second half is
 * what makes the first half mean something.
 *
 * `CELLAR_QUERY` carries no `reviewState` filter by design, so a proposed
 * claim genuinely arrives in the App and is genuinely discarded by
 * `buildCellar`. This tests the path the App takes, not a shortcut past it.
 */

import assert from 'node:assert/strict'
import {describe, test} from 'node:test'
import {
  bottleState,
  buildCellar,
  consumptionVerdict,
  resolvedWindow,
  type AssessmentInput,
  type BottleState,
  type CellarSnapshot,
  type ReviewState,
} from '../dist/index.js'
import {loadCellarFromNdjson, ORACLE_NOW} from './helpers/fixture.mts'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {SAMPLE_DATA} from './helpers/fixture.mts'

/**
 * The wine the proposed claim is about.
 *
 * Chosen because the oracle already pins its behaviour: it is the wine whose
 * `assessedAt` boundary the Stage 2 spec error was found on, it has bottles in
 * the cellar at `ORACLE_NOW`, and it carries accepted claims at two authority
 * tiers, so a new personal claim has something to outrank.
 */
const TARGET_WINE = 'paradis-vineyards-estate-marechal-foch-2021'

/**
 * A window deliberately unlike anything already resolving for this wine, so
 * that accepting it cannot coincidentally agree with the claim it replaces.
 *
 * `assessedAt` has to be the most recent personal claim, not merely a personal
 * one. The wine already carries personal 2024-02-21 (2023–2024) and producer
 * 2022-04-08 (2023–2027); the first draft of this fixture dated the proposal
 * 2019 and it lost — authority picks the tier, recency picks within it, so a
 * top-tier claim from seven years ago beats nothing. That is the rule working,
 * and it is also what a freshly extracted claim looks like: today's reading of
 * a note wins because it is today's.
 */
const PROPOSED: Omit<AssessmentInput, 'reviewState'> = {
  id: 'assess-test-proposed',
  wineId: TARGET_WINE,
  sourceType: 'personal',
  sourceName: 'me',
  assessedAt: '2026-09-01',
  drinkFrom: '2019-01-01',
  drinkUntil: '2040-12-31',
  createdAt: '2026-09-01T00:00:00Z',
}

/**
 * Rebuilds the cellar from the seed NDJSON with one extra assessment.
 *
 * Goes through `buildCellar` rather than mutating an existing `Cellar`,
 * because the indexes are built once and a mutated map would not exercise the
 * filter that does the real work.
 */
function cellarWith(reviewState: ReviewState | null) {
  const docs = readFileSync(join(SAMPLE_DATA, 'cellar.ndjson'), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Record<string, unknown> & {_id: string; _type: string})

  const producerNames = new Map<string, string>()
  for (const doc of docs) {
    if (doc._type === 'producer' && typeof doc.name === 'string') {
      producerNames.set(doc._id, doc.name)
    }
  }
  const ref = (value: unknown): string =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as {_ref?: unknown})._ref === 'string'
      ? (value as {_ref: string})._ref
      : ''

  const of = (type: string) => docs.filter((doc) => doc._type === type)

  const assessments: AssessmentInput[] = of('assessment').map((doc) => ({
    id: doc._id,
    wineId: ref(doc.wine),
    sourceType: doc.sourceType as AssessmentInput['sourceType'],
    sourceName: String(doc.sourceName ?? ''),
    assessedAt: String(doc.assessedAt),
    drinkFrom: String(doc.drinkFrom),
    drinkUntil: String(doc.drinkUntil),
    reviewState: doc.reviewState as ReviewState,
    createdAt: String(doc._createdAt ?? ''),
  }))

  if (reviewState !== null) assessments.push({...PROPOSED, reviewState})

  const snapshot: CellarSnapshot = {
    wines: of('wine').map((doc) => ({
      id: doc._id,
      title: (doc.title as string) ?? null,
      cuvee: (doc.cuvee as string) ?? null,
      vintageYear: (doc.vintageYear as number) ?? null,
      appellation: (doc.appellation as string) ?? null,
      producerName: producerNames.get(ref(doc.producer)) ?? null,
    })),
    bottles: of('bottle').map((doc) => ({id: doc._id, wineId: ref(doc.wine)})),
    acquisitions: of('acquisition').map((doc) => ({
      id: doc._id,
      bottleId: ref(doc.bottle),
      acquiredAt: String(doc.acquiredAt),
    })),
    consumptions: of('consumption').map((doc) => ({
      id: doc._id,
      bottleId: ref(doc.bottle),
      consumedAt: String(doc.consumedAt),
    })),
    assessments,
  }

  return buildCellar(snapshot)
}

/** Every bottle's state and resolved window, as one comparable string per bottle. */
function fingerprint(cellar: ReturnType<typeof buildCellar>, asOf: string): Map<string, string> {
  const states = new Map<string, string>()
  for (const bottleId of cellar.bottles.keys()) {
    const {state, window} = bottleState(cellar, bottleId, asOf)
    states.set(
      bottleId,
      `${state}|${window ? `${window.drinkFrom}..${window.drinkUntil}|${window.sourceType}|${window.assessmentId}` : 'none'}`,
    )
  }
  return states
}

function diff(before: Map<string, string>, after: Map<string, string>): string[] {
  const changed: string[] = []
  for (const [bottleId, value] of before) {
    if (after.get(bottleId) !== value) changed.push(bottleId)
  }
  return changed.sort()
}

const baseline = cellarWith(null)
const withProposed = cellarWith('proposed')
const withRejected = cellarWith('rejected')
const withAccepted = cellarWith('accepted')

/** The dates the rest of the suite already uses, plus one inside the new window. */
const DATES = ['1999-06-01', '2019-12-31', '2023-03-15', '2025-06-01', ORACLE_NOW, '2035-01-01']

describe('a proposed assessment moves nothing', () => {
  test('the seed data contains no proposed or rejected claims to begin with', () => {
    // If this ever fails the baseline is not a baseline, and every assertion
    // below is measuring against something that already moved.
    const states = new Set<ReviewState>()
    for (const list of baseline.acceptedByWine.values()) {
      for (const record of list) states.add(record.reviewState)
    }
    assert.deepEqual([...states], ['accepted'], 'indexed claims should all be accepted')
  })

  test('the proposed claim is indexed out, not merely outranked', () => {
    // A filter that worked by tier rather than by review state would still
    // produce identical states here, because personal outranks producer only
    // when it is visible at all. Checking the index directly rules that out.
    const accepted = withProposed.acceptedByWine.get(TARGET_WINE) ?? []
    assert.ok(
      !accepted.some((record) => record.id === PROPOSED.id),
      'a proposed claim reached the resolution index',
    )
    assert.equal(
      accepted.length,
      (baseline.acceptedByWine.get(TARGET_WINE) ?? []).length,
      'the wine gained a resolvable claim',
    )
  })

  for (const asOf of DATES) {
    test(`all 542 bottle states are identical at ${asOf}`, () => {
      const changed = diff(fingerprint(baseline, asOf), fingerprint(withProposed, asOf))
      assert.deepEqual(changed, [], `${asOf}: a proposed claim moved ${changed.length} bottles`)
    })
  }

  test('no resolved window anywhere in the dataset changes', () => {
    for (const wineId of baseline.wines.keys()) {
      const before = resolvedWindow(baseline, wineId, ORACLE_NOW)
      const after = resolvedWindow(withProposed, wineId, ORACLE_NOW)
      assert.equal(after?.assessmentId ?? null, before?.assessmentId ?? null, wineId)
      assert.equal(after?.visibleCount ?? 0, before?.visibleCount ?? 0, `${wineId}: visible count`)
    }
  })

  test('no verdict on any of the 294 consumptions changes', () => {
    for (const bottleId of baseline.consumptionByBottle.keys()) {
      const before = consumptionVerdict(baseline, bottleId)
      const after = consumptionVerdict(withProposed, bottleId)
      assert.equal(after?.verdict, before?.verdict, bottleId)
      assert.equal(
        after?.windowAtConsumption?.assessmentId ?? null,
        before?.windowAtConsumption?.assessmentId ?? null,
        `${bottleId}: window at consumption`,
      )
    }
  })

  test('a rejected claim is equally inert', () => {
    for (const asOf of DATES) {
      const changed = diff(fingerprint(baseline, asOf), fingerprint(withRejected, asOf))
      assert.deepEqual(changed, [], `${asOf}: a rejected claim moved ${changed.length} bottles`)
    }
  })
})

describe('accepting the same claim moves exactly its own wine', () => {
  /** Bottles of the target wine, which are the only ones permitted to change. */
  const targetBottles = [...baseline.bottles.entries()]
    .filter(([, bottle]) => bottle.wineId === TARGET_WINE)
    .map(([bottleId]) => bottleId)
    .sort()

  test('the target wine has bottles to move', () => {
    assert.ok(targetBottles.length > 0, `${TARGET_WINE} has no bottles`)
  })

  test('nothing outside the target wine changes', () => {
    for (const asOf of DATES) {
      const changed = diff(fingerprint(baseline, asOf), fingerprint(withAccepted, asOf))
      const strays = changed.filter((bottleId) => !targetBottles.includes(bottleId))
      assert.deepEqual(strays, [], `${asOf}: accepting one claim moved unrelated bottles`)
    }
  })

  test('the accepted claim wins the window on its own wine', () => {
    const window = resolvedWindow(withAccepted, TARGET_WINE, ORACLE_NOW)
    assert.equal(window?.assessmentId, PROPOSED.id, 'the personal claim did not win')
    assert.equal(window?.drinkFrom, PROPOSED.drinkFrom)
    assert.equal(window?.drinkUntil, PROPOSED.drinkUntil)
  })

  /**
   * The half that makes the other half mean something. If accepting changed
   * nothing either, every assertion above would pass against a resolver that
   * ignores the new document entirely.
   */
  test('accepting actually changes states, so the inertness above is not vacuous', () => {
    const changed = diff(fingerprint(baseline, ORACLE_NOW), fingerprint(withAccepted, ORACLE_NOW))
    assert.ok(changed.length > 0, 'accepting a top-tier claim changed no bottle at all')
    for (const bottleId of changed) {
      assert.ok(targetBottles.includes(bottleId), `${bottleId} is not a bottle of ${TARGET_WINE}`)
    }
  })

  /**
   * The expected table, written from the dataset before the assertion ran.
   *
   * Three bottles of this wine were consumed and three are past window at
   * `ORACLE_NOW` under the personal 2023–2024 claim. The accepted proposal
   * runs to 2040, so the three still in the rack open and the three already
   * drunk stay drunk — a window cannot un-consume a bottle, and that it does
   * not is worth asserting rather than assuming.
   */
  const EXPECTED_AFTER: Record<string, BottleState> = {
    'paradis-vineyards-estate-marechal-foch-2021-a': 'CONSUMED',
    'paradis-vineyards-estate-marechal-foch-2021-b': 'CONSUMED',
    'paradis-vineyards-estate-marechal-foch-2021-c': 'CONSUMED',
    'paradis-vineyards-estate-marechal-foch-2021-d': 'DRINKING',
    'paradis-vineyards-estate-marechal-foch-2021-e': 'DRINKING',
    'paradis-vineyards-estate-marechal-foch-2021-f': 'DRINKING',
  }

  test('the bottles still in the rack open, and the drunk ones stay drunk', () => {
    assert.deepEqual(targetBottles, Object.keys(EXPECTED_AFTER).sort(), 'bottle set')

    const before = fingerprint(baseline, ORACLE_NOW)
    const after = fingerprint(withAccepted, ORACLE_NOW)

    for (const [bottleId, expected] of Object.entries(EXPECTED_AFTER)) {
      assert.equal(
        after.get(bottleId)!.split('|')[0],
        expected,
        `${bottleId}: unexpected state under the accepted window`,
      )
    }

    // And the three that moved are exactly the three that were past window.
    const changed = diff(before, after)
    assert.deepEqual(
      changed,
      Object.entries(EXPECTED_AFTER)
        .filter(([, state]) => state === 'DRINKING')
        .map(([bottleId]) => bottleId)
        .sort(),
      'the wrong bottles moved',
    )
  })
})
