import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {AcceptAssessmentAction, RejectAssessmentAction} from './actions/reviewActions'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

/**
 * The dataset is read from the environment so the Studio can be pointed at a
 * staging copy without editing code. Stage 4 makes this project's first
 * writes, and every one of them gets rehearsed somewhere other than
 * production first.
 *
 * `SANITY_STUDIO_` is the required prefix: the Studio's bundler only exposes
 * variables under it to the browser.
 */
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'Cellar',

  projectId: 'aos9nze5',
  dataset,

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    /**
     * Accept and Reject on assessments, and nowhere else.
     *
     * The callback form rather than a static array, because a static array
     * appends to every document type and these two belong to one. Both return
     * `null` unless the claim is `proposed`, so an accepted assessment shows
     * the built-in actions alone.
     *
     * They go first so that Accept is the primary button on a proposed claim.
     * Publish takes that slot everywhere else, which is right: reviewing is
     * what you came to a proposed assessment to do.
     */
    actions: (prev, context) =>
      context.schemaType === 'assessment'
        ? [AcceptAssessmentAction, RejectAssessmentAction, ...prev]
        : prev,
  },
})
