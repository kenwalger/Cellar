# Content model

Status: draft, pre-implementation. Field names are proposals and may shift
once the challenge brief lands.

## Shape of the model

Four categories of document, and the category tells you how to treat it.

| Category | Documents | Rule |
| --- | --- | --- |
| Entities | `producer`, `wine`, `bottle` | Identify things. Metadata only. Nothing temporal. |
| Events | `acquisition`, `consumption` | Say what happened, and when. Immutable in spirit. |
| Claims | `assessment` | Say what someone believed, and when they believed it. |
| Projections | fields on `wine` and `bottle` | Say what appears true now. Cache, never truth. |

The rule that keeps the time machine working: nothing temporal is stored
inside the entity it modifies. A bottle does not know when it was acquired.
An acquisition knows.

## producer

Reference target only. Thin on purpose, and first on the cut list if time
runs short.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. Unique. |
| `region` | string | Willamette Valley, Northern Rhone, and so on |
| `country` | string | |
| `website` | url | Optional |
| `notes` | text | Optional |

## wine

Vintage-specific identity. There is no separate vintage document. See ADR 0003.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Optional. Display name, for example "2018 Cristom Louise Vineyard Pinot Noir". When absent, `wineDisplayName` composes vintage, producer, cuvee. |
| `producer` | reference to `producer` | Required |
| `cuvee` | string | Vineyard or bottling name |
| `vintageYear` | number | Required. Range 1900 to current year. Non-vintage wines are out of scope. |
| `appellation` | string | |
| `varietals` | array of `varietal` | `varietal` is a registered top-level object type, `{ grape: string, percentage: number }` |
| `color` | string | red, white, rose, sparkling, fortified |
| `notes` | text | |

`varietal` is registered as its own object type rather than declared as an
anonymous inline object. The Studio accepts an anonymous object, but
`sanity graphql deploy` rejects it, and `deploy-graphql` is a script in the
Studio package.

Projection fields, maintained by Function, never edited by hand. They live in
a `derived` object rather than at the top level:

| Field | Type | Notes |
| --- | --- | --- |
| `derived.bottlesOnHand` | number | |
| `derived.bottlesConsumed` | number | |
| `derived.windowFrom` | date | Resolved window, as of `derived.asOf` |
| `derived.windowUntil` | date | |
| `derived.windowSourceType` | string | Which authority tier won |
| `derived.asOf` | datetime | When this projection was computed. See ADR 0012. |

There is no `derived.cellarState`. A wine holds bottles in several states at
once and nothing collapses them into one value; state is per bottle. See
ADR 0012.

The `derived` object is the naming convention signalling derived data. A
leading underscore was the original proposal and is not available: Sanity
reserves underscore-prefixed names for system fields and the schema validator
rejects them. The object wrapper is better anyway, because it makes a
projection removable in one unset.

## bottle

The physical object. One document per bottle, which is what makes per-bottle
verdicts possible.

| Field | Type | Notes |
| --- | --- | --- |
| `wine` | reference to `wine` | Required |
| `format` | string | 375ml, 750ml, 1.5L. Default 750ml. |
| `closure` | string | cork, screwcap, technical |
| `location` | string | Rack or bin identifier |
| `notes` | text | Provenance oddities, damaged label, questionable fill |

Projection field, in the same `derived` object as on `wine`:

| Field | Type | Notes |
| --- | --- | --- |
| `derived.status` | string | Cache of `state(bottle, derived.asOf)`. |
| `derived.asOf` | datetime | When this projection was computed. See ADR 0012. |

The Studio preview shows the bottle's wine. Preview `select` follows
references with dot notation, so `wine.title` resolves without a custom
component.

Note there is no `acquiredAt` and no `consumedAt`. That absence is the design.

## acquisition

| Field | Type | Notes |
| --- | --- | --- |
| `bottle` | reference to `bottle` | Required |
| `acquiredAt` | date | Required. Must not be in the future. |
| `source` | string | Free text. Who it came from, by name: "Flatiron Wines", "direct from Cristom", "gift from Dave" |
| `sourceType` | string | Enum: retail, winery, auction, gift, trade |
| `price` | number | Optional |
| `currency` | string | USD, EUR, GBP. Default USD. |

`source` and `sourceType` are the same split as `sourceName` and `sourceType`
on `assessment`: one names the party, the other classifies it.

Import mapping from the ledger: the ledger's `sourceName` column goes to
`source` verbatim. `sourceType` is inferred where the name makes it obvious —
winery club to `winery`, grocery store to `retail`, auction lot to `auction`,
gift to `gift` — and left empty otherwise. Guessing a tier that the ledger
does not support would put invented data behind a field that looks
authoritative.

## consumption

| Field | Type | Notes |
| --- | --- | --- |
| `bottle` | reference to `bottle` | Required |
| `consumedAt` | datetime | Required. Must not be in the future. |
| `occasion` | string | Optional |
| `tastingNote` | text | Free text, as actually written |

No `verdict` field. See ADR 0005.

## assessment

A dated, attributed claim about a drinking window. This is the interesting
document type and the one the article is built around.

| Field | Type | Notes |
| --- | --- | --- |
| `wine` | reference to `wine` | Required |
| `sourceType` | string | personal, producer, critic, merchant, other. Required. |
| `sourceName` | string | Required. "Cristom", "Jancis Robinson", "me" |
| `assessedAt` | date | Required. Must not be in the future. |
| `drinkFrom` | date | Required. Normalization rules in the temporal spec. |
| `drinkUntil` | date | Required. Must be on or after `drinkFrom`. |
| `confidence` | string | low, medium, high |
| `notes` | text | |
| `derivedFrom` | reference to `consumption` | Optional. Which tasting note this claim came from. Says nothing about who read it. |
| `sourceMethod` | string | authored, extracted. Absence means authored. See ADR 0012. |
| `reviewState` | string | proposed, accepted, rejected. Required. Default accepted for hand-authored, proposed for agent-created. See ADR 0011. |

`derivedFrom` closes the feedback loop. You open a bottle, write a note, and
that note becomes a new claim that changes the window on the bottles still in
the rack.

`derivedFrom` does not record that a model was involved, and this document
used to say it did. Thirty-eight seeded assessments carry it and all of them
were written by hand from a note the owner had already read. `sourceMethod` is
the field that distinguishes them, because both facts about an accepted
proposal are true at once: it is now the owner's claim, at the personal tier,
and a model drafted it.

## Validation rules

Rules Sanity can enforce inside a document:

0. `assessment.reviewState` is one of the three permitted values.
1. `assessment.drinkUntil` is on or after `assessment.drinkFrom`. Inclusive:
   because windows normalize to January 1 and December 31, a window stated as
   a single year still spans that whole year, and rejecting an equal pair
   would only catch dates that normalization never produces.
2. No `assessedAt`, `acquiredAt`, or `consumedAt` in the future. The two
   `date` fields compare against the editor's local calendar date, since a
   date carries no timezone; `consumedAt` is a datetime and compares against
   the current instant. The bound is computed when the rule runs, not when
   the module loads, so a Studio tab left open overnight does not keep
   yesterday's answer.
3. `wine.varietals` percentages sum to 100 when more than one is present.
   This is a warning rather than a blocking error, and it applies only when
   every percentage is filled. A partially filled blend is incomplete, not
   wrong, and blends are routinely stated approximately.
4. Required references are present.

Nothing here enforces how a document was created. Sanity validation sees the
document's current state on every edit and has no notion of "at creation", so
"an agent-created assessment starts as `proposed`" is the agent's
responsibility: it sets `proposed` explicitly when it writes.

Rules Sanity cannot enforce across documents, and which therefore become
Function checks or dataset health warnings:

5. Every bottle has exactly one acquisition.
6. Every bottle has at most one consumption.
7. No consumption predates its bottle's acquisition.
8. `producer.name` is unique.

Rule 5 through 8 violations should surface in Studio rather than being
silently tolerated, because they are the cases that produce nonsense in the
asOf views. A dataset health document listing current violations is the
cheapest way to show them, and it doubles as a nod at the content-governance
theme in the article.

Rule 8 sits here rather than in the schema because Sanity has no declarative
cross-document uniqueness. `rule.unique()` validates array members. Enforcing
it in the schema would mean an async validator issuing a GROQ count on every
keystroke, and it still would not see imported data.

### Validation runs in Studio only

Schema validation and `initialValue` are both Studio mechanisms. Mutations
submitted through the API or a client library are not checked against
validation rules and do not receive initial values.

Two consequences, both load-bearing for the seed import:

- The import must write every required value explicitly. Nothing is filled in
  for it. In particular every seeded assessment carries
  `reviewState: 'accepted'`, because the `accepted` default exists only for
  documents authored in the Studio, and an assessment with no `reviewState`
  resolves no window at all.
- Dataset health is the only check that ever sees imported data. A violation
  of rules 0 through 4 in an imported document stays invisible until somebody
  opens that document in the Studio. This is the argument for the health view
  being a real feature rather than polish.

## Invariants worth stating out loud

- A bottle's entire life is: acquired, optionally consumed. There is no
  intermediate mutable state.
- The set of assessments only ever grows. Nothing overwrites a window.
- Every projection field is reproducible from events, accepted claims, and the
  date it was computed at. If a projection cannot be recomputed from scratch
  given those three, it is a bug in the model, not in the Function.

That last one is the test to run against any field added later. It named two
inputs until Stage 4, and two is one short: the state machine compares against
a date, so a projection of it is only reproducible if that date is stored
beside it. That is what `derived.asOf` is for, and ADR 0012 records why the
rule moved rather than the code.

## Deliberately out of scope for V1

Cellar location hierarchy, bottle movement between locations, ownership
transfer, purchase lots, bottle condition over time, multiple cellars, users
and permissions. Each of these would be another event type and none of them
earns its keep in a two week build.

## Changes during implementation

### 2026-09-21, Stage 1

The six document types were written and the model met the Sanity schema API
for the first time. Most of what follows is refinement. Two items are errors
in this document that only implementation exposed, and they are marked as
such.

**Spec error: validation rule 0, second clause.** The rule read "an assessment
with `derivedFrom` set was created as `proposed`". That is not expressible.
Sanity validation evaluates the document's current state on every edit and has
no create-time hook. Encoded literally as `derivedFrom` implies
`reviewState == proposed`, accepting an agent-proposed assessment becomes a
permanent validation error — which breaks the one transition ADR 0011 exists
to model. The clause is dropped. The agent sets `proposed` explicitly when it
writes, and the schema does not police provenance.

**Spec error: validation was assumed to apply to all writes.** This document
listed rules 0 through 4 as things "Sanity can enforce" without qualifying
where. Schema validation and `initialValue` run in Sanity Studio only; API and
client mutations bypass both. The seed import therefore passes through no
validation at all, and the `accepted` default on `reviewState` never fires for
an imported assessment. Every seeded assessment must carry `reviewState`
explicitly or it resolves no window. A new subsection under the validation
rules records this, and it upgrades dataset health from a nice-to-have to the
only check that ever sees imported data.

The refinements:

- **Projection fields move into a `derived` object.** The underscore prefix
  was proposed here with a note to confirm it. It is not permitted: Sanity
  reserves underscore-prefixed names for system fields and the schema
  validator rejects them. The open question is closed. The object wrapper is
  the better form regardless, since it makes a projection removable in one
  unset.
- **`producer.name` uniqueness moves to the cross-document checks** as
  rule 8, surfaced as a dataset health warning. Sanity has no declarative
  cross-document uniqueness; `rule.unique()` validates array members.
  Enforcing it in the schema would mean an async GROQ count per keystroke that
  still would not see imported data.
- **`acquisition.source` is free text, `sourceType` is the enum.** The field
  table previously annotated both with nearly the same list of values, which
  read as two enums for one fact. The split now matches `sourceName` and
  `sourceType` on `assessment`. The ledger import mapping is recorded with
  the field.
- **`wine.title` becomes optional.** The Studio preview composes vintage,
  producer, and cuvee when it is absent, which is what the title would have
  spelled out by hand anyway. Stage 2 moved that composition into
  `wineDisplayName` in `@cellar/core` so every surface names a wine the same
  way; see `temporal-resolution.md`.
- **`drinkUntil` is inclusive of `drinkFrom`.** Stage 1 first implemented
  this as strictly after, on the reading that a zero-length window is a data
  entry error. That was wrong in a way the normalization rules make obvious:
  windows normalize to January 1 and December 31, so a window stated as a
  single year arrives as an equal-year pair spanning twelve months. Strict
  comparison would reject the most ordinary window in the ledger.
- **Varietal percentages are a warning, not an error**, and only fire when
  every percentage is filled. Blends are stated approximately and a partially
  filled one is incomplete rather than wrong. Blocking publication over a
  cosmetic sum is the wrong trade.
- **"Not in the future" is specified precisely.** `date` fields compare
  against the editor's local calendar date, `consumedAt` against the current
  instant, and the bound is computed when the rule runs. Comparing dates in
  UTC would stop an editor west of Greenwich recording today's acquisition
  until late afternoon.
- **`vintageYear` stays required.** Non-vintage wines would need it optional
  and are out of scope. Noted in the field table so it is a decision rather
  than an oversight.
- **`varietal` is a registered top-level object type.** The model specified an
  anonymous inline object. The Studio accepts one, but `sanity graphql deploy`
  rejects anonymous objects, and `deploy-graphql` is a script in the Studio
  package.
- **`acquisition.currency` is constrained to USD, EUR, GBP.** The model gave a
  default of USD but never listed permitted values.
- **Assessment tie-breaking gains a second key.** `_createdAt` descending,
  then `_id` descending. A bulk import stamps a shared `_createdAt` across
  every document it writes, so the original single key is not deterministic on
  imported data. See `temporal-resolution.md` and the amendment to ADR 0006.

One earlier claim corrected: bottle previews were said to require a custom
component, because preview `select` supposedly could not follow references.
It can. The [list previews
documentation](https://www.sanity.io/docs/studio/previews-list-views) has a
section titled "Preview using fields from referenced documents" showing dot
notation across a reference. `bottle` now previews its wine directly. Only
single-hop resolution is documented, so nothing here depends on two hops
through to `wine.producer.name`.

### 2026-09-23, Stage 4a

The review workflow met the Studio, and the projection fields were declared for
the first time. Three changes, two of them errors in this document, all
recorded in ADR 0012.

**Spec error: `wine.derived.cellarState` does not exist and cannot.** It was
listed with the note "See the state machine in the temporal spec". That state
machine is `state(bottle, T)` and is defined per bottle. A wine holds bottles
in several states at once — three CONSUMED and three PAST_WINDOW on the same
day, for the wine used in the Stage 4 tests — and no rule anywhere collapses
them into one value. The field is removed. `bottle.derived.status` carries
state at the level where it is defined.

**Spec error: the projection invariant named two inputs and needs three.**
"Every projection field is reproducible from events and claims alone" is not
true of anything that reads a clock, and both `bottle.derived.status` and the
three `wine.derived.window*` fields do. A bottle reading HOLD today reads
DRINKING on 1 January with no event, no new claim, and nothing to trigger a
recomputation, because Functions fire on document events and the passage of
time is not one. Both projections now carry `derived.asOf`, and the invariant
names the date as an input rather than pretending it isn't one.

**`derivedFrom` was described as where the agent records its provenance.** It
is not, and it cannot be: 38 of the 161 seeded assessments carry it, all
hand-written from notes the owner had already read. `sourceMethod` is added to
distinguish them. The field table's description of `derivedFrom` is corrected
to say what it actually records — which note a claim came from, not who read
it.

The refinements:

- **`reviewState` and `sourceMethod` are `readOnly` in the Studio form.** The
  Accept and Reject document actions are the only path through the workflow,
  which is what makes it modelled rather than decorated. Neither setting is
  enforcement: this document's own "Validation runs in Studio only" section is
  the reason, and it is the same reason the import writes `reviewState`
  explicitly. Verified in the installed types rather than assumed —
  `OperationsAPI['patch']` declares no disabled reasons of its own, where
  `publish` enumerates five.
- **A Studio-authored assessment is born `accepted` and cannot be demoted.**
  A consequence of `readOnly` plus ADR 0011 defining two transitions, both out
  of `proposed`. Accepted deliberately: the workflow exists for proposals.
- **The seed builder emits `sourceMethod: 'authored'` explicitly**, for the
  same reason it emits `reviewState: 'accepted'` explicitly. `initialValue`
  does not fire on import. Absence would be read correctly anyway, but a
  re-import should state the fact rather than lean on a default that never
  runs.
- **`wineDerived` and `bottleDerived` are registered top-level object types**,
  not inline anonymous ones, for the reason `varietal` already established:
  the Studio accepts an anonymous object and `sanity graphql deploy` does not.

