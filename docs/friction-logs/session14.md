### 28 September 2026, Session 14

#### Studio polish, and forty-five minutes lost to one dependency line

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to do: two Studio polish items, the bottle list preview and
counts on the review queue.
Outcome: both built and verified. A defect that had shipped weeks earlier was
found and fixed. Then a one-line dependency declaration cost a two-major
version CLI downgrade, two silently rewritten manifests, three failed
installs, and a broken dev server.
Elapsed: 08:07 to about 10:30 am, of which roughly 45 minutes was package
management.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 08:07 to 08:25 am | Prompt 1: propose both items, stop | 14m 11s |
| 08:27 to 09:19 am | Prompt 2: approved; build both | 4m 44s |
| 09:20 to about 10:20 am | The lockfile incident |
| about 10:25 am | Verification in the Studio, three checks, all passing |

#### The defect that had been shipping for weeks

`bottle.ts` carried a comment saying the docs cover `wine.title` but that two
hops through to `wine.producer.name` "is not documented and is not relied on
here." The first half is true. The second half cost something.

Reading the installed path observer settles it. `observePaths` recurses, and
at every segment it re-tests the value for a document id, where a reference
yields its `_ref`. There is no depth limit and no special case for the first
hop, so `wine.producer.name` resolves by the same code that resolves
`wine.title`. The factory that builds it says as much in its own note: a
reference in the path will be followed, allowing selection of paths within the
referenced document. A targeted search of the public docs turns up nothing on
preview-select dereferencing at any depth.

Session 6 read that silence and concluded the feature was unavailable rather
than undocumented. What shipped instead: with `wine.title` empty on all 98
wines, every one of the 542 bottle rows fell back to a hand-composed vintage
and cuvee label, collapsing 98 wines into **70 distinct labels**. "2023 Pinot
Noir" named four different producers across 22 rows.

**This is the mirror image of every other finding in this project.** The same
caution that stopped the model filing a bug that did not exist, back in
session 3, also stopped it using a feature that did. Refusing an undocumented
capability is the safe-looking move, and here it produced a defect that
survived weeks of work, in the list a reviewer opens to identify a specific
bottle.

Checking the installed implementation took about ten minutes. That is cheap
enough that "undocumented" should mean go read the source, not assume it does
not exist.

#### The review queue counts, and an @alpha shim

The queue had three lists and no numbers, which is how a transition came to
look like it had not landed during the staging run.

Structure Builder has no count of its own: `ListItem` carries an id, title,
icon, child and display options, with no badge, count or status slot, and
`title()` takes a string with no observable overload. Sanity's own guide
concedes the point in passing.

What is supported is that a pane can be a live query. `ListItemChild` includes
`Observable<ItemChild>`, `UnresolvedPaneNode` includes both `Observable` and
`PromiseLike`, and the resolver switch-maps either at any depth. The data
comes from `context.documentStore.listenQuery`.

The friction is where that sits. `documentStore` on
`StructureResolverContext` is annotated `@alpha`, with the comment that it can
be replaced by a different API in the future and is provided as-is to support
common structure patterns found in V2. So the one supported route to a count
in the structure is a context property Sanity describes as a compatibility
shim, and the developer guide teaching the pattern does not mention that.

Two implementation details worth keeping. The guide's own example fetches
every matching document and counts them in JavaScript; the `{fetch, listen}`
form exists precisely so the fetch can aggregate with `count()` server-side,
which turns 161 documents over the wire into three integers. And
`distinctUntilChanged` is load-bearing rather than tidiness: every emission
mints new pane objects and re-resolves the branch, so an unchanged count must
not re-emit under someone mid-review.

Counts cost nothing per render, since the number is a string baked into the
pane node. The cost is one listener and one fetch on entering the queue, then
a refetch per assessment mutation, throttled at a second. The function-form
child means nothing subscribes until someone opens the queue.

#### Forty-five minutes on one line

`rxjs` was being used through hoisting from `sanity` rather than declared, so
the plan was to declare it. The lockfile needed to learn about it, and the
documented way to update a lockfile without touching `node_modules` is
`npm install --package-lock-only`.

What it actually did was re-resolve the entire dependency tree. The next
`sanity dev` reported itself as version 5.31.1 offering an update to 6.16.0,
and Vite failed with `Missing field moduleType` from a plugin, naming
`[object Object]` as the file.

`npx sanity --version` returned `@sanity/cli 6.7.2`, down from 8.12.0. Two
major versions, silently.

Restoring the lockfile and running `npm install` made it worse: 297 packages
removed, and the `sanity` binary went with them. `npm ci` then refused,
listing several hundred missing packages, all of them 5.x.

The actual cause was one level further out. The install had not only rewritten
the lockfile, it had **rewritten two workspace manifests**:

```diff
-    "sanity": "^6.16.0",
+    "sanity": "^5.14.1",

-    "@sanity/vision": "^6.16.0",
+    "@sanity/vision": "^5.31.1",
-    "sanity": "^6.15.0",
+    "sanity": "^5.31.1",
```

No warning, no conflict report, no mention in the output. `npm install` said
it added, removed and changed packages, and said nothing about downgrading a
direct dependency by a major version in two `package.json` files.

Recovery was `git checkout HEAD --` on the lockfile and both manifests, then
`npm ci`, which took five minutes and restored 8.12.0.

Nothing was lost. The polish work was uncommitted the whole time and survived,
because none of it lives in a manifest.

**The resolution:** `rxjs` stays declared in `studio/package.json` and the
lockfile stays unaware of it. It resolves through hoisting, the declaration
records the intent, and the mechanism for making it real is not one to reach
for with a deadline four days out.

This is the same family as every other finding this week, in its purest form.
The failure is not that a tool refused. It is that a tool did something large
and said nothing.

#### Verification

Three checks in production, all passing:

- The 2023 Pinot Noirs now read as four distinct labels across 22 rows
- A bottle with no wine selected reads "Bottle" rather than "Untitled wine"
- No count query fires at the Studio root; entering the review queue shows
  Awaiting review 0, Accepted 161, Rejected 0

The staging checks, where the count moves on propose and accept, are deferred
to before filming.

#### Build findings

---


**Preview `select` follows references to any depth, and that is still not
documented.**

`bottle.ts` carried a comment saying the docs cover `wine.title` but that two
hops through to `wine.producer.name` "is not documented and is not relied on
here." The first half is true. The second half cost something.

Reading the installed path observer settles it: `observePaths` recurses, and at
every segment it re-tests the value for a document id, where a reference yields
its `_ref`. There is no depth limit and no special case for the first hop ,
`wine.producer.name` resolves by the same code that resolves `wine.title`. The
factory that builds it says as much in its own note: a reference in the path
"will be followed, allowing for selecting paths within the referenced
document." A targeted search of the public docs turns up nothing on
preview-select dereferencing at any depth, so the behaviour is verifiable in
the installed source and absent from the documentation.

Session 6 read the same silence and concluded the feature was unavailable
rather than undocumented. The result shipped: with `wine.title` empty on all 98
wines, measured, not assumed, every one of the 542 bottle rows fell to a
hand-composed vintage-and-cuvee label, which collapses 98 wines into **70
distinct labels**. "2023 Pinot Noir" named three producers. Composing with the
producer gives 98 distinct labels, one per wine.

The general lesson is about which way to fail when the docs are silent.
Refusing to use an undocumented capability is the cautious move, and here it
produced a defect that survived weeks of work, in a list a reviewer goes to in
order to identify a specific bottle. Checking the installed implementation took
about ten minutes. That check is cheap enough that "undocumented" should mean
"go read the source", not "assume it does not exist."

**Structure Builder has no count, and the only supported way to get one goes
through an `@alpha` shim the official guide does not mention.**

The queue has three lists and no numbers, which is how a transition came to
look like it had not landed during the staging run. Checked the installed
Structure Builder before hand-rolling anything, as the plan said to. `ListItem`
carries an id, a title, an icon, a child and display options; there is no
badge, no count and no status slot, and `title()` takes a `string` with no
observable or async overload. Sanity's own guide concedes the same point in
passing: a document count is not something the structure API hands you.

What *is* supported is that a pane can be a live query. `ListItemChild`
includes `Observable<ItemChild>`, `UnresolvedPaneNode` includes both
`Observable` and `PromiseLike`, and the resolver switch-maps either at any
depth. The data comes from `context.documentStore.listenQuery`. That is a real,
public, typed extension point, and the pattern works.

The friction is where it sits. `documentStore` on `StructureResolverContext` is
annotated `@alpha`, with the comment: "This can be replaced by a different API
in the future. It is provided as-is to support common structure patterns found
in V2 in V3." So the one supported route to a count in the structure is a
context property Sanity describes as a V2 compatibility shim, and the
developer guide that teaches the pattern, *Dynamic folder structure using the
currentUser and workflow states*, never says so. Anyone following the guide
adopts an `@alpha` dependency without being told they have. The fallback if it
goes is `context.getClient()` plus `client.listen` by hand: the same pattern,
twenty more lines.

Two smaller notes from the same guide. It counts by fetching every matching
document and taking `.length` in JavaScript, which here would put all 161
assessments over the wire to produce three integers; `count()` in the fetch
query does it in the Content Lake instead. And the `{fetch, listen}` form of
`listenQuery` exists because a listener query cannot carry a projection, the
guide explains this for `score()`, and it is exactly what aggregates need too.
That form is the part of the API that deserves more prominence than it gets.

One thing the implementation has to get right that no documentation warns
about: `distinctUntilChanged` on the counts is load-bearing. Every emission
mints new pane objects, each is assigned a fresh id, and the structure tool
compares panes by a hash of that id, so a refetch that returns the same three
numbers still re-resolves the branch and re-renders whatever pane is open,
under someone who is mid-review. The guide's example has no equivalent guard.

End:

---

#### Transcripts

Full prompts and outputs, unedited.

##### Prompt 1: propose both polish items (08:07 am)

```text
Two polish items, both in the Studio. Read docs/stage-5-polish.md first;
items 1 and 2 there, adjusted for what checking the code found.

1. The bottle list preview drops the producer. bottle.ts composes its own
   label rather than using wineDisplayName from @cellar/core, and falls back
   to vintage plus cuvee when the wine has no title, which is all 98 of
   them. So 542 bottle rows carry 70 distinct labels and "2023 Pinot Noir"
   names three different producers. Use the shared function, as wine.ts
   already does.

2. The review queue lists have no counts. Awaiting review, Accepted and
   Rejected should each carry their number, and ideally the pending count
   sits on the Review queue item itself.

   This has evidence behind it rather than taste. During the staging run a
   transition looked like it had not landed, and a queue reading
   "Awaiting review 0, Accepted 162" would have said otherwise immediately.
   Instead it took two GROQ queries. I hit the same thing again today,
   looking at an empty queue and having to reason about which dataset I was
   on.

   Check whether the installed Structure Builder has a supported way to do
   this before hand-rolling it.

Propose both, then stop. Say what the counts cost per render, since the
queue is a surface people leave open.

Standing rules: no git commands that change the repo, write the commit
message and tell me what to stage. Friction log entries go to
docs/friction-logs/session14.md as append, not overwrite.
```

##### Prompt 1 output

```text
Readidocs/stage-5-polish.md,tstudio/schemaTypes/bottle.ts, studio/schemaTypes/wine.ts, studio/structure/index.ts, the installed sanity@6.16.0 types and preview/structure implementation, and the dataset. Both items below are proposals only, nothing edited.

  Numbers first, from the datasets
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ┌────────────────────────────────────────────┬──────────────┬─────────────┐
  │────────────────────────────────────────────│──production──│───staging───│───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ├────────────────────────────────────────────┼──────────────┼─────────────┤
  │ assessments proposed / accepted / rejected │  0 / 161 / 0 │ 0 / 163 / 1 │                                                                                                                                                                           
  ├────────────────────────────────────────────┼──────────────┼─────────────┤
  │ draft assessments                          │            0 │           0 │
  ├────────────────────────────────────────────┼──────────────┼─────────────┤
  │ bottles / wines / producers                │ 542 / 98 / 8 │     542 /, │
  ├────────────────────────────────────────────┼──────────────┼─────────────┤
  │ wines with a title                         │            0 │          , │
  └────────────────────────────────────────────┴──────────────┴─────────────┘

  Your two claims check out: all 98 wines have no title, so every one of the 542 bottle rows takes the fallback branch, and the fallback yields 70 distinct labels for 98 wines. Composing with the producer yields 98 distinct labels, every wine separable. And the counts would have told you which dataset you
  were on today: Rejected 1 exists only in staging.

  ---
  Item 1, bottle preview drops the producer

  The blocker recorded in the comment at studio/schemaTypes/bottle.ts:76-79, "two hops through to wine.producer.name is not documented and is not relied on here", is half right, and the half that matters is wrong.

  I read the installed path observer (node_modules/sanity/lib/datastores-DkCuUqzn.js:959-1003). observePaths is recursive and re-tests every segment for a document id, where getDocumentId returns _ref for a reference. There is no depth limit and no special case for the first hop: wine.producer.name follows
  the bottle → wine → producer chain by the same code that makes wine.title work. The factory's own doc comment says so, "If the path includes a reference, the reference will be 'followed', allowing for selecting paths within the referenced document."

  So: still undocumented in the public docs (a targeted docs search surfaces nothing on preview-select dereferencing at any depth), but verifiable in the installed implementation, and not a separate mechanism from the one hop wine.ts:117 already relies on. I'd take it.

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
        // A bottle with no wine selected yet is still a bottle, not an
        // untitled wine, so the shared name is only asked for once there is
        // something to name.
        const named = [wineTitle, producerName, cuvee, vintageYear].some(Boolean)
        return {
          title: named
            ? wineDisplayName({title: wineTitle, producerName, cuvee, vintageYear})
            : 'Bottle',
          subtitle: [format, location].filter(Boolean).join(' · ') || undefined,
        }
      },
    },

  Plus the wineDisplayName import, and the preview comment rewritten to record what the depth question actually resolved to.

  The named guard is the one judgement call. Passing straight through to wineDisplayName would label a fresh bottle draft with no wine reference "Untitled wine", where it reads "Bottle" today. wine._ref cannot be used as the tell, the observer strips _ref from a reference before recursing, so that path
  returns undefined.

  Cost. One more hop per row, but there are only 8 producers. Field observation is batched with debounceCollect(…, 100) and cached per (id, fields) with shareReplay({refCount: true}) (datastores-DkCuUqzn.js:1480-1503), so a page of bottle rows adds roughly one extra round trip, and every row after the first
  eight hits cache. Subtitle unchanged: format is set on all 542, location on none.

  ---
  Item 2, counts on the review queue

  What the installed Structure Builder offers

  Checked before designing anything. In sanity@6.16.0:

  - ListItemBuilder.title(title: string), string only, no observable or async overload (types-BiJeXZlE.d.ts:1186).
  - interface ListItem has id, type, i18n, title, icon, child, displayOptions, schemaType, no badge, no count, no status slot (:1107-1127). Grepping the whole structure type surface for count turns up nothing relevant.
  - So there is no first-class count API. Sanity's own guide agrees, in as many words: "what if you want to get more from the structure, such as a document count… we cannot just get as easily from the query itself."

  What is supported, and is public API rather than hand-rolling:

  - type UnresolvedPaneNode = … | Observable<UnresolvedPaneNode> | PromiseLike<UnresolvedPaneNode> | PaneNode (:2549) and type ListItemChild = Collection | ChildResolver | Observable<ItemChild> | undefined (:1067). The resolver handles both at any depth: isPromise(pane) || isObservable(pane) ?
  from(pane).pipe(switchMap(result => resolvePane(result, …))) (structureTool-DGSOhdej.js:59).
  - context.documentStore.listenQuery(query | {fetch, listen}, params, options) (index-BBtenmSB.d.ts:1202).

  That combination, a list rebuilt from a live query, counts interpolated into the titles, is the documented pattern, in Dynamic folder structure using the currentUser and workflow states. I'd deviate from the guide in one way: it fetches every matching document and counts them in JS. With 161 assessments
  that is the whole queue over the wire on every change, for three integers. {fetch, listen} exists precisely so the fetch query can use functions the listener cannot, so the counts belong in count() server-side.

  Proposed shape

  const COUNTS = {
    // count() server-side: three integers, not 161 documents. The listener
    // query is a bare filter because a listener cannot carry a projection , 
    // which is what the {fetch, listen} form is for.
    fetch: `{
      "proposed": count(*[_type == "assessment" && reviewState == "proposed"]),
      "accepted": count(*[_type == "assessment" && reviewState == "accepted"]),
      "rejected": count(*[_type == "assessment" && reviewState == "rejected"])
    }`,
    listen: `*[_type == "assessment"]`,
  }

  export const structure: StructureResolver = (S, context) => {
    const counts$ = context.documentStore
      .listenQuery(COUNTS, {}, {
        tag: 'review-queue.counts',
        // Parity with the lists below, which render through the current
        // perspective. Raw counts would double-count an assessment mid-Accept,
        // between the patch and the publish, the exact moment a reader is
        // watching the number.
        perspective: context.perspectiveStack,
      })
      .pipe(
        map((r) => ({proposed: r?.proposed ?? 0, accepted: r?.accepted ?? 0, rejected: r?.rejected ?? 0})),
        // A refetch that returns the same three numbers must not re-emit: every
        // emission mints new pane objects and re-renders the open pane.
        distinctUntilChanged((a, b) => a.proposed === b.proposed && a.accepted === b.accepted && a.rejected === b.rejected),
        shareReplay({refCount: true, bufferSize: 1}),
      )

    return S.list().title('Cellar').items([
      S.listItem()
        .id('review-queue')
        .title('Review queue')
        .icon(TiersIcon)
        // Function form, so nothing is subscribed until the queue is entered.
        .child(() =>
          counts$.pipe(
            map((counts) =>
              S.list().id('review-states').title('Review queue').items(
                REVIEW_STATES.map(({state, title}) => {
                  const labelled = `${title} · ${counts[state]}`
                  return S.listItem().id(state).title(labelled).child(
                    S.documentList()
                      .id(`assessments-${state}`)
                      .title(labelled)
                      .filter('_type == "assessment" && reviewState == $state')
                      .params({state})
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

  Titles read Awaiting review · 0, Accepted · 161, Rejected · 0, using the · separator the previews already use. Parentheses are the other idiom; either is one character's difference.

  What it costs per render

  Per render, nothing. The count is a plain string baked into the pane node by the time React sees it; a re-render reads a prop. There is no query, no hook, no subscription in the render path.

  The real costs, from listenQuery at datastores-DkCuUqzn.js:3211-3217:

  - On first subscribe: one EventSource listener (client.listen, includeResult: false, visibility: 'query') plus one fetch on the welcome event. With the .child(() => …) function form this happens when someone enters Review queue, not on Studio load, an open Studio sitting on the root costs zero. Resolved
  panes are memoized with publishReplay(1), refCount() (structureTool-DGSOhdej.js:51), so it subscribes once per resolved pane, not per render, and drops when the branch leaves the pane cache.
  - Per mutation to any assessment: one refetch, throttled at options.throttleTime || 1e3 ms with leading and trailing, and mutation events whose visibility is not query wait a further timer(1200) before refetching; overlapping refetches collapse via exhaustMapWithTrailing. An Accept is patch + publish , 
  two events, typically one or two fetches, then silence.
  - Each fetch: three count() aggregates, evaluated server-side, response on the order of 60 bytes. No document payload at any point.
  - A queue left open all afternoon with nobody editing: zero fetches. The standing cost is one EventSource connection alongside the ones the Studio already holds.
  - distinctUntilChanged is load-bearing, not tidiness. assignId mints a fresh nanoid per new object (structureTool-Bx2p_qtJ.js:9456), which feeds hashResolvedPaneMeta; a re-emission that changes no number would still re-resolve the branch and re-render the open document pane under someone mid-review.

  The count on the Review queue item itself

  This is the part I'd treat as separable, because the cheap way to get it is bad. Making the root list itself the observable would put the pending count in the root title, and would also re-emit the root, including ...S.documentTypeListItems(), every time a count changes, re-resolving whatever pane is
  open. That is a re-render of the reviewer's workspace in exchange for a number.

  The supported alternative is the icon slot: icon accepts React.ComponentType | React.ReactNode and list-item icons are rendered through getIconWithFallback into SanityDefaultPreview's media box (structureTool-Bx2p_qtJ.js:9538-9545), inside the Studio provider tree, so a component there can hold hooks and
  subscribe to counts$ itself. That is the slot the guide uses for exactly this, and it costs one extra subscriber on the already-shared observable, but it moves the listener to Studio load, since the root pane is always mounted, and it replaces the TiersIcon with a number.

  My recommendation: ship the three child counts now, and decide the root badge after seeing them on screen. If you want it, the badge is the way, not an observable root.

  Two dependencies to declare

  rxjs@7.8.2, @sanity/ui@4.2.3 and react-rx@7.0.0 are all present at the workspace root but only as transitive dependencies of sanity; studio/package.json declares neither. The import of map/distinctUntilChanged/shareReplay needs rxjs added to studio/package.json at ^7.8.2 (and @sanity/ui only if the badge
  happens). Relying on hoisting is the kind of thing that works until an install reshuffles.

  One honest caveat

  documentStore on StructureResolverContext is annotated @alpha, with the comment "This can be replaced by a different API in the future. It is provided as-is to support common structure patterns found in V2 in V3" (types-BiJeXZlE.d.ts:2214-2220). So the only supported route to counts in structure is a
  context property Sanity describes as a compatibility shim, and the guide teaching it does not mention that. The fallback if it is ever removed is context.getClient({apiVersion}).observable.fetch plus client.listen by hand, the same pattern, twenty more lines.

  ---
  Verification, when it is built

  1. Bottle list: pick the three 2023 Pinot Noirs (Farm on Golden Hill, Paradis Vineyards, St. Josef's) and confirm three distinct rows.
  2. New bottle with no wine selected: row reads "Bottle".
  3. Production queue reads Awaiting review · 0 / Accepted · 161 / Rejected · 0; staging reads 0 / 163 / 1.
  4. Propose a window from a consumption, watch Awaiting review go to 1 without a reload; Accept it, watch it return to 0 and Accepted increment, and watch whether the open pane survives it.
  5. Network panel: confirm no fetch while the queue sits idle.

  Friction log

  Two entries earned here, drafted and ready to append to docs/friction-logs/session14.md on your word rather than written now, since you asked me to stop after proposing:

  - Preview select follows references to arbitrary depth, the recursion does not special-case the first hop, and this is still not in the docs. Session 6 declined the two-hop select for that reason and shipped a label that collapsed 98 wines into 70. The cost of treating undocumented-but-verifiable as
  unavailable was a defect that lasted weeks.
  - Structure Builder has no count API, and the supported workaround goes through a context property its own types mark @alpha and call a V2 compatibility shim. The official guide teaching the pattern fetches all matching documents to count them in JS and does not mention the @alpha status.

  Staging

  Nothing to stage yet, no files changed. The only modification in the tree is docs/friction-logs/session14.md, which you have already staged. The commit message comes with the implementation.

✻ Baked for 14m 11s
```

##### Prompt 2: approval (08:27 am)

```text
Approved, both items.

1. Bottle preview with the two-hop select, including the "Bottle" guard for a
   bottle with no wine yet. The comment should record what the depth question
   actually resolved to, and that session 6 declined this on the assumption it
   was unavailable.

2. The three child counts, with distinctUntilChanged and the function-form
   child so nothing subscribes until the queue is entered. Skip the root
   badge; I will decide after seeing the children on screen.

Declare rxjs in studio/package.json rather than relying on hoisting.

Append both friction log entries, including the @alpha status of
documentStore and that the official guide teaching the pattern does not
mention it.

Then give me the verification list and stop; I will check it in the Studio.
```

##### Prompt 2 output

```text
Bothhitems(are1in,·typecheckedk(tsc --noEmit, exit 0), lint-clean, and Prettier-formatted.

  Changed
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  - studio/schemaTypes/bottle.ts, two-hop select on wine.producer.name, wineDisplayName from @cellar/core, the named guard preserving "Bottle" for a bottle with no wine, and the comment rewritten to record that the depth question resolved to undocumented but present at any depth, and that session 6
  declined─it─on─the─assumption─it─was─unavailable.─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  - studio/structure/index.ts, counts in the three child titles and in each document-list pane header, from one documentStore.listenQuery using the {fetch, listen} form with count() server-side, perspective: context.perspectiveStack, distinctUntilChanged, shareReplay({refCount: true}), and the
  function-form .child(). No root badge.
  - studio/package.json, rxjs: ^7.8.2 declared, matching what sanity depends on.
  - docs/friction-logs/session14.md, both entries appended under Findings, including the @alpha annotation on documentStore, its "V2 compatibility shim" wording, and that the guide teaching the pattern never mentions it.

  One correction to docs/stage-5-polish.md while building the checklist: "2023 Pinot Noir" names four producers, not three, Farm on Golden Hill (6 bottles), Paradis Vineyards (8), St. Josef's (2), Vitis Ridge (6). 22 bottle rows share that one label today.

  Verification list

  Item 1, bottle preview

  1. Bottle list, find the 2023 Pinot Noirs: expect four distinct labels, 2023 Farm on Golden Hill Pinot Noir, 2023 Paradis Vineyards Pinot Noir, 2023 St. Josef's Pinot Noir, 2023 Vitis Ridge Pinot Noir, across 22 rows. Today all 22 read 2023 Pinot Noir.
  2. Scroll a page of rows and confirm labels resolve rather than flickering through a placeholder. Only 8 producers exist, so after the first batch every row should be cache-served.
  3. Subtitles unchanged: format only, no location (750ml, 375ml, 1.5L).
  4. Create a new bottle and leave wine unset: the row reads Bottle, not "Untitled wine".
  5. Set that bottle's wine to any of the 98: the row becomes the wine's name without a reload.
  6. Wine list unchanged, it already used the shared function.

  Item 2, queue counts

  7. Studio root, Review queue not yet clicked: no listener and no count query in the Network panel (filter for listen and for the review-queue.counts tag). This is what the function-form child buys.
  8. Enter Review queue: Awaiting review · 0, Accepted · 161, Rejected · 0 in production. One EventSource connection, one fetch, response on the order of 60 bytes.
  9. Open each child list; the pane header carries the same label as the row.
  10. Switch to staging (SANITY_STUDIO_DATASET=staging): Awaiting review · 0, Accepted · 163, Rejected · 1. The Rejected · 1 exists only in staging, this is the reading that would have answered this morning's question.
  11. In staging, propose a window from a consumption with the agent action: Awaiting review goes to 1 with no reload.
  12. Open the proposed claim and Accept it: Awaiting review returns to 0 and Accepted increments to 164. Watch two things, that it never reads a doubled count mid-transition between patch and publish, and that the document pane you are standing in does not re-mount when the number changes.
  13. Leave the queue open and idle for a few minutes: zero further fetches. The standing cost is the one open listener.
  14. Reject a second claim: Rejected increments, Awaiting review returns to 0.
  15. Perspective control, switch to Published and back: the counts continue to agree with the lists beneath them.

  Commit

  Stage:

  studio/schemaTypes/bottle.ts
  studio/structure/index.ts
  studio/package.json
  docs/friction-logs/session14.md

  rxjs is already on disk as a transitive dependency of sanity, so the Studio runs without an install. To make the declaration real in the lockfile, run npm install --package-lock-only and stage package-lock.json with the rest, I left it alone rather than let an install rewrite the lock unsupervised.

  Commit message:

  Name the producer in bottle rows, and put counts on the review queue

  The bottle preview composed its own label and fell back to vintage plus
  cuvee, which every wine takes: `title` is empty on all 98. That collapses
  98 wines into 70 distinct labels across 542 bottle rows, with "2023 Pinot
  Noir" naming four different producers. It now selects wine.producer.name
  and calls wineDisplayName, as wine.ts already did, which gives 98 distinct
  labels. A bottle with no wine selected still reads "Bottle".

  The comment claiming a second reference hop is unavailable is replaced by
  what checking the installed path observer found: references are followed
  at every segment, with no depth limit and no special case for the first
  hop. Still undocumented, and it has always worked. Session 6 read the
  silence as absence and shipped the collapsed labels.

  The review queue's three lists now carry their counts, from one
  documentStore.listenQuery using the {fetch, listen} form so the fetch can
  aggregate with count() while the listener stays a bare filter. Structure
  Builder has no count of its own, ListItem has no such slot and title()
  takes a string, but a list item's child may be an Observable, which is
  the supported way in. distinctUntilChanged is load-bearing: every
  emission mints new pane objects and re-resolves the branch, so an
  unchanged count must not re-emit under someone mid-review. The child is
  the function form, so nothing subscribes until the queue is entered.

  Counts cost nothing per render; the number is a string in the pane node.
  The cost is one listener and one fetch on entering the queue, then a
  refetch per assessment mutation, throttled at a second.

  rxjs is declared in studio/package.json rather than relied on through
  hoisting from sanity.

  CHANGELOG.md is untouched, Stage 5 has items left, so there is no milestone to record yet.

✻ Cooked for 4m 44s
```