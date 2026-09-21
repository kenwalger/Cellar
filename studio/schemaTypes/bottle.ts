import {defineField, defineType} from 'sanity'
import {BottleIcon} from '@sanity/icons/Bottle'

/**
 * Entity. The physical object, one document per bottle, which is what makes
 * per-bottle verdicts possible.
 *
 * There is no `acquiredAt` and no `consumedAt`. That absence is the design:
 * a bottle does not know when it was acquired, an acquisition does
 * (ADR 0004). A bottle also carries no status; state is derived by evaluating
 * events against an asOf date (ADR 0001).
 */
export const bottle = defineType({
  name: 'bottle',
  title: 'Bottle',
  type: 'document',
  icon: BottleIcon,
  fields: [
    defineField({
      name: 'wine',
      title: 'Wine',
      type: 'reference',
      to: [{type: 'wine'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: [
          {title: '375ml', value: '375ml'},
          {title: '750ml', value: '750ml'},
          {title: '1.5L', value: '1.5L'},
        ],
      },
      initialValue: '750ml',
    }),
    defineField({
      name: 'closure',
      title: 'Closure',
      type: 'string',
      options: {
        list: [
          {title: 'Cork', value: 'cork'},
          {title: 'Screwcap', value: 'screwcap'},
          {title: 'Technical', value: 'technical'},
        ],
      },
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Rack or bin identifier',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
      description: 'Provenance oddities, damaged label, questionable fill',
    }),
  ],
  // `select` does follow references with dot notation, so a bottle can show
  // its wine without a custom preview component. Falls back to composing the
  // vintage and cuvee, since `wine.title` is optional.
  //
  // One hop only: the docs cover `wine.title`, but two hops through to
  // `wine.producer.name` is not documented and is not relied on here.
  preview: {
    select: {
      wineTitle: 'wine.title',
      cuvee: 'wine.cuvee',
      vintageYear: 'wine.vintageYear',
      format: 'format',
      location: 'location',
    },
    prepare({wineTitle, cuvee, vintageYear, format, location}) {
      const wine = wineTitle || [vintageYear, cuvee].filter(Boolean).join(' ')
      return {
        title: wine || 'Bottle',
        subtitle: [format, location].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
