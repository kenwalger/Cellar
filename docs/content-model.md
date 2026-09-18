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
| `title` | string | Display name, for example "2018 Cristom Louise Vineyard Pinot Noir" |
| `producer` | reference to `producer` | Required |
| `cuvee` | string | Vineyard or bottling name |
| `vintageYear` | number | Required. Range 1900 to current year. |
| `appellation` | string | |
| `varietals` | array of object | `{ grape: string, percentage: number }` |
| `color` | string | red, white, rose, sparkling, fortified |
| `notes` | text | |

Projection fields, maintained by Function, never edited by hand:

| Field | Type | Notes |
| --- | --- | --- |
| `_bottlesOnHand` | number | |
| `_bottlesConsumed` | number | |
| `_windowFrom` | date | Resolved window, as of now |
| `_windowUntil` | date | |
| `_windowSourceType` | string | Which authority tier won |
| `_cellarState` | string | See the state machine in the temporal spec |

Underscore prefix is a naming convention signalling derived data. Confirm
Sanity permits it on custom fields before adopting; if not, use a `derived`
object wrapper.

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

Projection field:

| Field | Type | Notes |
| --- | --- | --- |
| `_status` | string | Current state. Cache of `state(bottle, now)`. |

Note there is no `acquiredAt` and no `consumedAt`. That absence is the design.

## acquisition

| Field | Type | Notes |
| --- | --- | --- |
| `bottle` | reference to `bottle` | Required |
| `acquiredAt` | date | Required. Must not be in the future. |
| `source` | string | Merchant, winery, gift, auction |
| `sourceType` | string | retail, winery, auction, gift, trade |
| `price` | number | Optional |
| `currency` | string | Default USD |

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
| `drinkUntil` | date | Required. Must be after `drinkFrom`. |
| `confidence` | string | low, medium, high |
| `notes` | text | |
| `derivedFrom` | reference to `consumption` | Optional. Set when an assessment was extracted from a tasting note. |
| `reviewState` | string | proposed, accepted, rejected. Required. Default accepted for hand-authored, proposed for agent-created. See ADR 0011. |

`derivedFrom` closes the feedback loop. You open a bottle, write a note, and
that note becomes a new claim that changes the window on the bottles still in
the rack. It is also where the Agent Action output records its own provenance.

## Validation rules

Rules Sanity can enforce inside a document:

0. `assessment.reviewState` is one of the three permitted values, and an
   assessment with `derivedFrom` set was created as `proposed`.
1. `assessment.drinkUntil` is after `assessment.drinkFrom`.
2. No `assessedAt`, `acquiredAt`, or `consumedAt` in the future.
3. `wine.varietals` percentages sum to 100 when more than one is present.
4. Required references are present.

Rules Sanity cannot enforce across documents, and which therefore become
Function checks or dataset health warnings:

5. Every bottle has exactly one acquisition.
6. Every bottle has at most one consumption.
7. No consumption predates its bottle's acquisition.

Rule 5 through 7 violations should surface in Studio rather than being
silently tolerated, because they are the cases that produce nonsense in the
asOf views. A dataset health document listing current violations is the
cheapest way to show them, and it doubles as a nod at the content-governance
theme in the article.

## Invariants worth stating out loud

- A bottle's entire life is: acquired, optionally consumed. There is no
  intermediate mutable state.
- The set of assessments only ever grows. Nothing overwrites a window.
- Every projection field is reproducible from events and claims alone. If a
  projection cannot be recomputed from scratch, it is a bug in the model, not
  in the Function.

That last one is the test to run against any field added later.

## Deliberately out of scope for V1

Cellar location hierarchy, bottle movement between locations, ownership
transfer, purchase lots, bottle condition over time, multiple cellars, users
and permissions. Each of these would be another event type and none of them
earns its keep in a two week build.
