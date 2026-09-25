# Stage 5: polish

Date: 2026-09-25
Status: todo list. None of this is done.

The brief asks how deep the submission got into Sanity's own features and
whether the interface was customized. Both are judged, so the items below are
not cosmetic — each one is a place where the Studio stops looking like a
default Studio. They are ordered by ratio of visible effect to cost.

Cost is rough and assumes the surrounding code is already understood.

| # | Item | Cost | Cuttable |
| --- | --- | ---: | --- |
| 1 | Counts beside the review queue lists | 20–40 min | **No** |
| 2 | App icon for the Dashboard entry | 15–30 min | **No** |
| 5 | Past-window badge on bottles | 45–90 min | Yes, reluctantly |
| 6 | Structure organized by state | 1.5–3 h | Partly |
| 7 | Drinking-window bar input on assessment | 2–4 h | **Yes** |
| 8 | Bottle preview drops the producer | 15 min | **No** — small defect |
| 9 | The empty `derived` panel | 20 min, or blocked on 4b | Yes |
| 10 | Empty states in the three App views | 30 min | Yes |
| 11 | App tab title and favicon | 10 min | Partly done |
| 12 | Wine list ordering and search | 20 min | Yes |

**Items 3 and 4 are struck: already done.** Checked against the schema files
rather than assumed, after the first draft of this document asserted both were
missing. All six document types already declare an `icon`, and all six declare
a `preview`. The assessment preview already composes
`sourceName · window` as its title and `sourceType · reviewState · extracted`
as its subtitle, with the `extracted` marker rendered exactly as ADR 0012
specifies and the ordinary case left unlabelled.

Recording the error rather than quietly deleting the rows: the first draft was
written from what the *build plan* said Stage 5 would contain, not from what
the Studio already had, and it proposed work that was finished weeks ago.

---

## 1. Counts beside the review queue lists

**What.** `Review queue` currently shows three child lists — Awaiting review,
Accepted, Rejected — with no numbers. Put the count in each title, and ideally
the pending count on the `Review queue` item itself.

**Why it earns its place.** This one has evidence behind it rather than taste.
During the staging run, step 36 produced a failure that looked like the
transition had not landed. A queue reading `Awaiting review 0 · Accepted 162`
would have said immediately that the Accept *had* worked and the problem was
elsewhere. Instead the answer took two GROQ queries. A count is the difference
between a queue you can read and a queue you have to interrogate, and the whole
point of a review workflow is that someone glances at it.

It is also the cheapest possible demonstration that the Studio was customized
rather than accepted as generated.

**Cost.** 20–40 minutes. The counts need a query per list; `S.documentTypeList`
does not compute them, so this is a small custom list item or a badge fed by a
GROQ count. Worth checking whether the installed Structure Builder exposes a
supported way to do this before hand-rolling it — this is exactly the kind of
question this project has repeatedly had to answer from the types.

**Cut?** No. Smallest cost, highest evidence, directly on the judged criterion.

## 2. App icon for the Dashboard entry

**What.** An SVG icon, referenced as `app.icon` in `app/sanity.cli.ts`, so the
deployed app has a mark in the Dashboard sidebar rather than a default.

**Why it earns its place.** The first dry run said so out loud: *"Manifest
creation skipped: no icon or title found in app configuration."* The title has
since been set to "The Cellar"; the icon has not. The deployed app is the
project's most visible surface inside Sanity, and it currently sits in the
sidebar unbranded next to Canvas and Media Library.

The icon path accepts **SVG only** — other formats are not supported.

**Cost.** 15–30 minutes, most of it drawing. One line in `sanity.cli.ts`.

**Cut?** No. It is one line plus an asset, and it lands on the criterion about
customizing the interface.

**Related, and not polish:** the deploy printed
`deployment.appId: 'gcxu5htdwn5n9lc15m64sfpp'` and asked for it to be saved to
`app/sanity.cli.ts`. Until it is, later deploys risk creating a *second*
application rather than updating the first, and `sanity undeploy` cannot find
the app at all. Do this regardless of whether any other item here happens.

## 3 and 4. Document type icons, assessment previews — ~~todo~~ already done

Struck. `wine`, `producer`, `bottle`, `acquisition`, `consumption` and
`assessment` each already declare both an `icon` and a `preview`, and
`assessment`'s preview already renders the `extracted` marker per ADR 0012.
Nothing to do. See the note under the table.

## 5. Past-window badge on bottles

**What.** A Studio document badge on `bottle` showing its state — at minimum a
caution badge when the bottle is PAST_WINDOW.

**Why it earns its place.** It puts the project's central idea inside the
Studio rather than only in the App. Someone browsing a bottle sees that the
cellar has an opinion about it, computed from the event log.

**The real work is not the badge.** `bottle.derived.status` is unpopulated —
Stage 4b's Functions were never built — so a badge has nothing to read. Two
routes: compute the state in the badge component from the bottle's wine and
events, which duplicates resolution logic in a place design rule 6 did not
anticipate; or depend on 4b. The first is faster and worse.

There is also the honest complication ADR 0012 recorded: the state is
clock-dependent, so a badge is only true as of when it was computed. A badge
reading a stale `derived.status` would be a wrong label in the one place the
project claims never to be wrong.

**Cost.** 45–90 minutes if computed live in the component; otherwise blocked on
4b.

**Cut?** Yes, reluctantly. Strong demo value, but it is the item most likely to
turn into an argument about where resolution is allowed to live.

## 6. Structure organized by state

**What.** Replace the flat `documentTypeListItems()` tail with a structure that
groups content the way the project actually thinks: bottles by cellar state,
wines by whether they have an accepted window, events by recency.

**Why it earns its place.** This is the largest single "the interface was
customized" statement available. The default Studio root is a list of six
document types, which says nothing about the domain. A root that opens on
`Drinking now`, `Hold`, `Past window`, `Unassessed` says what the project is
for before anything is clicked.

`docs/build-plan.md` already assigns this to Stage 5; the review queue added in
4a was deliberately scoped as the queue only.

**Cost.** 1.5–3 hours, and the spread is because it has the same dependency
problem as item 5: grouping bottles by state needs the state, and the state is
either projected by a Function that does not exist yet or filtered in GROQ
against windows that resolve by authority-then-recency — which GROQ cannot
express without reimplementing the resolution rule in a query language, in a
second place, in violation of the rule that the module owns it.

A version that dodges this entirely: group by things the ledger states directly
— in cellar vs consumed, by acquisition source, by producer, by vintage decade.
Less striking, no duplicated logic, perhaps 45 minutes.

**Cut?** Partly. Do the ledger-derived grouping; cut the state-derived grouping
unless 4b lands first.

## 7. Drinking-window bar input on assessment

**What.** A custom input component replacing the two date fields with a single
visual bar: the window as a span, the vintage year marked, today marked, and
the currently resolved window for that wine shown behind the one being edited.

**Why it earns its place.** It is the most sophisticated Studio customization
on this list and the one a judge is least likely to have seen elsewhere.
Drinking windows are intervals, and editing an interval through two date
pickers is the generic answer. It would also make the authority-then-recency
rule visible at the moment of authoring: you would see the claim you are about
to outrank.

**Against it.** It is the only item here that is genuinely a build rather than a
configuration — a custom input component, form state via `useFormValue`,
patching through the right API, and a second query for the incumbent window. It
is also the item most likely to consume an afternoon and produce something
half-finished, which is worse than the default two date fields.

And it is **the one item that risks the project's own rules**: showing the
resolved window inside the input means resolution logic reaching into a Studio
form, and the temptation to approximate it in GROQ rather than call
`@cellar/core` would be strong.

**Cost.** 2–4 hours, wide error bars.

**Cut?** **Yes.** First thing to go. High ceiling, high variance, and nothing
else depends on it.

## 8. The bottle preview drops the producer

**Checked, as asked, before anything else. The wine list is fine; the bottle
list is not.**

**Wine is not affected.** `wine.ts` already calls `wineDisplayName` from
`@cellar/core` in its `prepare`, with `title` as an optional override, so a
wine with no `title` renders as "2023 Farm on Golden Hill Pinot Noir". The
worry in the first draft of this document was wrong.

**Bottle does not use it.** `bottle.ts` composes its own label:

```ts
const wine = wineTitle || [vintageYear, cuvee].filter(Boolean).join(' ')
```

With `wine.title` empty on all 98 wines, every one of the 542 bottle rows falls
to the second branch — vintage and cuvée, **no producer**. Measured against the
dataset: 98 wines collapse to **70 distinct labels**. "2023 Pinot Noir" is
three different wines, from Farm on Golden Hill, Paradis Vineyards and
St. Josef's.

**So it is a defect rather than polish**, as suspected, though a smaller one
than feared and on a different list. The bottle list is not the first thing a
judge lands on, but it is where a reviewer goes to check a specific bottle, and
28 of 98 wines cannot be told apart there.

**Fix.** Select `wine.producer.name` and call `wineDisplayName`, which is what
`wine.ts` does and what the App, the scripts and the seeding tool all do. The
subtitle can stay: `format` is set on all 542, `location` on none.

**Cost.** 15 minutes.

**Cut?** No. It is fifteen minutes and it is wrong today.

## 9. The empty `derived` panel

**What.** Wine and bottle both carry a collapsed, greyed `Derived` section with
every field empty, because 4b never ran.

**Why it earns its place.** Session 8 decided to leave `sourceMethod` visible
when unset, on the grounds that an empty field predating the schema is a fact.
That reasoning holds for one field on one document. A whole panel that is empty
on all 640 documents reads as broken rather than as absent, and it is on screen
during the Stage 4a demo.

Options: populate it (4b), hide the panel when `derived` is undefined, or leave
it with a description saying what fills it and when. The third is the most
honest and takes ten minutes.

**Cost.** 20 minutes for the description; otherwise blocked on 4b.

**Cut?** Yes, but the 20-minute version is cheap insurance against a reviewer
reading it as an unfinished feature.

## 10. Empty states in the three App views

**What.** What Cellar Health, Drink Soon and Missed Opportunities render when a
view has nothing to show.

**Why it earns its place.** The `asOf` control lets a viewer move to 1996, when
the cellar held one bottle, and to 2040, when every window has closed. A judge
will drag the slider to the ends — that is what sliders invite. Whatever those
views do at the extremes is part of the demo whether or not it was designed.

**Cost.** 30 minutes, once the extremes have been looked at. Possibly zero, if
they already read sensibly.

**Cut?** Yes, but look at the extremes before deciding. This is cheap to check
and embarrassing to discover on camera.

## 11. App tab title and favicon

**What.** The browser tab for the App and for the public build.

**Why it earns its place.** It is in every screenshot and every second of the
demo video. The public build especially, since it will be the only link a judge
can actually open.

**Cost.** 10 minutes.

**Cut?** Yes, but it is ten minutes.

## 12. Wine list ordering and search

**What.** A default ordering on the wine list, and making it searchable by
producer.

**Why it earns its place.** 98 wines and 542 bottles in `_createdAt` order —
all stamped identically by the bulk import — is effectively arbitrary. Anyone
exploring the dataset hits this immediately.

**Cost.** 20 minutes.

**Cut?** Yes. Real, minor.

---

## If only three things happen

Items **1, 8 and 2**: counts on the review queue, the bottle preview fix, and
the app icon. Roughly 75 minutes total. None depends on Stage 4b, none touches
the resolution module, and item 8 is a correctness fix rather than polish.

The original recommendation named items 3 and 4, which turned out to be
finished already — so the honest version of this list is shorter than the
first draft, and two of the three remaining items are the ones that came out of
observed failures rather than from a plan.
