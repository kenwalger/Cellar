import {defineField, defineType} from 'sanity'
import {TrolleyIcon} from '@sanity/icons/Trolley'
import {notInFutureDate} from './lib/validation'

/**
 * Event. A bottle entering the cellar, carrying its own date (ADR 0004).
 *
 * "Every bottle has exactly one acquisition" is invariant 5 and cannot be
 * enforced by schema validation. It surfaces as a dataset health warning.
 */
export const acquisition = defineType({
  name: 'acquisition',
  title: 'Acquisition',
  type: 'document',
  icon: TrolleyIcon,
  fields: [
    defineField({
      name: 'bottle',
      title: 'Bottle',
      type: 'reference',
      to: [{type: 'bottle'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'acquiredAt',
      title: 'Acquired at',
      type: 'date',
      validation: (rule) => rule.required().custom(notInFutureDate('Acquired at')),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description:
        'Who it came from, by name: "Flatiron Wines", "direct from Cristom", "gift from Dave"',
    }),
    defineField({
      name: 'sourceType',
      title: 'Source type',
      type: 'string',
      options: {
        list: [
          {title: 'Retail', value: 'retail'},
          {title: 'Winery', value: 'winery'},
          {title: 'Auction', value: 'auction'},
          {title: 'Gift', value: 'gift'},
          {title: 'Trade', value: 'trade'},
        ],
      },
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      options: {
        list: [
          {title: 'USD', value: 'USD'},
          {title: 'EUR', value: 'EUR'},
          {title: 'GBP', value: 'GBP'},
        ],
      },
      initialValue: 'USD',
    }),
  ],
  preview: {
    select: {source: 'source', sourceType: 'sourceType', acquiredAt: 'acquiredAt'},
    prepare({source, sourceType, acquiredAt}) {
      return {
        title: source || sourceType || 'Acquisition',
        subtitle: acquiredAt || 'No date',
      }
    },
  },
})
