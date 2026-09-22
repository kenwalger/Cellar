import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

/**
 * Bundling probe only. This manifest is temporary and is destroyed once the
 * question it answers is recorded. The real Stage 4 blueprint is designed
 * separately.
 *
 * Three independent guards keep the production dataset out of this:
 * the event is scoped by `resource` to the throwaway `probe` dataset, the
 * filter names a `_type` that does not exist in the content model, and the
 * handler performs no writes of any kind.
 */
export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'cellar-core-probe',
      src: './functions/cellar-core-probe',
      event: {
        on: ['create'],
        filter: '_type == "bundleProbe"',
        resource: {type: 'dataset', id: 'aos9nze5.probe'},
      },
    }),
  ],
})
