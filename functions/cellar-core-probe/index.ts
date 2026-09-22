/**
 * Bundling probe. Not production code.
 *
 * One question only: does a Sanity Function deployed from this repo — npm
 * workspaces plus TypeScript, a combination the Functions bundling docs do not
 * cover — ship `@cellar/core` in its bundle and run it correctly?
 *
 * The snapshot below is hardcoded and the expected answer was written down
 * before deployment. Nothing here reads a document, queries a dataset, writes,
 * or reaches the network. The triggering document is ignored entirely; it
 * exists only to cause an invocation.
 */
import {documentEventHandler} from '@sanity/functions'
import {buildCellar, bottleState, type CellarSnapshot} from '@cellar/core'

/**
 * Six records chosen so that a right answer can only come from real domain
 * logic:
 *
 * - `assess-critic` is two years newer than `assess-personal`. Resolving by
 *   recency before authority would return the 2030–2035 window and read HOLD.
 * - `assess-personal-proposed` is both the newest claim and the highest tier.
 *   Ignoring `reviewState` would return the 2040–2045 window, read HOLD, and
 *   report a visibleCount of 3.
 * - At 2026-09-18 the surviving window is open, so the bottle reads DRINKING.
 */
const SNAPSHOT: CellarSnapshot = {
  wines: [{id: 'wine-probe', producerName: 'Probe', cuvee: 'Probe', vintageYear: 2015}],
  bottles: [{id: 'bottle-probe', wineId: 'wine-probe'}],
  acquisitions: [{id: 'acq-probe', bottleId: 'bottle-probe', acquiredAt: '2020-01-01'}],
  consumptions: [],
  assessments: [
    {
      id: 'assess-critic',
      wineId: 'wine-probe',
      sourceType: 'critic',
      sourceName: 'Critic',
      assessedAt: '2024-01-01',
      drinkFrom: '2030-01-01',
      drinkUntil: '2035-12-31',
      reviewState: 'accepted',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'assess-personal',
      wineId: 'wine-probe',
      sourceType: 'personal',
      sourceName: 'Cellar owner',
      assessedAt: '2023-01-01',
      drinkFrom: '2024-01-01',
      drinkUntil: '2027-12-31',
      reviewState: 'accepted',
      createdAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 'assess-personal-proposed',
      wineId: 'wine-probe',
      sourceType: 'personal',
      sourceName: 'Agent',
      assessedAt: '2026-01-01',
      drinkFrom: '2040-01-01',
      drinkUntil: '2045-12-31',
      reviewState: 'proposed',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
}

/** The Stage 2 oracle's `now`. Passed in, never read from the clock. */
const AS_OF = '2026-09-18'

export const handler = documentEventHandler(async () => {
  const cellar = buildCellar(SNAPSHOT)
  const result = bottleState(cellar, 'bottle-probe', AS_OF)

  console.log(
    'CELLAR_PROBE ' +
      JSON.stringify({
        state: result.state,
        sourceType: result.window?.sourceType ?? null,
        assessmentId: result.window?.assessmentId ?? null,
        drinkFrom: result.window?.drinkFrom ?? null,
        drinkUntil: result.window?.drinkUntil ?? null,
        visibleCount: result.window?.visibleCount ?? null,
      }),
  )
})
