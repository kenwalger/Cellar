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
        'The consumption whose tasting note this claim came from. Says which note, not who read it.',
    }),
    /**
     * How the window got into this document. See ADR 0012.
     *
     * `derivedFrom` does not answer this. Thirty-eight seeded assessments
     * carry it and every one was written by hand from a note the cellar owner
     * had already read, so the reference says "this claim came from that
     * bottle" and nothing about whether a model did the reading.
     *
     * Both facts are true of an accepted proposal and both belong in the
     * record: accepting a claim makes it the owner's, at the personal tier,
     * outranking every producer and critic claim for that wine — and that a
     * model drafted it stays true afterwards. A project whose argument is that
     * claims carry their provenance cannot leave the two indistinguishable.
     *
     * Absence means `authored`. The 161 imported assessments predate this
     * field and backfilling them is a write to production, deferred until
     * Stage 4b makes its first ones. Only `extracted` is ever rendered.
     */
    defineField({
      name: 'sourceMethod',
      title: 'Source method',
      type: 'string',
      description:
        'How this claim was drafted. Authored means a person wrote it; extracted means a model read a tasting note and proposed it. Not the same question as the authority tier, which says whose claim it is.',
      options: {
        list: [
          {title: 'Authored', value: 'authored'},
          {title: 'Extracted from a tasting note', value: 'extracted'},
        ],
        layout: 'radio',
      },
      initialValue: 'authored',
      // A record of how the document came to exist. The code that creates it
      // knows; an editor revising it later would only be guessing.
      readOnly: true,
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
      /**
       * The Accept and Reject document actions are the only way to move this.
       *
       * A workflow you can bypass with a radio button is decorated rather than
       * modelled, and ADR 0011 exists to model it. `readOnly` is a form
       * setting: it disables the input and does not touch the mutation layer,
       * so the actions' own patches are unaffected — `OperationsAPI['patch']`
       * in the installed types carries no readOnly among its disabled reasons,
       * where `publish` enumerates five of its own.
       *
       * Consequence, accepted deliberately: an assessment authored in the
       * Studio is born `accepted` and cannot be demoted. ADR 0011 defines two
       * transitions, both out of `proposed`, and this is what having only
       * those two looks like.
       */
      readOnly: true,
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
      sourceMethod: 'sourceMethod',
    },
    prepare({sourceName, sourceType, drinkFrom, drinkUntil, reviewState, sourceMethod}) {
      // Store dates, display years.
      const window = `${displayYear(drinkFrom)}–${displayYear(drinkUntil)}`
      return {
        title: [sourceName || 'Unattributed', window].join(' · '),
        // Only `extracted` is rendered. Absence of `sourceMethod` means
        // authored, which is what the 161 imported assessments are, and
        // labelling the ordinary case would put a word on every row to say
        // nothing.
        subtitle:
          [sourceType, reviewState, sourceMethod === 'extracted' ? 'extracted' : null]
            .filter(Boolean)
            .join(' · ') || undefined,
      }
    },
  },
})
