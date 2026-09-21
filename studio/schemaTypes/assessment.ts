import {defineField, defineType} from 'sanity'
import {TiersIcon} from '@sanity/icons/Tiers'
import {displayYear, notInFutureDate} from './lib/validation'

/**
 * Claim. A dated, attributed statement about a drinking window (ADR 0002).
 *
 * The set of assessments only ever grows. Nothing overwrites a window: a new
 * opinion is a new document, and resolution picks between them by authority
 * then recency (ADR 0006), counting accepted claims only (ADR 0011).
 */
export const assessment = defineType({
  name: 'assessment',
  title: 'Assessment',
  type: 'document',
  icon: TiersIcon,
  fields: [
    defineField({
      name: 'wine',
      title: 'Wine',
      type: 'reference',
      to: [{type: 'wine'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sourceType',
      title: 'Source type',
      type: 'string',
      description:
        'Authority tier. Listed in resolution order: the highest tier with any visible assessment wins, and recency only breaks ties within a tier.',
      options: {
        list: [
          {title: 'Personal', value: 'personal'},
          {title: 'Producer', value: 'producer'},
          {title: 'Critic', value: 'critic'},
          {title: 'Merchant', value: 'merchant'},
          {title: 'Other', value: 'other'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sourceName',
      title: 'Source name',
      type: 'string',
      description: 'Who made the claim: "Cristom", "Jancis Robinson", "me"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'assessedAt',
      title: 'Assessed at',
      type: 'date',
      description:
        'When the claim was made. This is what resolution orders on, not when it was accepted.',
      validation: (rule) => rule.required().custom(notInFutureDate('Assessed at')),
    }),
    defineField({
      name: 'drinkFrom',
      title: 'Drink from',
      type: 'date',
      description: 'A window stated as a year starts on January 1 of that year.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'drinkUntil',
      title: 'Drink until',
      type: 'date',
      description: 'A window stated as a year ends on December 31 of that year.',
      // Inclusive. Normalization turns a window stated as a single year into
      // an equal-year pair spanning January 1 to December 31, so a strict
      // comparison would reject the most ordinary window in the ledger.
      validation: (rule) => [
        rule.required(),
        rule
          .min(rule.valueOfField('drinkFrom'))
          .error('Drink until must be on or after drink from'),
      ],
    }),
    defineField({
      name: 'confidence',
      title: 'Confidence',
      type: 'string',
      description: 'Recorded and displayed, but does not participate in resolution (ADR 0006).',
      options: {
        list: [
          {title: 'Low', value: 'low'},
          {title: 'Medium', value: 'medium'},
          {title: 'High', value: 'high'},
        ],
      },
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'derivedFrom',
      title: 'Derived from',
      type: 'reference',
      to: [{type: 'consumption'}],
      description:
        'Set when this claim was extracted from a tasting note. Agents create such assessments as proposed.',
    }),
    defineField({
      name: 'reviewState',
      title: 'Review state',
      type: 'string',
      description:
        'Only accepted assessments resolve a window. Agents propose, people decide (ADR 0011). Rejected claims stay in the dataset rather than being deleted.',
      options: {
        list: [
          {title: 'Proposed', value: 'proposed'},
          {title: 'Accepted', value: 'accepted'},
          {title: 'Rejected', value: 'rejected'},
        ],
        layout: 'radio',
      },
      // Studio-authored assessments default to accepted. initialValue is a
      // Studio mechanism and does not apply to API writes, so the agent and
      // the ledger import must both set this explicitly.
      initialValue: 'accepted',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      sourceName: 'sourceName',
      sourceType: 'sourceType',
      drinkFrom: 'drinkFrom',
      drinkUntil: 'drinkUntil',
      reviewState: 'reviewState',
    },
    prepare({sourceName, sourceType, drinkFrom, drinkUntil, reviewState}) {
      // Store dates, display years.
      const window = `${displayYear(drinkFrom)}–${displayYear(drinkUntil)}`
      return {
        title: [sourceName || 'Unattributed', window].join(' · '),
        subtitle: [sourceType, reviewState].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
