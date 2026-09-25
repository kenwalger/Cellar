/**
 * The public build, checked against the oracle over the wire.
 *
 * **Not part of `npm test`.** The filename ends `.live.mts`, which the default
 * glob (`*.test.mts`) does not match, because this one needs the network and
 * the production dataset. Run it with `npm run test:live --workspace cellar-app`.
 *
 * What it is for. The public build swaps the App SDK for `@sanity/client`, and
 * the claim that justifies doing so is that only the transport changed — the
 * same `CELLAR_QUERY`, the same `toCellarSnapshot`, the same `buildCellar`,
 * and therefore the same numbers. That claim is checkable without a browser,
 * which is the whole reason this file exists: the counts below are the five
 * verification dates from `drinkSoonRows.test.mts`, which asserts them against
 * the offline NDJSON fixture. Here the identical table is asserted against a
 * cellar fetched live. If both pass, the public transport delivers the cellar
 * the oracle describes.
 *
 * It imports `fetchCellar` from `src/publicClient.ts` rather than building an
 * equivalent client, so it exercises the transport that actually ships. A test
 * that configured its own client would verify something nobody deploys.
 */

import assert from 'node:assert/strict'
import {before, describe, it} from 'node:test'
import type {Cellar} from '@cellar/core'
import {fetchCellar} from '../src/publicClient.ts'
import {API_VERSION, DATASET, PROJECT_ID, PUBLIC_ORIGIN} from '../src/sanity.ts'
import {summarizeDrinkSoon} from '../src/drinkSoonRows.ts'

/**
 * The table from `drinkSoonRows.test.mts`, unchanged.
 *
 * Copied deliberately rather than imported. The offline test owns it as an
 * expectation agreed before the view existed; repeating the literals here
 * means a change to one file cannot quietly move the other's goalposts, which
 * is the entire value of having two independent checks of the same numbers.
 */
const EXPECTED = [
  {asOf: '1999-06-01', soon: 0, wines: 0, drinking: 4, inCellar: 4, nearest: '2012-12-31'},
  {asOf: '2019-12-31', soon: 0, wines: 0, drinking: 39, inCellar: 124, nearest: '2026-12-31'},
  {asOf: '2023-03-15', soon: 0, wines: 0, drinking: 122, inCellar: 198, nearest: '2024-12-31'},
  {asOf: '2025-06-01', soon: 10, wines: 4, drinking: 147, inCellar: 226, nearest: '2025-12-31'},
  {asOf: '2026-09-18', soon: 23, wines: 12, drinking: 166, inCellar: 248, nearest: '2026-12-31'},
]

describe('the public build reads the dataset a browser would', () => {
  /**
   * The check that cannot be done with the client, because Node does not
   * enforce CORS and `@sanity/client` sends no `Origin` header from Node.
   *
   * A public dataset is exempt from authentication but not from origin
   * checking, and the two are configured in different places: the dataset ACL
   * and the project's CORS allowlist. Before the allowlist entry existed this
   * request returned 403 `CORS Origin not allowed` while every curl query in
   * the project returned 200 — because curl sends no `Origin` either. So this
   * assertion covers the one failure mode that no other test in the
   * repository can see, and it fails if the allowlist entry is ever removed.
   */
  it(`serves ${PUBLIC_ORIGIN}, the origin the build is published from`, async () => {
    const url =
      `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
      `?query=${encodeURIComponent('count(*)')}`

    const response = await fetch(url, {headers: {Origin: PUBLIC_ORIGIN}})

    assert.equal(
      response.status,
      200,
      `${PUBLIC_ORIGIN} is not on the project's CORS allowlist, so the published ` +
        `page cannot read the dataset. Re-add it with: ` +
        `npx sanity cors add ${PUBLIC_ORIGIN} --no-credentials`,
    )
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      PUBLIC_ORIGIN,
      'the API answered but did not authorise the origin, so a browser would still refuse it',
    )
  })

  /**
   * The entry is deliberately credential-less. If it ever gains credentials
   * the published page could be used to ride a signed-in visitor's session,
   * which a read-only demo has no reason to be able to do.
   */
  it('does not allow credentials from that origin', async () => {
    const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent('count(*)')}`
    const response = await fetch(url, {headers: {Origin: PUBLIC_ORIGIN}})

    assert.equal(
      response.headers.get('access-control-allow-credentials'),
      null,
      'the public origin allows credentials; it was added with --no-credentials',
    )
  })
})

describe('the live cellar matches the oracle at the five verification dates', () => {
  let cellar: Cellar

  before(async () => {
    assert.equal(
      DATASET,
      'production',
      `DATASET is "${DATASET}". This check only means something against the public ` +
        `dataset, and a build published with this literal pointing elsewhere would be ` +
        `a permanent public demo of the wrong cellar.`,
    )
    cellar = await fetchCellar()
  })

  it('fetched the whole ledger', () => {
    assert.equal(cellar.bottles.size, 542, 'bottles')
    assert.equal(cellar.wines.size, 98, 'wines')
  })

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
   * The same partition check the offline suite makes. Cheap, and it fails
   * loudly if the fetched shape ever drops a bottle into no bucket at all —
   * which is the shape a transport bug would take, rather than a wrong total.
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
