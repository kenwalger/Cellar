# Remaining work

Date: 2026-09-25. Deadline: 4 October, 11:59pm PDT. Nine days.

## Status

Done: Stages 1, 2, 3, and 4a. App deployed. Public page live at
`kenwalger.github.io/Cellar/`. Submission draft v5 with three TODOs.

Not done: Stage 4b, Stage 5 polish, the video, screenshots, the agent
session upload.

---

## What 4b is

The AI half of Stage 4, and the only remaining build work.

**The Agent Action.** A document action on `consumption` labelled something
like "Propose a drinking window". It sends the tasting note, the consumption
date, and the wine's display name and vintage to Sanity's `prompt` API, and
writes the result as an `assessment` with `reviewState: 'proposed'`,
`sourceMethod: 'extracted'`, `derivedFrom` pointing at the consumption, and
`assessedAt` set to the day after it. It abstains and writes nothing when the
note carries no temporal signal, which is about a third of the distinct notes
in the dataset.

**The `recompute-wine` Function.** Triggers on create or update of
`assessment`, `acquisition` and `consumption`, resolves the affected wine,
and patches the `derived` fields on that wine and every one of its bottles.
Those fields are currently declared and empty on all 640 documents.

**Is it cuttable?** Yes, and this is a real decision.

Arguments for cutting: the Workflows bonus is already satisfied by 4a. The
App never reads the projections, so nothing visible breaks without the
Function. The submission draft does not currently promise either. Nine days
is comfortable but the writing is not done.

Arguments against cutting: it is the only place an agent appears in a
project whose review workflow exists to govern agent proposals, and the
review queue currently has nothing that arrives in it by itself. The
`sourceMethod: extracted` field, argued for in ADR 0012, is never exercised
by an actual extraction. And polish items 5, 6 and 9 are blocked on the
Function.

**Recommendation:** do the Agent Action, cut the Function. The action is the
demo and takes one session. The Function populates fields nothing reads, and
its absence is honestly explainable as a scope decision. If the Function is
cut, take polish item 9 (a description on the empty `derived` panel) so it
does not read as unfinished.

---

## Artifacts to produce

### Screenshots

All from the **public page** unless noted, so the masthead carries no
`dataset` badge. Capture at a consistent window width.

| # | What | Where | Why it earns a place |
| --- | --- | --- | --- |
| 1 | Cellar health at 1 June 1999 | public page | 4 bottles, 536 not yet acquired. The opener. |
| 2 | Cellar health at today | public page | 248 bottles. The pair to 1. |
| 3 | Projection to 2035 | public page | 182 past window, with the assumption line visible |
| 4 | Drink Soon at today | public page | 23 bottles, provenance lines naming personal and producer claims |
| 5 | Missed Opportunities at 31 Dec 2023 | public page | 17 bottles across 9 wines, the oracle number reached through the control |
| 6 | The explanatory empty state at 31 Dec 2019 | public page | 47 at peak, 32 since opened, nothing lost |
| 7 | The review queue with items waiting | Studio, staging | The Workflows surface |
| 8 | An assessment document | Studio | Read-only review state, source method, the provenance fields |
| 9 | The Mouton's assessment chain | Studio or Vision | Thirty years of claims on one wine |

1, 2 and 4 are the ones the post cannot do without. 3 is the one people
react to.

### Video, target three minutes

Two sources. The staging run from this morning is roughly 50 minutes and
contains the only footage of the workflow that exists. Everything else is
cleaner to re-record against the public page.

**Segment A, the opener (about 40 seconds). Re-record.**
Public page at today's date. Drag the slider slowly back to 1999, pause on
four bottles. Drag forward to today. Drag into 2035, pause on 182 past
window. No clicking, no menus, just the numbers moving.

**Segment B, provenance (about 30 seconds). Re-record.**
Drink Soon at today. Scroll the twelve rows so the provenance lines are
readable. Hold on two rows where the tier differs, one personal, one
producer.

**Segment C, regret (about 30 seconds). Re-record.**
Type 2023-12-31 into the date field. Missed Opportunities shows 17 across 9
wines. Then 2019-12-31 for the explanatory empty state. That contrast is the
strongest argument in the application.

**Segment D, the workflow (about 60 seconds). Cut from this morning.**
This is the part that cannot be re-shot without rebuilding staging. The clips
to find:

1. The review queue showing two items awaiting review
2. Cellar health before, with DRINKING at 166
3. The Accept click on the Rosé claim
4. Cellar health after, DRINKING at 161, PAST_WINDOW at 38
5. The Rosé's row gone from Drink Soon
6. Optionally the rejected document, still present, reading `rejected`

Expect these to be six clips of five to fifteen seconds each out of fifty
minutes. Everything between them is imports, server restarts and `cd`.

**Segment E, the close (about 20 seconds).**
The Mouton in Studio or Vision, its assessment chain visible. Or the 1999
view again, if a bookend reads better than a new idea.

**Notes on the edit.** Segment D footage carries a `dataset: staging` badge.
Leave it in and add a callout saying so. It shows writes being tested
somewhere safe, which is a small credibility win rather than a blemish.

Record silent throughout, voice over the edit. Pace the voiceover to the
numbers rather than the other way round.

### The agent session

Six JSONL files, about 9 MB, covering all sessions. Half are filed under
`C:\Users\kenal` rather than `C:\Users\kenal\Cellar`, because Claude Code
keys its cache by working directory and the project moved on the 23rd.

Curate rather than upload everything. The candidates, in order:

1. The Stage 1 conflict pass, where ten findings came back before any code
2. The Functions bundling probe, with the predetermined expected result
3. The vacuous test audit
4. The App SDK auth enumeration

Check for keys before uploading, and set it public, or judges cannot open it.

---

## Polish, in order

From `docs/stage-5-polish.md`, adjusted for what checking the code found.

| Item | Cost | Do it? | Completed |
| --- | ---: | --- | :-: |
| Bottle list preview showing the producer | 15 min | Yes. It is a defect, not polish: 542 rows collapse to 70 labels | |
| Counts beside the review queue lists | 20 to 40 min | Yes. Screenshot 7 sits on it | |
| App icon for the Dashboard entry | 15 to 30 min | Yes. One line plus an SVG | X | 
| Save `deployment.appId` to `app/sanity.cli.ts` | 2 min | Yes, and not optional. Without it a later deploy creates a second app | X |
| App tab title and favicon | 10 min | Yes. It is in every screenshot | |
| Description on the empty `derived` panel | 20 min | Only if the Function is cut | |
| Structure organized by ledger facts | 45 min | If time | | 
| Drinking-window bar input | 2 to 4 h | No. Cut, as the polish doc argues | |

Document type icons and previews turned out to be already done.

---

## Suggested order

**Monday.** 4b Agent Action. One session, proposal first as usual.

**Tuesday.** Polish items 1 through 5 above, roughly 90 minutes. Then
screenshots, all nine, in one sitting at a consistent width.

**Wednesday.** Re-record segments A, B, C and E. Pull the six clips from the
staging footage. Rough assembly.

**Thursday.** Voiceover and final edit. Agent session curation and upload.

**Friday.** Submission post: drop in the screenshots, the video, the agent
session, and update the Build Process section with whatever 4b produced.

**Saturday 3 October.** Reserve. Publish.

That leaves the 4th untouched, which is where it should be.
