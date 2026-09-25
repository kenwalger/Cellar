import {useMemo, type ReactNode} from 'react'
import {useQuery} from '@sanity/sdk-react'
import {buildCellar, CELLAR_QUERY, toCellarSnapshot, type RawCellarResult} from '@cellar/core'
import {CellarContext} from './cellarContext'
import {DATASET, PROJECT_ID} from './sanity'

/**
 * One query and one index, shared by every view. The App SDK surface.
 *
 * Each view could run `CELLAR_QUERY` itself and rely on the App SDK to
 * recognise two identical subscriptions and serve both from one fetch. It very
 * likely does. But `CLAUDE.md` is explicit about not building on an assumed
 * API behaviour, and the second half of the saving is not the SDK's to make
 * anyway: `buildCellar` walks 1,645 documents into six indexes and costs about
 * 6ms, and two components calling `useMemo` on the same data still pay it
 * twice. Stage 3 has three consumers — Cellar Health, Drink Soon, and Missed
 * Opportunities, which evaluates hundreds of bottles at a dozen boundary dates
 * each. Sharing the index is structural here rather than a guess about caching.
 *
 * The provider suspends, because `useQuery` does. It therefore belongs inside
 * the Suspense boundary in `CellarShell`, below the masthead — the asOf control
 * must never be inside a boundary that can re-suspend underneath it.
 *
 * `PublicCellarProvider` is the other half of this pair and suspends too, so
 * the shell's boundary means the same thing on both surfaces.
 */

export interface CellarProviderProps {
  children: ReactNode
}

export function CellarProvider({children}: CellarProviderProps) {
  // The published perspective is explicit: an unpublished draft assessment
  // must not change what the cellar says before anyone published it.
  //
  // `asOf` is deliberately absent from these options, and from this component
  // entirely. CELLAR_QUERY fetches the whole ledger unfiltered by date, so
  // moving the control cannot invalidate this subscription — there is nothing
  // date-shaped for it to invalidate. Date is a parameter to the module, never
  // to the query.
  const {data} = useQuery<RawCellarResult>({
    query: CELLAR_QUERY,
    projectId: PROJECT_ID,
    dataset: DATASET,
    perspective: 'published',
  })

  const cellar = useMemo(() => buildCellar(toCellarSnapshot(data ?? {})), [data])

  return <CellarContext.Provider value={cellar}>{children}</CellarContext.Provider>
}
