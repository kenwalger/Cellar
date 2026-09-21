import {acquisition} from './acquisition'
import {assessment} from './assessment'
import {bottle} from './bottle'
import {consumption} from './consumption'
import {producer} from './producer'
import {varietal} from './varietal'
import {wine} from './wine'

/**
 * Four categories of document, and the category tells you how to treat it:
 *
 *   Entities  producer, wine, bottle      identify things, nothing temporal
 *   Events    acquisition, consumption    what happened, and when
 *   Claims    assessment                  what someone believed, and when
 *   Projections                           not yet; Stage 4
 *
 * `varietal` is a supporting object type, not a document type.
 */
export const schemaTypes = [producer, wine, bottle, acquisition, consumption, assessment, varietal]
