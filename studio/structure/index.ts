import type {StructureResolver} from 'sanity/structure'
import {TiersIcon} from '@sanity/icons/Tiers'

/**
 * The review queue.
 *
 * ADR 0011's workflow needs somewhere to stand: a place that answers "what is
 * waiting for me" without a search. Three lists, one per review state, with
 * Proposed first because it is the only one that is a queue — the other two
 * are archives, and Rejected is an archive the model deliberately keeps rather
 * than a bin.
 *
 * Deliberately small. Stage 5 owns organising the whole Studio by state; this
 * adds the queue and leaves every other type where it was, listed by
 * `documentTypeListItems()` exactly as before. Assessments appear twice, once
 * here and once under their own type, which is correct: the queue is a view of
 * the review process and the type list is a view of the content.
 */

const REVIEW_STATES = [
  {state: 'proposed', title: 'Awaiting review'},
  {state: 'accepted', title: 'Accepted'},
  {state: 'rejected', title: 'Rejected'},
] as const

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Cellar')
    .items([
      S.listItem()
        .id('review-queue')
        .title('Review queue')
        .icon(TiersIcon)
        .child(
          S.list()
            .id('review-states')
            .title('Review queue')
            .items(
              REVIEW_STATES.map(({state, title}) =>
                S.listItem()
                  .id(state)
                  .title(title)
                  .child(
                    S.documentList()
                      .id(`assessments-${state}`)
                      .title(title)
                      .filter('_type == "assessment" && reviewState == $state')
                      .params({state})
                      // Newest claim first. `assessedAt` rather than
                      // `_createdAt`, because the queue is about when someone
                      // made a claim, not when a row landed in the dataset —
                      // and the bulk import stamped one `_createdAt` across
                      // all 161 of them anyway.
                      .defaultOrdering([{field: 'assessedAt', direction: 'desc'}]),
                  ),
              ),
            ),
        ),

      S.divider(),

      ...S.documentTypeListItems(),
    ])
