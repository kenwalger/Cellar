## 28 September 2026 - Session 13

Start : 06:23 AM

### The asOf date field fought the typist

Prompt: 

```text
The asOf date input has a bug. Typing a date left to right works for month
and day, but as soon as the year is being typed the control jumps to
01/01/1996 and the field has to be finished with the picker or the slider.

Diagnose it before proposing a fix, and say what is actually happening
rather than what probably is. I expect onChange fires per keystroke and a
partial year clamps to ASOF_FLOOR, but confirm that rather than assuming it.

Then propose a fix that keeps the typed value local until it parses to a
complete in-range date, or commits on blur and Enter, whichever you can
argue for. The slider must stay in sync either way, and typing a date
outside the 1996 to 2042 domain should do something legible rather than
silently snapping.

Add a test in app/test for whatever the fix is. The existing date tests are
in dates.test.mts.

This is on the critical path: the demo video types 2023-12-31 into this
field on camera.

Standing rules apply. Friction log entries go to
docs/friction-logs/session13.md.
```
Findings:

My hypothesis was wrong in the half that mattered, and the correction is better than the guess. A native date input never emits partial text; it emits a complete, well-formed date with the year zero-padded, so typing 2023 produces 0002-12-31, 0020-12-31, 0202-12-31. Those are real dates that pass every validity check, get clamped to the floor, and then React writes 1996 back over the edit.

Two things in that report are worth keeping for the writeup.

The suite asserted the bug, and passed. parseDateInput('1901-01-01') === ASOF_FLOOR tests something real; it just encodes a contract that was wrong. That's a third category alongside the ones you already have, and the sharpest of the three: an assertion about clamping reads as diligence, so it survives review better than a vacuous test would. A test can be correct, meaningful, non-redundant, and still be wrong.

Its rule is about your domain rather than about browsers. Distinguishing a keystroke from an answer by whether the year has four significant digits holds whatever any given input emits, which is why the fix doesn't depend on the behavior it couldn't observe. That's the right instinct given it has no browser.

Run its two checks before filming, since segment C types that exact date on camera.

Response: 

```text
Diagnosis — your hypothesis is half right, and the wrong half matters

  A native <input type="date"> never reports partial text. It reports a complete, well-formed date whose year is the digits typed so far, zero-padded to four. With month and day already in, typing 2023 emits 0002-12-31 → 0020-12-31 → 0202-12-31 → 2023-12-31.

  All four match /^\d{4}-\d{2}-\d{2}$/. All four are real dates. Run through the module rather than argued:
  
  input 0002-12-31  ->  parseDateInput = 1996-01-01   <-- CLAMPED TO FLOOR
  input 0020-12-31  ->  parseDateInput = 1996-01-01   <-- CLAMPED TO FLOOR
  input 0202-12-31  ->  parseDateInput = 1996-01-01   <-- CLAMPED TO FLOOR
  input 2023-12-31  ->  parseDateInput = 2023-12-31

  So: input emits 0002-12-31 → isIsoDate accepts → clampToRange snaps to the floor → onChange commits → and because the field is controlled, React writes 1996-01-01 back over the year you're typing. The round trip destroys the edit, which is why only the picker can finish it.

  The existing guard was written for a failure mode that doesn't occur. Its comment — "a date input reads '' mid-entry… ignore anything unusable" — is true in every clause and defends against partial strings, which this control never produces. The real intermediate values aren't unusable; they're perfectly
  good dates in the year 2.

  And the suite asserted the bug, passing: parseDateInput('1901-01-01') === ASOF_FLOOR. Not vacuous — it tests something real — but a test of a contract that was wrong, which survives review better, because an assertion about clamping reads as diligence.

  A second defect nobody reported: parseDateInput('2099-01-01') returns 2042-12-31. Typing past the ceiling moved the view silently. Same root cause — a date-or-null contract has nowhere to put "this is a real date and the answer is no."

  The fix

  readDateInput returns three cases instead of two: incomplete, commit, outOfRange.

  Keystroke is told from answer by the year having four significant digits. I chose that over a browser-behaviour rule deliberately: the domain is 1996–2042, so no reachable date has a year below 1000. That's a claim about the domain, not about browsers — so it holds whatever intermediate values any given
  input emits, and the fix doesn't depend on the pattern I observed. 1995 still earns a message, because someone can mean 1995.

  AsOfControl holds the raw text in state and renders draft ?? value. The value React writes back is the value the input already has, so there's no DOM write and the edit survives. In-range dates commit on the completing keystroke; out-of-range dates are held with a message naming both the date refused and
  the date shown, and clamp only on blur or Enter.

  Slider stays in sync: it reads the committed value throughout — sitting where the cellar actually is while a date is half-typed, catching up when it completes. Moving the slider or pressing Today abandons any pending draft.

  I went with commit-on-complete plus settle-on-blur/Enter rather than blur-only, because blur-only would break the demo differently: you'd type 2023-12-31, see nothing move, and have to tab away on camera.

  Verified by mutation

  Deleting the year threshold from the source:

  ┌───────────────────────────────────────────────────────────┬─────────┐
  │                           test                            │ result  │
  ├───────────────────────────────────────────────────────────┼─────────┤
  │ holds a year that is still being typed                    │ ✖ fails │
  ├───────────────────────────────────────────────────────────┼─────────┤
  │ separates a four-digit year from a year still being typed │ ✖ fails │
  └───────────────────────────────────────────────────────────┴─────────┘

  Restored with the file tools. The companion assertion is there for the session 8 reason — "nothing commits while typing" is satisfied by a reader that commits nothing, so it's paired with a test that every verification date does commit.

  124 app tests (was 119). Both builds, lint and format clean.

  One thing I could not check

  The keystroke sequence is the HTML serialization rule for a date input's value and matches Chrome and Firefox, but I did not observe it in a browser — there isn't one here. That uncertainty is confined to the diagnosis; the clamping half is proven against the module, and the fix holds any sub-four-digit
  year regardless of what the input emits.

  Worth one run before filming: npm run dev, type 2023-12-31 left to right, confirm the field keeps up and the counts land on Drink Soon 0/0, DRINKING 122. Then type 2099-01-01 and confirm you get the message rather than a silent jump.

  To stage: app/src/AsOfControl.tsx, app/src/App.css, app/src/dates.ts, app/test/dates.test.mts, docs/friction-logs/session13.md. Commit message in commit-message.txt.

✻ Sautéed for 6m 44s

```

End: 06:33 AM

### Style Guide Generation

Prompt: 

```text
Write docs/style-guide.md, derived from the code rather than proposed.

Read app/src/App.css and anything else carrying visual decisions, including
the favicon and the app icon.

Record what is actually there: every color with its hex and where it is
used, the type stack and sizes, spacing, the table and row treatment, and
anything relying on a Studio or Dashboard theme variable rather than a value
of its own. Note where the two surfaces, the App SDK build and the public
build, differ.

Then, separately and clearly marked as not yet true: the palette below,
which is from another project of mine and which I am considering for the
demo video's title and end cards. Say which of the existing colors it
conflicts with, and what would have to change if I aligned the app to it.

Garnet #6E1A2B, Oxblood #4A1220, Cream #F4EFE2, Oak #8A6A44, Ink #1C1815

Do not change any styling. This is a description plus an assessment.
```

Response:

```text
docs/style-guide.md written. Nothing styled changed — the only App.css diff is session 13's .asof-notice block, still uncommitted.

  Part One, a few things worth surfacing

  Every colour is a token. There isn't a single raw hex in any component rule — only the seven tokens, declared twice. So the table in the guide is the complete inventory, not a summary.

  1.0625rem (17px) does double duty as both heading size and body-row size. That's why headings sit back through weight (500) and --muted rather than through scale.                                                                                    

  Two decisions are made for the camera, and both say so in their own comments: tabular numerals so the date doesn't jitter as the slider moves, and table-layout: fixed so a count going 4 → 166 can't shift every row sideways mid-drag.

  The theme finding is the one I'd flag. The app imports no Sanity theming at all — no @sanity/ui, no ThemeProvider, no theme hook. The App SDK build renders inside the Dashboard iframe but takes light/dark from prefers-color-scheme, which is the OS, not the Dashboard. A viewer with a dark Dashboard and a
  light OS gets a light cellar inside dark chrome, and nothing watches for it.

  Only three things are genuinely delegated: form-control chrome (color-scheme: light dark), the slider tint (accent-color), and app/icon.svg — the only asset with no colour of its own, because it fills with currentColor.

  The surfaces differ in exactly two visible ways: the tab icon (SDK build gets Sanity's generated default on #0B0B0B; public build gets ours in #7a1f3d) and the surrounding chrome. Everything inside .app-container is identical.

  Part Two — measured, and the answer is narrower than expected

  One genuine conflict: Garnet #6E1A2B vs --accent #7a1f3d — contrast ratio 1.13 between them. That's the same colour. It's the worst available distance: visible on a hard cut from title card to screen recording, close enough that nobody reads it as deliberate.

  It's also the cheapest to fix. Garnet on Cream is 9.91; the current accent on white is 10.04. The swap is contrast-neutral.

  The rest doesn't drop in:

  - Oak #8A6A44 on Cream is 4.33 — below the 4.5 normal-text threshold. The token it would naturally replace is --muted, which carries the 13px provenance lines on every row of two views. That's disqualifying for text; it's fine as a hairline.
  - Cream takes --rule with it. #e0e0e0 is a neutral grey that reads cold on a warm ground, and the palette has no replacement.
  - Oxblood has no role in the interface — at 13.08 on Cream it's a text weight, and nothing needs two wine reds.
  - Ink vs --fg is 1.01. Functionally identical; a free swap that changes nothing visible.

  Two things the palette can't solve. Against the existing dark background, Garnet reads 1.62, Oxblood 1.23, Oak 3.71 — three of five are invisible. It's a light-mode palette applied to an app with both schemes, and --accent already exists in two unrelated versions for exactly that reason. And there's no
  green, so --ok would belong to no system, on the one element whose job is to say the arithmetic agrees.

  Recommendation, from the numbers rather than taste: align the accent, leave the rest. Garnet is the only value whose near-miss will actually show in the cut. Everything else either duplicates what's there to within 1.01 or asks the interface to invent colours the palette doesn't contain — a warm hairline,
  a warm grey that passes AA at 13px, a green, and a whole dark scheme.

  To stage: docs/style-guide.md. Commit message in commit-message.txt.

  Note docs/submission-checklist.md also shows as modified — that's yours, not mine, so I've left it out of the stage list.

✻ Brewed for 3m 52s
```

Findings:

End:


### Prompt 4b

```text
Stage 4b: the Agent Action. The Function is cut, and that decision needs
recording.

Read CLAUDE.md, ADR 0008, ADR 0011, ADR 0012, docs/content-model.md, and
docs/friction-logs/session9.md, which contains a full proposal for this work
from a previous session. You are a fresh session and did not write it.
Reconstruct it from the repo and the logs rather than trusting it, and say
what you would change now.

Verify the current Agent Actions documentation through the MCP server. It is
marked experimental on every page, and this project has repeatedly found
vendor guidance drifting from shipped tooling.

Do not write code yet.

Part 1: the cut.

The recompute-wine Function is not being built. Propose how to record it,
including whether the derived fields and the derived object type should be
removed from the schema rather than left declared and empty on 640
documents. Amend ADR 0012 rather than rewriting it. Say what else in the
repo assumes those fields exist.

Part 2: what the cut costs, recorded honestly.

The reasoning is not only "the cache is unnecessary". Three things belong in
the amendment:

  a. A projection is a cache, and the cached computation is 0.07 ms for all
     542 bottles. Measured in session 4.
  b. A projection cannot answer the temporal question at all. A stored state
     is true as of one date, which is why ADR 0012 required derived.asOf.
  c. A projection is also what makes state queryable, and session 7
     established that GROQ cannot express authority-then-recency resolution.
     That is why polish items 5 and 6 are blocked on this Function, and it is
     a reason that applies now rather than at scale.

Also record what breaks first at scale, and correct me if I have this wrong:
the linear scan is roughly 200 ms at 1.5 million bottles, but CELLAR_QUERY
fetching the whole ledger into the browser fails long before that, so the
answer at scale is a scoped query rather than a projection.

Part 3: the Agent Action. Propose, then stop:

1. Where it is invoked from and what it is given. The earlier proposal argued
   for a document action on consumption rather than a publish trigger, and
   for withholding the currently resolved window from the model. Confirm or
   revise both.
2. Which fields the system fixes and which the model fills. Confirm the
   assessedAt convention of consumption date plus one day, and restate why it
   matters.
3. Whether a schema deploy is required. The docs contradict themselves about
   whether Prompt needs schemaId. A schema deploy is a production write and
   needs my approval separately.
4. Testing. Staging first, and a dry-run script that prints the document it
   would create without writing it.
5. Verification of non-deterministic output. Separate what is mechanically
   assertable from what can only be judged by reading, and propose the fixed
   rubric over real notes.
6. Cost. AI credits per invocation, and what bounds them.

Nothing writes to production without my explicit approval, including the
schema deploy.

Standing rules: no git commands that change the repo, write the commit
message and tell me what to stage. Friction log entries go to
docs/friction-logs/session13.md.
```
---

#### The bug

Typing a date into the asOf field works for month and day. The moment the year
is being typed the control jumps to 01/01/1996 and the field has to be finished
with the picker or the slider.

This is on the critical path: the demo video types `2023-12-31` into it on
camera.


#### What is actually happening, which is not what it looks like

The expectation going in was that `onChange` fires per keystroke and a partial
year clamps to `ASOF_FLOOR`. Half right, and the wrong half is the interesting
one.

**A native `<input type="date">` never reports partial text.** It reports a
complete, well-formed date whose year is whatever digits have been typed so
far, zero-padded to four. With month and day already entered, typing 2023 into
the year emits, in order:

```
0002-12-31
0020-12-31
0202-12-31
2023-12-31
```

All four match `/^\d{4}-\d{2}-\d{2}$/`. All four are real dates. Confirmed
against the module rather than argued:

```
input 0002-12-31  ->  parseDateInput = 1996-01-01   <-- CLAMPED TO FLOOR
input 0020-12-31  ->  parseDateInput = 1996-01-01   <-- CLAMPED TO FLOOR
input 0202-12-31  ->  parseDateInput = 1996-01-01   <-- CLAMPED TO FLOOR
input 2023-12-31  ->  parseDateInput = 2023-12-31
```

So the sequence is: the input emits `0002-12-31`, `isIsoDate` accepts it,
`clampToRange` snaps it to `1996-01-01`, `onChange` commits it, and React —
because the field is **controlled** — writes `1996-01-01` back over the year
being typed. The edit is destroyed by the round trip, which is why finishing by
hand is impossible and the picker is the only way out.

**The guard that exists was written for a failure mode that does not occur.**
The comment on it reads: "A date input reads `''` mid-entry and can hold an
out-of-range value even with min and max set. Ignore anything unusable rather
than snapping the view to a half-typed year." Every clause is true, the
reasoning is sound, and it defends against partial *strings* — which the
control never produces. The real intermediate values are not unusable. They are
perfectly usable dates that happen to be in the year 2.

That is the shape worth keeping: a guard can be correct, well-commented, and
aimed at the wrong thing, and nothing about reading it reveals which. It took
running the values through it.

#### The test that asserted the bug

`dates.test.mts` carried this, passing:

```ts
it('clamps out-of-range dates to the slider domain', () => {
  assert.equal(parseDateInput('1901-01-01'), ASOF_FLOOR)
  assert.equal(parseDateInput('2099-01-01'), ASOF_CEILING)
})
```

The behaviour that breaks typing is exactly the behaviour under test, and the
suite locked it in. Not a vacuous test — it tests something real — but a test
of a contract that was wrong, which is the failure mode that survives review
better, because a green assertion about clamping looks like diligence.

The clamp itself is not the bug. Doing it on every keystroke and writing the
result back into the field is.

#### The second half, which nobody reported

`parseDateInput('2099-01-01')` returns `2042-12-31`. Typing a date past the
ceiling moves the view to the ceiling with nothing on screen to say so. Nobody
filed it because nobody types 2099, but it is the same defect: a two-valued
contract, date-or-null, has nowhere to put "this is a real date and the answer
is no", so a refusal and an acceptance came out looking identical.

#### The fix

`readDateInput` replaces `parseDateInput` and returns three cases instead of
two: `incomplete`, `commit`, `outOfRange`. The third is the one the old
contract could not express.

The distinction between a keystroke and an answer is drawn on the year having
four significant digits. The domain runs 1996 to 2042, so no date the control
can reach has a year below 1000; a sub-1000 year is never something a person is
asking for. That is a claim about the domain rather than about browsers, which
matters — it holds whatever intermediate values a given input chooses to emit,
so the fix does not depend on the emission pattern that was observed. 1995
still earns a message, because 1995 is a year someone can mean.

The component keeps the raw text in `useState` while it is being edited and
renders `draft ?? value`. Because the value React writes back is the value the
input already has, there is no DOM write and the edit survives. An in-range
date commits on the keystroke that completes it; an out-of-range one is held,
shown with a message naming both the date refused and the date that would be
shown, and clamped only on blur or Enter.

The slider reads the committed value throughout, so it sits where the cellar
actually is while a date is half-typed, and catches up on the keystroke that
finishes it.

#### Verified by mutation

The regression test was not trusted on the strength of reading it. With the
year threshold deleted from the source:

| test | result |
| --- | --- |
| holds a year that is still being typed | ✖ fails |
| separates a four-digit year from a year still being typed | ✖ fails |

Restored with the file tools, per the rule added in session 8. 124 app tests,
up from 119.

The companion assertion is there too, for the reason session 8 established:
"nothing is committed while typing" is satisfied by a reader that commits
nothing at all, so it is paired with a test that every verification date *does*
commit on the keystroke that completes it.

#### What could not be checked here

The keystroke sequence above is the HTML serialization rule for a date input's
value — the year component is zero-padded to four digits — and matches how
Chrome and Firefox behave. It was not observed in a browser during this
session, because there is no browser here.

That uncertainty is confined to the diagnosis, not the fix. The clamping half
is proven against the module, and the fix is built so that any intermediate
value with fewer than four significant year digits is held rather than
committed, whatever the input emits. The remaining confirmation is one run of
the dev server, typing `2023-12-31` left to right.

End:
