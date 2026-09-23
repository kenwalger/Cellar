import {defineField, defineType} from 'sanity'

/**
 * Projections. Cache, never truth.
 *
 * Every field in here is reproducible from events and accepted assessments,
 * and is maintained by a Function rather than edited. The `derived` object is
 * the naming convention that says so: a leading underscore was the original
 * proposal and is not available, since Sanity reserves that form for system
 * fields. The wrapper turned out to be the better shape anyway, because it
 * makes a whole projection removable in one unset — which is the undo if a
 * Function ever writes something wrong across the dataset.
 *
 * Two things about these types are decisions rather than mechanics, and both
 * are recorded in ADR 0012.
 *
 * **`asOf` exists because the state machine reads a clock.** Design rule 1
 * says a projection must be reproducible from events and accepted assessments
 * alone. `status` is not: a bottle reading HOLD today reads DRINKING on 1
 * January with no event anywhere in the dataset, and nothing fires on the
 * passage of time. It is reproducible from events, accepted assessments, *and
 * a date*. Storing that date beside the answer is what makes the pair
 * honest — and it is what lets a reader see that a projection is three months
 * stale instead of trusting it.
 *
 * **There is no `cellarState` on wine.** `content-model.md` listed one. The
 * state machine in `temporal-resolution.md` is defined per bottle, and a wine
 * has bottles in several states at once with no rule that collapses them.
 * `bottle.derived.status` carries state at the level where it is defined.
 *
 * Registered as top-level object types rather than declared inline. The Studio
 * accepts an anonymous object, but `sanity graphql deploy` rejects one, and
 * `deploy-graphql` is a script in this package — the same trap `varietal`
 * already hit.
 */

/**
 * Per-wine projection.
 *
 * The window fields mirror what `resolvedWindow()` returns for this wine as of
 * `asOf`, and they are a convenience for the Studio only. Nothing in the App
 * reads them: Cellar Health, Drink Soon and Missed Opportunities all resolve
 * live from the event log, which is the whole argument of the project. A wrong
 * projection is therefore a wrong label in one Studio pane, not a wrong count
 * anywhere.
 */
export const wineDerived = defineType({
  name: 'wineDerived',
  title: 'Derived',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({
      name: 'bottlesOnHand',
      title: 'Bottles on hand',
      type: 'number',
      description: 'Acquired and not yet consumed, as of the date below.',
    }),
    defineField({
      name: 'bottlesConsumed',
      title: 'Bottles consumed',
      type: 'number',
    }),
    defineField({
      name: 'windowFrom',
      title: 'Window from',
      type: 'date',
      description: 'The resolved window: highest authority tier, then most recent within it.',
    }),
    defineField({
      name: 'windowUntil',
      title: 'Window until',
      type: 'date',
    }),
    defineField({
      name: 'windowSourceType',
      title: 'Window source type',
      type: 'string',
      description: 'Which authority tier won. Provenance, not a claim of its own.',
    }),
    defineField({
      name: 'asOf',
      title: 'As of',
      type: 'datetime',
      description:
        'When this projection was computed. The window fields are only true as of this instant, because visibility depends on the date and nothing recomputes on the passage of time.',
    }),
  ],
})

/**
 * Per-bottle projection: `bottleState(bottle, asOf).state`.
 *
 * One of NOT_YET_OWNED, CONSUMED, UNASSESSED, HOLD, DRINKING, PAST_WINDOW.
 * Stored as a plain string rather than a constrained list, because the list
 * lives in `@cellar/core` as `BottleState` and duplicating it here would give
 * the model two places to disagree with itself.
 */
export const bottleDerived = defineType({
  name: 'bottleDerived',
  title: 'Derived',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Cache of the state machine, evaluated at the date below.',
    }),
    defineField({
      name: 'asOf',
      title: 'As of',
      type: 'datetime',
      description: 'When this projection was computed. See the note on the wine type.',
    }),
  ],
})
