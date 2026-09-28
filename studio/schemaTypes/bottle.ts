import {defineField, defineType} from 'sanity'
import {BottleIcon} from '@sanity/icons/Bottle'
import {wineDisplayName} from '@cellar/core'

/**
 * Entity. The physical object, one document per bottle, which is what makes
 * per-bottle verdicts possible.
 *
 * There is no `acquiredAt` and no `consumedAt`. That absence is the design:
 * a bottle does not know when it was acquired, an acquisition does
 * (ADR 0004). State is derived by evaluating events against an asOf date
 * (ADR 0001); `derived.status` from Stage 4 is a cache of that evaluation at
 * one instant and is not consulted by anything that needs the answer.
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
    // See the note on `wine.derived`. Maintained by Function; `readOnly` keeps
    // it out of the form, not out of the API.
    defineField({
      name: 'derived',
      title: 'Derived',
      type: 'bottleDerived',
      readOnly: true,
    }),
  ],
  // `select` follows references at every segment, not only the first. The path
  // observer recurses and re-tests each segment for a document id, so
  // `wine.producer.name` resolves through bottle to wine to producer by the
  // same code that resolves `wine.title` — there is no depth limit and no
  // special case for the first hop. `createPathObserver` says so in its own
  // note: a reference in the path "will be followed, allowing for selecting
  // paths within the referenced document".
  //
  // Session 6 composed the label by hand instead, on the assumption that the
  // second hop was unavailable because it was undocumented. It is still
  // undocumented and it has always worked. The assumption is what cost: with
  // `wine.title` empty on all 98 wines, every bottle row fell back to vintage
  // and cuvee, which collapses 98 wines into 70 distinct labels and leaves
  // "2023 Pinot Noir" naming three different producers.
  //
  // Naming itself lives in @cellar/core, as it does on `wine`, so the Studio,
  // the App and the scripts all name a wine the same way.
  preview: {
    select: {
      wineTitle: 'wine.title',
      producerName: 'wine.producer.name',
      cuvee: 'wine.cuvee',
      vintageYear: 'wine.vintageYear',
      format: 'format',
      location: 'location',
    },
    prepare({wineTitle, producerName, cuvee, vintageYear, format, location}) {
      // A bottle with no wine selected yet is a bottle, not an untitled wine,
      // so the shared name is only asked for once there is something to name.
      // `wine._ref` cannot be the tell: the observer strips `_ref` from a
      // reference before recursing, so that path comes back undefined.
      const named = [wineTitle, producerName, cuvee, vintageYear].some(Boolean)
      return {
        title: named
          ? wineDisplayName({title: wineTitle, producerName, cuvee, vintageYear})
          : 'Bottle',
        subtitle: [format, location].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
