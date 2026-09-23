import {acquisition} from './acquisition'
import {assessment} from './assessment'
import {bottle} from './bottle'
import {consumption} from './consumption'
import {bottleDerived, wineDerived} from './derived'
import {producer} from './producer'
import {varietal} from './varietal'
import {wine} from './wine'

/**
 * Four categories of document, and the category tells you how to treat it:
 *
 *   Entities  producer, wine, bottle      identify things, nothing temporal
 *   Events    acquisition, consumption    what happened, and when
 *   Claims    assessment                  what someone believed, and when
 *   Projections  wine.derived,            what appears true now; cache, never
 *                bottle.derived           truth, maintained by Function
 *
 * `varietal`, `wineDerived` and `bottleDerived` are supporting object types,
 * not document types. All three are registered rather than declared inline
 * because `sanity graphql deploy` rejects anonymous objects.
 */
export const schemaTypes = [
  producer,
  wine,
  bottle,
  acquisition,
  consumption,
  assessment,
  varietal,
  wineDerived,
  bottleDerived,
]
