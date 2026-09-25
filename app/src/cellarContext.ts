import {createContext, useContext} from 'react'
import type {Cellar} from '@cellar/core'

/**
 * The indexed cellar, and nothing about where it came from.
 *
 * This module exists so the three views can read a `Cellar` without importing
 * anything from Sanity. It was carved out of `CellarProvider` when the public
 * build arrived: that file imports `@sanity/sdk-react`, and while `useCellar`
 * lived beside it every view had the App SDK in its dependency graph — which
 * matters, because the App SDK's `AuthBoundary` redirects an anonymous visitor
 * to a login page, so a bundle containing it cannot serve a public demo.
 *
 * Two providers fill this context. `CellarProvider` subscribes through the App
 * SDK inside the Dashboard; `PublicCellarProvider` fetches once through
 * `@sanity/client` from a static host. Both run the same
 * `CELLAR_QUERY -> toCellarSnapshot -> buildCellar` pipeline and hand down the
 * same object, so nothing below this line knows which surface it is on.
 */

export const CellarContext = createContext<Cellar | null>(null)

/**
 * Date-independent: every view takes `asOf` as a prop and passes it to
 * `@cellar/core`, which is where all the temporal reasoning is.
 */
export function useCellar(): Cellar {
  const cellar = useContext(CellarContext)
  if (!cellar) throw new Error('useCellar() was called outside a cellar provider')
  return cellar
}
