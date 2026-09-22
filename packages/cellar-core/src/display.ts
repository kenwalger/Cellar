import type {WineInput} from './types.js'

export type WineDisplayInput = Pick<WineInput, 'title' | 'vintageYear' | 'producerName' | 'cuvee'>

/**
 * The canonical display name for a wine.
 *
 * `wine.title` is optional. When it is absent the name is composed as
 * vintage, producer, cuvee — "2018 Cristom Louise Vineyard" — which is what a
 * hand-written title spells out anyway.
 *
 * This lives here rather than in the Studio preview so that the Studio, the
 * App, and any Function all name a wine the same way. A composition that
 * exists in one surface only is a composition that drifts.
 */
export function wineDisplayName(wine: WineDisplayInput): string {
  if (wine.title) return wine.title

  const composed = [wine.vintageYear, wine.producerName, wine.cuvee]
    .filter((part) => part !== null && part !== undefined && part !== '')
    .join(' ')

  return composed || 'Untitled wine'
}
