import {defineField, defineType} from 'sanity'
import {EarthAmericasIcon} from '@sanity/icons/EarthAmericas'

/**
 * Entity. Identity only, nothing temporal.
 *
 * Thin on purpose and first on the cut list (build-plan.md). `name` is
 * documented as unique; Sanity has no declarative cross-document uniqueness,
 * so duplicates are a dataset health concern alongside invariants 5 to 7
 * rather than a schema rule.
 */
export const producer = defineType({
  name: 'producer',
  title: 'Producer',
  type: 'document',
  icon: EarthAmericasIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      description: 'Willamette Valley, Northern Rhone, and so on',
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {title: 'name', region: 'region', country: 'country'},
    prepare({title, region, country}) {
      return {
        title: title || 'Unnamed producer',
        subtitle: [region, country].filter(Boolean).join(', ') || undefined,
      }
    },
  },
})
