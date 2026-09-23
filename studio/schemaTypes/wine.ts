import {defineArrayMember, defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'
import {wineDisplayName} from '@cellar/core'

type VarietalValue = {grape?: string; percentage?: number}

/**
 * Entity. Vintage-specific identity; there is no separate vintage document
 * (ADR 0003). Metadata only, nothing temporal.
 *
 * Deliberately absent: `drinkFrom` and `drinkUntil`. Drinking windows are
 * claims and live on `assessment` (ADR 0002). The projection fields are
 * present from Stage 4 and live under `derived`, where the wrapper marks them
 * as cache rather than truth.
 */
export const wine = defineType({
  name: 'wine',
  title: 'Wine',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'Optional. Display name, for example "2018 Cristom Louise Vineyard Pinot Noir". Left empty, the preview composes vintage, producer, and cuvee.',
    }),
    defineField({
      name: 'producer',
      title: 'Producer',
      type: 'reference',
      to: [{type: 'producer'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cuvee',
      title: 'Cuvee',
      type: 'string',
      description: 'Vineyard or bottling name',
    }),
    defineField({
      name: 'vintageYear',
      title: 'Vintage year',
      type: 'number',
      validation: (rule) =>
        rule
          .required()
          .integer()
          .min(1900)
          .custom((year) => {
            if (typeof year !== 'number') return true
            // Computed per call so a long-lived Studio tab does not go stale.
            const currentYear = new Date().getFullYear()
            return year <= currentYear ? true : `Vintage year cannot be later than ${currentYear}`
          }),
    }),
    defineField({
      name: 'appellation',
      title: 'Appellation',
      type: 'string',
    }),
    defineField({
      name: 'varietals',
      title: 'Varietals',
      type: 'array',
      of: [defineArrayMember({type: 'varietal'})],
      validation: (rule) =>
        rule
          .custom((varietals) => {
            const entries = (varietals as VarietalValue[] | undefined) ?? []
            if (entries.length < 2) return true

            const percentages = entries.map((entry) => entry?.percentage)
            // A partially filled blend is not yet wrong, just incomplete.
            if (percentages.some((value) => typeof value !== 'number')) return true

            const total = (percentages as number[]).reduce((sum, value) => sum + value, 0)
            if (Math.abs(total - 100) < 0.01) return true
            return `Varietal percentages add up to ${total}, not 100`
          })
          .warning(),
    }),
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',
      options: {
        list: [
          {title: 'Red', value: 'red'},
          {title: 'White', value: 'white'},
          {title: 'Rose', value: 'rose'},
          {title: 'Sparkling', value: 'sparkling'},
          {title: 'Fortified', value: 'fortified'},
        ],
      },
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 4,
    }),
    // Maintained by Function, never by hand. `readOnly` is a Studio form
    // setting and not enforcement — the Function writes through the API, which
    // the Content Lake accepts without consulting the schema at all.
    defineField({
      name: 'derived',
      title: 'Derived',
      type: 'wineDerived',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      producerName: 'producer.name',
      cuvee: 'cuvee',
      vintageYear: 'vintageYear',
      appellation: 'appellation',
    },
    prepare({title, producerName, cuvee, vintageYear, appellation}) {
      // Composition lives in @cellar/core so the Studio, the App, and any
      // Function all name a wine the same way.
      return {
        title: wineDisplayName({title, producerName, cuvee, vintageYear}),
        subtitle: appellation || undefined,
      }
    },
  },
})
