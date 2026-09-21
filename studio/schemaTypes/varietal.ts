import {defineField, defineType} from 'sanity'

/**
 * Supporting object for `wine.varietals`, lifted to a top-level type.
 *
 * content-model.md specifies this as an anonymous "array of object". The
 * Studio accepts an anonymous inline object, but `sanity graphql deploy`
 * rejects it, and `deploy-graphql` is a script in this package.
 */
export const varietal = defineType({
  name: 'varietal',
  title: 'Varietal',
  type: 'object',
  fields: [
    defineField({
      name: 'grape',
      title: 'Grape',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'percentage',
      title: 'Percentage',
      type: 'number',
      validation: (rule) => rule.min(0).max(100),
    }),
  ],
  preview: {
    select: {grape: 'grape', percentage: 'percentage'},
    prepare({grape, percentage}) {
      return {
        title: grape || 'Unnamed varietal',
        subtitle: typeof percentage === 'number' ? `${percentage}%` : undefined,
      }
    },
  },
})
