import {defineField, defineType} from 'sanity'
import {DropIcon} from '@sanity/icons/Drop'
import {notInFutureDateTime} from './lib/validation'

/**
 * Event. A bottle being opened. Facts only.
 *
 * There is no `verdict` field. Verdict is computed by comparing `consumedAt`
 * against the window resolved as of `consumedAt`, not as of now (ADR 0005).
 *
 * `consumedAt` is a datetime rather than a date because it keeps its time for
 * ordering several bottles opened the same evening. Every other comparison in
 * the model is date-level.
 */
export const consumption = defineType({
  name: 'consumption',
  title: 'Consumption',
  type: 'document',
  icon: DropIcon,
  fields: [
    defineField({
      name: 'bottle',
      title: 'Bottle',
      type: 'reference',
      to: [{type: 'bottle'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'consumedAt',
      title: 'Consumed at',
      type: 'datetime',
      validation: (rule) => rule.required().custom(notInFutureDateTime('Consumed at')),
    }),
    defineField({
      name: 'occasion',
      title: 'Occasion',
      type: 'string',
    }),
    defineField({
      name: 'tastingNote',
      title: 'Tasting note',
      type: 'text',
      rows: 5,
      description: 'Free text, as actually written',
    }),
  ],
  preview: {
    select: {occasion: 'occasion', consumedAt: 'consumedAt', tastingNote: 'tastingNote'},
    prepare({occasion, consumedAt, tastingNote}) {
      return {
        title: occasion || 'Consumption',
        subtitle: [consumedAt ? consumedAt.slice(0, 10) : 'No date', tastingNote]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
