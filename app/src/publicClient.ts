import {createClient} from '@sanity/client'
import {
  buildCellar,
  CELLAR_QUERY,
  toCellarSnapshot,
  type Cellar,
  type RawCellarResult,
} from '@cellar/core'
// `./sanity.ts`, with the extension, because `publicTransport.live.mts` imports
// this module and `node --test` runs it directly — Node's ESM resolver does not
// guess extensions. Vite accepts both. Same rule as `drinkSoonRows.ts`.
import {API_VERSION, DATASET, PROJECT_ID} from './sanity.ts'

/**
 * The public build's transport, in one module so the provider and the live
 * test cannot drift apart.
 *
 * `PublicCellarProvider` calls `fetchCellar()` to render the page, and
 * `test/publicTransport.live.mts` calls the same function to check the counts
 * against the oracle. Sharing the function rather than the settings is the
 * point: a test that rebuilt an equivalent client would verify a transport
 * nobody ships.
 *
 * **No credentials, by construction.** There is no `token` and no
 * `withCredentials` here, and there is nothing secret to omit — the project id
 * and dataset name are already in the repository, and `production` has been
 * world-readable since it was created. What makes a public read work is the
 * dataset ACL; what makes it work *from a browser* is the CORS allowlist,
 * which is a separate mechanism and a separate failure.
 */
export const publicClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  // The CDN is the right default for a read-only demo: cached, cheaper, and
  // the ledger it serves has not changed since the import.
  useCdn: true,
  // Explicit for the same reason the App SDK surface sets it: an unpublished
  // draft assessment must not change what the cellar says before anyone
  // published it.
  perspective: 'published',
})

/**
 * One fetch, one index, the same pipeline the App SDK surface runs.
 *
 * Returned rather than awaited at module scope so nothing fires on import —
 * the promise is created on first render and reused, which is what lets
 * `PublicCellarProvider` suspend on it without re-fetching on every re-render.
 */
let pending: Promise<Cellar> | null = null

export function fetchCellar(): Promise<Cellar> {
  pending ??= publicClient
    .fetch<RawCellarResult>(CELLAR_QUERY)
    .then((data) => buildCellar(toCellarSnapshot(data ?? {})))
  return pending
}

/** Drops the cached promise. For tests that want a second, real fetch. */
export function resetCellarCache(): void {
  pending = null
}
