import {use, type ReactNode} from 'react'
import {CellarContext} from './cellarContext'
import {fetchCellar} from './publicClient'

/**
 * The public surface's provider. Same context, same object, no App SDK.
 *
 * `use()` suspends on the promise exactly as `useQuery` suspends on its
 * subscription, so `CellarShell`'s Suspense boundary behaves identically on
 * both surfaces and the fallback text is not a second implementation of
 * loading.
 *
 * **What is lost, stated plainly:** the App SDK surface subscribes and updates
 * live; this fetches once at mount. It costs nothing here. The interactive
 * part of this view is the `asOf` control, and that is pure client-side
 * computation over a ledger already in memory — `CELLAR_QUERY` carries no date
 * filter, so moving the control never returns to the network on either
 * surface. Every number a reader makes move, they move without a request.
 */
export interface PublicCellarProviderProps {
  children: ReactNode
}

export function PublicCellarProvider({children}: PublicCellarProviderProps) {
  const cellar = use(fetchCellar())
  return <CellarContext.Provider value={cellar}>{children}</CellarContext.Provider>
}
