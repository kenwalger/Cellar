import type {StructureResolver} from 'sanity/structure'
import {TiersIcon} from '@sanity/icons/Tiers'
import {distinctUntilChanged, map, shareReplay} from 'rxjs'

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

type ReviewState = (typeof REVIEW_STATES)[number]['state']
type ReviewCounts = Record<ReviewState, number>

/**
 * The counts in the titles.
 *
 * A queue with no numbers has to be interrogated. During the staging run a
 * transition looked like it had not landed and the answer took two GROQ
 * queries; "Awaiting review · 0, Accepted · 161" would have said immediately
 * that the Accept had worked. The numbers also tell the two datasets apart at a
 * glance, which is the other thing that has cost time.
 *
 * Structure Builder has no count of its own to offer. `ListItem` carries an
 * id, a title, an icon, a child and display options and nothing that holds a
 * number, and `title()` takes a string rather than anything that can change.
 * What it does support is a pane that *is* a live query: `ListItemChild`
 * includes `Observable<ItemChild>`, and the resolver switch-maps promises and
 * observables at any depth. So the list is rebuilt when the numbers change,
 * with the numbers written into the titles.
 *
 * Two departures from Sanity's own guide for this pattern. It fetches every
 * matching document and counts them in JavaScript, which would put all 161
 * assessments over the wire to produce three integers — `count()` does it in
 * the Content Lake instead. And a listener cannot carry a projection, which is
 * what the `{fetch, listen}` form is for: the fetch aggregates, the listener is
 * a bare filter that says only "something about an assessment changed".
 */
const COUNTS_QUERY = {
  fetch: `{
    "proposed": count(*[_type == "assessment" && reviewState == "proposed"]),
    "accepted": count(*[_type == "assessment" && reviewState == "accepted"]),
    "rejected": count(*[_type == "assessment" && reviewState == "rejected"])
  }`,
  listen: '*[_type == "assessment"]',
}

export const structure: StructureResolver = (S, context) => {
  const counts$ = context.documentStore
    .listenQuery(
      COUNTS_QUERY,
      {},
      {
        tag: 'review-queue.counts',
        // Parity with the lists below, which render through the current
        // perspective. Raw counts would count an assessment twice mid-Accept,
        // between the patch and the publish — which is the exact moment someone
        // is watching the number to see whether the transition landed.
        perspective: context.perspectiveStack,
      },
    )
    .pipe(
      map((result: Partial<ReviewCounts> | null): ReviewCounts => ({
        proposed: result?.proposed ?? 0,
        accepted: result?.accepted ?? 0,
        rejected: result?.rejected ?? 0,
      })),
      // Load-bearing rather than tidiness. Every emission mints new pane
      // objects, which get new ids, which changes the hash the structure tool
      // compares panes by — so an emission that carries the same three numbers
      // still re-resolves this branch and re-renders whatever pane is open,
      // under someone who is mid-review.
      distinctUntilChanged(
        (a, b) =>
          a.proposed === b.proposed && a.accepted === b.accepted && a.rejected === b.rejected,
      ),
      shareReplay({refCount: true, bufferSize: 1}),
    )

  return S.list()
    .title('Cellar')
    .items([
      S.listItem()
        .id('review-queue')
        .title('Review queue')
        .icon(TiersIcon)
        // Function form, so nothing subscribes until the queue is entered. A
        // Studio sitting on the root opens no listener and issues no query.
        .child(() =>
          counts$.pipe(
            map((counts) =>
              S.list()
                .id('review-states')
                .title('Review queue')
                .items(
                  REVIEW_STATES.map(({state, title}) => {
                    const labelled = `${title} · ${counts[state]}`
                    return S.listItem()
                      .id(state)
                      .title(labelled)
                      .child(
                        S.documentList()
                          .id(`assessments-${state}`)
                          .title(labelled)
                          .filter('_type == "assessment" && reviewState == $state')
                          .params({state})
                          // Newest claim first. `assessedAt` rather than
                          // `_createdAt`, because the queue is about when
                          // someone made a claim, not when a row landed in the
                          // dataset — and the bulk import stamped one
                          // `_createdAt` across all 161 of them anyway.
                          .defaultOrdering([{field: 'assessedAt', direction: 'desc'}]),
                      )
                  }),
                ),
            ),
          ),
        ),

      S.divider(),

      ...S.documentTypeListItems(),
    ])
}
