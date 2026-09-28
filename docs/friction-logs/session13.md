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

The contrast finding is the useful part. Your accent is
#7a1f3d and garnet is
#6E1A2B, a ratio of 1.13, which is the worst possible distance: different enough to see on a hard cut, close enough that nobody reads it as intentional. You said move the card, and the numbers agree, since garnet on cream is 9.91 against your current 10.04 on white. Contrast-neutral swap for the cards, and leave the app alone.

End: 06:48 AM

### Prompt 4b

Start: 06:52 AM

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
docs/friction-logs/session13.md add too that document, don't overwrite.
```
Response:

```text
No code written. ADR 0012 amended in place, session 13's log appended to.

  Two things to correct before the rest

  The schemaId contradiction is resolved, and it removes a production write from the plan. Both pages are still live and still disagree verbatim. But PromptRequestBase in @sanity/client 8.6.2 declares exactly four members — instruction, instructionParams?, temperature?, format — and schemaId appears zero 
  times in it, while being required on the other action types four times in the same file.
  
  So the troubleshooting page isn't just wrong, it's backwards: "omitting it is only a TypeScript error locally" describes the opposite of the shipped type. No schema deploy is needed for Stage 4b. It sat on the plan for five days as a production write awaiting your approval, to be robust against a
  contradiction the type file settles in a minute.

  Your premise (c) needs correcting. It's not in session 7, it's in docs/temporal-resolution.md, and it says expressing authority-tiered resolution in GROQ is "possible and unreadable, and it would need rewriting the first time a tier is added." Not impossible. That changes the argument from capability to
  duplication — a second implementation of the load-bearing rule, in a second language, where the tests don't reach. Still real, still blocks polish 5 and 6, but it's a maintainability argument and the amendment states it that way.

  Part 1 and 2 — recorded

  Cut, and the fields removed rather than left empty. The removal is free: no Function ever ran, so no document has a derived key. No migration, no test breaks, the App never read them, and with no schema deployed it isn't a production write.

  What else assumes they exist: studio/schemaTypes/derived.ts (whole file), the derived field on wine.ts and bottle.ts, the import and header comment in index.ts, four passages in content-model.md, the Stage 4 line in build-plan.md, polish items 5 and 6, and the orphaned sanity.blueprint.ts +
  functions/cellar-core-probe/. Nothing in app/, packages/cellar-core/, or any test.

  Your scale reading is right, and now quantified. Measured against production today: 1,637 docs, 211.9 KB, ~400 bytes/bottle.

  ┌──────────────────────┬──────────┬─────────┬──────────────┐
  │                      │  Today   │  ×100   │ 1.5M bottles │
  ├──────────────────────┼──────────┼─────────┼──────────────┤
  │ CELLAR_QUERY payload │ 211.9 KB │ 20.7 MB │     572.6 MB │
  ├──────────────────────┼──────────┼─────────┼──────────────┤
  │ Full state tally     │  0.07 ms │   ~7 ms │      ~200 ms │
  └──────────────────────┴──────────┴─────────┴──────────────┘

  The fetch becomes impractical near 20 MB — around 50,000 bottles, two orders of magnitude before the scan matters. And a projection wouldn't have helped with the half that breaks. WINE_SCOPED_QUERY already exists, so the scale answer was in the codebase before the Function was proposed.

  Part 3 — the proposal

  1. Invocation: confirm both, and the first is now forced. Document action on consumption, labelled "Propose a drinking window"; disabled when there's no tastingNote or a proposal already exists. A publish trigger would need a Function, and Functions are what we just cut — so the document action is the
  only option that doesn't reinstate the cut. It also spends credits per click rather than on all 240 noted consumptions.

  Withholding the resolved window: confirm, with an added reason. An assessment is an independent claim, and handing the model the window it might replace invites copying. It also makes the rubric meaningful — shown the incumbent, you couldn't tell extraction from mimicry.

  It's given: the tasting note, the consumption date, the wine's display name and vintage year.

  2. Fields. System fixes wine (from bottle→wine), derivedFrom (the consumption), reviewState: 'proposed', sourceType: 'personal', sourceName: 'me', sourceMethod: 'extracted', and assessedAt. Model fills supportsWindow, drinkFromYear, drinkUntilYear, confidence, notes.

  assessedAt = consumedAt + 1 day: confirm. Resolution is assessedAt <= T and a verdict resolves the window as of consumedAt. Dated the same day, the claim would be visible to the verdict on the very bottle its note came from — the verdict would agree with the note because it is the note, and the check
  becomes a restatement. Dated the day after, it's invisible to that bottle and visible to every one opened later, which is what "open a bottle, write a note, and it changes the window on the bottles still in the rack" actually means. All 38 seeded derivedFrom assessments already do this.

  3. Schema deploy: not required. See above. Still needed: an authenticated client at apiVersion: 'vX'. Whether the Studio's useClient() session token carries agent-action authorisation is the one thing I'd verify before building rather than assume — the docs describe a SANITY_API_TOKEN, and a Studio
  document action has a user session instead.

  4. Testing. Staging first, as in session 8. A dry-run script modelled on the existing seed-proposed-assessment.mts — which already validates against the rules the Content Lake won't apply and prints the write command rather than writing. Prompt performs no writes by construction, so tuning the instruction
  against real notes costs credits and nothing else.

  5. Verification. Mechanically assertable on any output: reviewState === 'proposed'; both references resolve to the expected documents; sourceType/sourceName/sourceMethod literals; assessedAt === consumedAt + 1 day; drinkFrom ends -01-01 and drinkUntil ends -12-31; drinkUntil >= drinkFrom; years in range;
  confidence in the enum or absent; abstention writes no document at all; and adding the result to the cellar moves no count.

  Judgement only: whether the window is plausible, whether notes quotes the right phrase, whether confidence is honest, and where the abstain line falls on borderline notes.

  The rubric makes most of that mechanical: ~12 of the 38 distinct notes across four categories, with the direction asserted even when the years aren't — past-peak closes before the consumption year, at-peak contains it, too-young opens after it, no-signal abstains. Runs from the dry-run script against the
  live API, never in CI.

  6. Cost. 1 AI credit per Agent Action request, $0.05. Every organisation gets a free monthly allowance. Bounded by clicks, because there's no automatic trigger — the strongest practical argument for the document action. The full 12-note rubric is 12 credits, $0.60. A monthly spending cap is settable in
  Manage under Settings → Spending limits.

  To stage: docs/ADRs/0012-projections-carry-their-date-claims-carry-their-method.md, docs/friction-logs/session13.md. Commit message in commit-message.txt.

  Stopping here for approval. Nothing writes to production, and the schema deploy is no longer on the list at all.

✻ Cogitated for 5m 13s

```
Findings:

Two corrections in there worth having, and one of them removes a production write from the plan.

The schemaId contradiction is settled by the type file. Both doc pages are still live and still disagree, but PromptRequestBase in the installed client declares four members and schemaId isn't one, while it's required four times on the other action types in the same file. So the troubleshooting page isn't just wrong, it's backwards. A schema deploy sat on the plan for five days as a production write awaiting your approval, against a contradiction the .d.ts resolves in a minute. That's the same pattern as the App SDK auth enumeration and the Functions bundling probe: the answer was in the installed packages the whole time.

My premise (c) was wrong and it correctly narrowed it. I said GROQ cannot express authority-then-recency. The spec says it's possible and unreadable, and would need rewriting whenever a tier is added. That changes the argument from capability to duplication: a second implementation of the load-bearing rule, in a second language, where your tests don't reach. Still a real reason to want projections, and a weaker one than I gave you. Worth fixing in the submission draft, since v6's cut section leans on my version.

The scale numbers are also better quantified than my estimate. The fetch becomes impractical around 50,000 bottles, two orders of magnitude before the scan matters, and WINE_SCOPED_QUERY already existed.

Prompt:

```text
Approved. Build it.

One thing to verify before writing the action, not assume: whether the
Studio's useClient() session token carries agent-action authorisation. You
flagged it; settle it first, and if it does not, stop and tell me rather
than reaching for a token.

Two corrections go into the submission draft as well as the ADR, so remind
me at the end: the schemaId resolution, and that the GROQ argument is
duplication rather than impossibility.

Everything else as proposed. Staging first, dry run against real notes
before any write, and the twelve-note rubric.
```

Response:

```text
Built. Nothing written to any dataset.

  The auth question — settled before writing code, and it removed a second production write

  The evidence chain had three links and the first two were discouraging. The HTTP reference says "All endpoints require: BearerAuth", so cookie auth is out. And the Studio does support cookie auth — loginMethod appears 86 times in the built package with 'cookie'/'token'/'dual' branches — so "logged in"
  didn't settle it.
  
  The answer is in the AI Assist custom field actions guide, which isn't a page about authentication. It shows the pattern twice, in complete examples:

  const client = useClient({apiVersion: 'vX'})
  await client.agent.action.transform({ … })

  No token anywhere. So yes — the Studio session carries it, and I proceeded.

  Two things about that: the authoritative page stated the constraint that made the question hard and said nothing about which clients satisfy it, while the page that answers does so by example, with no sentence anywhere saying "the Studio session authorises Agent Actions." And that page carries a "paid
  feature — Growth plan" banner that applies to AI Assist's plugin mechanism, not to what I copied from it. The real gate is org-level.

  Combined with the schemaId finding, Stage 4b now needs zero production writes. Both had been scheduled as prudence against docs that were wrong in one case and silent in the other.

  What was built

  studio/lib/agentProposal.ts holds everything deterministic — instruction, validation, document assembly, checks — with no React, no client, no network. Four callers share it: the document action, the dry run, the rubric, and the tests.

  That's what turns the claims into assertions rather than comments:
  - "never creates an accepted assessment" → feeds the parser a reply containing reviewState: 'accepted' and checks it's discarded
  - "abstention writes nothing" → buildProposal throws rather than emitting empty bounds
  - "withholds the resolved window" → a regex against the built instruction

  Document action on consumption, useClient({apiVersion: 'vX'}), Prompt at temperature: 0, deterministic ids so a second run collides. The rubric asserts direction (past-peak closes before the opened year, etc.) because direction is checkable on a non-deterministic reply and years aren't — with six
  borderline notes deliberately excluded, since a judgement call in a rubric is just a failing test.

  One config gap: studio/tsconfig.json lacked allowImportingTsExtensions, which the app fixed in Stage 3. Nothing surfaced it because the studio's scripts only imported bare specifiers until now.

  407 core / 124 app / 35 studio tests. Studio typechecks, lints, formats, builds.

  Next, in order

  1. SANITY_API_TOKEN=… node studio/scripts/propose-window.mts con-farm-on-golden-hill-rose-2024-b staging — dry run, writes nothing
  2. node studio/scripts/rubric.mts — 12 credits, $0.60. Add --borderline for 6 more
  3. Then one real proposal in staging, and only then a conversation about production

  The two corrections for the submission draft

  You asked me to remind you — both are in ADR 0012 and the session 13 log, and both belong in the writeup:

  1. The schemaId contradiction is resolved, and the installed types resolved it. Session 8 concluded "one of them is wrong and reading more carefully will not reveal which." PromptRequestBase reveals which. The troubleshooting page isn't just wrong, it's backwards — omitting schemaId from a Prompt is
  correct, including it is the type error.
  2. The GROQ argument is duplication, not impossibility. docs/temporal-resolution.md says expressing authority-tiered resolution in GROQ is "possible and unreadable, and it would need rewriting the first time a tier is added." The draft's "GROQ cannot express it" overstates it, and the honest version is
  the better argument anyway: a second implementation of the load-bearing rule, in a second language, where the tests don't reach.

  To stage: the nine studio files plus the two docs — full list at the bottom of commit-message.txt.

✻ Brewed for 9m 15s

```

Findings:

Both production writes are gone, and neither was ever needed. The schema deploy was prudence against a doc page that turns out to be backwards, and the token was prudence against a page that states the constraint without saying which clients satisfy it. The answer to the second came from an AI Assist guide that demonstrates the pattern in a complete example without a sentence anywhere saying the Studio session authorises Agent Actions.

That detail is the sharpest documentation finding of the project. The authoritative page created the difficulty; the page that resolves it does so incidentally, by example, on a page about something else, under a plan banner that doesn't apply to the part being copied.

The structure it chose is also the right one. Putting everything deterministic in agentProposal.ts with no React, no client and no network means the claims in your writeup are assertions rather than assurances. "Never creates an accepted assessment" is now a test that feeds the parser a reply containing reviewState: 'accepted' and checks it's discarded. "Withholds the resolved window" is a regex against the built instruction. Those are the two claims a skeptical reader would most want evidence for.

Excluding the six borderline notes from the rubric is correct too: a judgement call in a rubric is a failing test with extra steps.

Next steps are its three, in order. The dry run costs nothing, the rubric costs 60 cents, and neither touches a dataset. Worth reading the twelve rubric outputs yourself rather than only the pass or fail, since how it words the abstentions is the part you'll quote in the post.

Commit before the dry run. Nine studio files plus two docs is a clean unit, and the dry run may produce edits to the instruction.

End: 07:17 AM


Dry Run

```text
Cellar on  main [⇡] via  v26.3.0 
❯ node studio\scripts\propose-window.mts con-farm-on-golden-hill-rose-2024-b staging
(node:14828) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kenal/Cellar/studio/lib/agentProposal.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kenal\Cellar\studio\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
This is an experimental API version
which will change without warning and may have serious bugs.
Dry run against staging. Nothing will be written.

  consumption  con-farm-on-golden-hill-rose-2024-b
  wine         2024 Farm on Golden Hill Rose
  opened       2025-07-07
  note         "Flat. Too old for a rose."

Model reply:
{
  "supportsWindow": true,
  "drinkFromYear": 2024,
  "drinkUntilYear": 2024,
  "confidence": "high",
  "notes": "The phrases \"Flat\" and \"Too old for a rose\" indicate that the drinking window closed before it was opened in 2025."
} 

Would create:

{
  "_id": "assess-agent-con-farm-on-golden-hill-rose-2024-b",
  "_type": "assessment",
  "wine": {
    "_type": "reference",
    "_ref": "farm-on-golden-hill-rose-2024"
  },
  "sourceType": "personal",
  "sourceName": "me",
  "assessedAt": "2025-07-08",
  "drinkFrom": "2024-01-01",
  "drinkUntil": "2024-12-31",
  "confidence": "high",
  "notes": "The phrases \"Flat\" and \"Too old for a rose\" indicate that the drinking window closed before it was opened in 2025.",
  "derivedFrom": {
    "_type": "reference",
    "_ref": "con-farm-on-golden-hill-rose-2024-b"
  },
  "sourceMethod": "extracted",
  "reviewState": "proposed"
}

  id            assess-agent-con-farm-on-golden-hill-rose-2024-b  (deterministic)
  assessedAt    2025-07-08  (the day after, deliberately)
  reviewState   proposed  (resolves nothing until accepted)

Nothing was written.

Cellar on  main [⇡] via  v26.3.0 took 3s 
❯ node studio\scripts\rubric.mts
(node:54852) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kenal/Cellar/studio/lib/agentProposal.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kenal\Cellar\studio\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Rubric: 12 notes, opened 2024-06-15, vintage 2019.
Direction is asserted. Years, notes and confidence are for reading.

This is an experimental API version
which will change without warning and may have serious bugs.
✔ closes-before  "Dried out. Held it too long."
            got closes-before  window 2019–2023
            confidence high
            says "The phrases "Dried out" and "Held it too long" indicate that the drinking window closed before it was opened in 2024."
            raw {"supportsWindow":true,"drinkFromYear":2019,"drinkUntilYear":2023,"confidence":"high","notes":"The phrases \"Dried out\" and \"Held it too long\" indicate that the drinking window closed before it was opened in 2024."}

✔ closes-before  "Flat. Too old for a rose."
            got closes-before  window 2019–2023
            confidence high
            says "The phrases "Flat" and "Too old for a rose" indicate that the wine was past its best when opened in 2024."
            raw {"supportsWindow":true,"drinkFromYear":2019,"drinkUntilYear":2023,"confidence":"high","notes":"The phrases \"Flat\" and \"Too old for a rose\" indicate that the wine was past its best when opened in 2024."}

✔ closes-before  "Should have listened to myself. Thin and drying. Three left."
            got closes-before  window 2019–2023
            confidence medium
            says "The phrases "Should have listened to myself" and "Thin and drying" indicate the wine was past its best when opened in 2024."
            raw {"supportsWindow":true,"drinkFromYear":2019,"drinkUntilYear":2023,"confidence":"medium","notes":"The phrases \"Should have listened to myself\" and \"Thin and drying\" indicate the wine was past its best when opened in 2024."}

✔ contains       "Much better. Blackberry, soft tannin. This is the peak."
            got contains       window 2024–2024
            confidence high
            says "The phrase "This is the peak" strongly indicates that the wine was at its best when opened in 2024."
            raw {"supportsWindow":true,"drinkFromYear":2024,"drinkUntilYear":2024,"confidence":"high","notes":"The phrase \"This is the peak\" strongly indicates that the wine was at its best when opened in 2024."}

✔ contains       "Silky. Drinking well right now."
            got contains       window 2024–2024
            confidence high
            says "The phrase "Drinking well right now" shows that the drinking window contains the 2024 opening year."
            raw {"supportsWindow":true,"drinkFromYear":2024,"drinkUntilYear":2024,"confidence":"high","notes":"The phrase \"Drinking well right now\" shows that the drinking window contains the 2024 opening year."}

✔ contains       "Great acid. Held up better than expected."
            got contains       window 2024–2024
            confidence medium
            says "The phrase "Held up better than expected" indicates that the wine was still drinking well when opened in 2024."
            raw {"supportsWindow":true,"drinkFromYear":2024,"drinkUntilYear":2024,"confidence":"medium","notes":"The phrase \"Held up better than expected\" indicates that the wine was still drinking well when opened in 2024."}

✔ opens-after    "Opened too young. Fruit is there, structure is not resolved."
            got opens-after    window 2025–2025
            confidence high
            says "The phrase "Opened too young" indicates that the drinking window opens after 2024."
            raw {"supportsWindow":true,"drinkFromYear":2025,"drinkUntilYear":2025,"confidence":"high","notes":"The phrase \"Opened too young\" indicates that the drinking window opens after 2024."}

✔ opens-after    "Structured. Could have waited another two years."
            got opens-after    window 2026–2026
            confidence medium
            says "The phrase "Could have waited another two years" indicates the window opens in 2026."
            raw {"supportsWindow":true,"drinkFromYear":2026,"drinkUntilYear":2026,"confidence":"medium","notes":"The phrase \"Could have waited another two years\" indicates the window opens in 2026."}

✔ opens-after    "Red cherry, forest floor, fine tannin. Still tight."
            got opens-after    window 2025–2025
            confidence medium
            says "The phrase "Still tight" indicates the wine was too young when opened in 2024."
            raw {"supportsWindow":true,"drinkFromYear":2025,"drinkUntilYear":2025,"confidence":"medium","notes":"The phrase \"Still tight\" indicates the wine was too young when opened in 2024."}

✔ abstain        "Pear and citrus. Crisp."
            got abstain        window —
            confidence —
            says "The note only describes flavours and texture and gives no signal about whether the wine was too young, drinking well, or past its best."
            raw {"supportsWindow":false,"notes":"The note only describes flavours and texture and gives no signal about whether the wine was too young, drinking well, or past its best."}

✔ abstain        "Needed a bottle for dinner and this was in front."
            got abstain        window —
            confidence —
            says "The note only describes the occasion for opening the bottle and gives no signal about whether the wine was too young, drinking well, or past its best."
            raw {"supportsWindow":false,"notes":"The note only describes the occasion for opening the bottle and gives no signal about whether the wine was too young, drinking well, or past its best."}

✔ abstain        "Grocery store cab doing grocery store cab things."
            got abstain        window —
            confidence —
            says "The note contains no indication that the wine was too young, drinking well, or past its best."
            raw {"supportsWindow":false,"notes":"The note contains no indication that the wine was too young, drinking well, or past its best."}


Direction agreement: 12/12

Nothing was written.
```
Findings:

12 of 12, and the outputs are better than the pass rate suggests. Four things worth reading closely.

The abstentions are the best result. Three notes declined, each naming what the note actually contains rather than reciting a refusal. "The note only describes the occasion for opening the bottle" is a genuinely good sentence. Declining is the behaviour a model is least inclined toward, and it's the one your workflow most depends on, since a proposal with no window is noise in the queue.

notes quotes rather than paraphrases. Every non-abstaining reply names the phrase it relied on, in quotes. That's what makes the claim auditable: a reviewer can see which five words produced a 2019 to 2023 window.

Confidence varies, and sensibly. High on "This is the peak" and "Dried out," medium on "Held up better than expected" and "Could have waited another two years." It's tracking how directly the note states the thing, which is what you'd want.

It arithmetics. "Could have waited another two years" from a 2024 opening produced 2026, not a generic "later." That's the one output where it did something beyond classification.

One thing to look at before moving on, and it's not a failure: the windows are consistently one year wide, 2024 to 2024, 2025 to 2025. Only the past-peak cases give a range, and that's because the instruction pins drinkUntil before the opening year. That's defensible, since a single note supports a point rather than a span, but it's worth deciding whether you want it. A window of 2024 to 2024 accepted onto a wine is a strong claim: one year and done.

Also note the Rosé came back differently in the two runs. The dry run gave 2024 to 2024, the rubric gave 2019 to 2023, because the rubric holds the vintage at 2019 and the opening at 2024. Same reasoning, different inputs. Worth confirming that's what happened rather than temperature drift at 0.

If you're happy with the one-year windows, next is the single real proposal in staging, then accept it and watch the counts move.


Captured from Video:


Capture 1 "Proposal Message":

No window proposed. The note gives only flavour and food-pairing impressions, with no signal about whether the wine was too young, drinking well, or past its best. Nothing was written. A note that does not support a window produces no claim rather than an empty one.

Capture 2 "Proposal Message":

Proposed 2026–2026 (high confidence). The phrase "Opened too young" indicates that the drinking window opens after 2025. It is in the review queue as proposed and resolves nothing until accepted.


End: 07:55 AM

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

---

### Stage 4b: planning the Agent Action, and cutting the Function

Read-only session. Nothing written to any dataset, no schema deployed, no code.

#### The doc contradiction from session 8 is resolved, and the installed types resolved it

Session 8 found two current pages disagreeing about whether Agent Actions
Prompt needs a `schemaId`, and concluded: "One of them is wrong and reading
more carefully will not reveal which."

Both pages are still live and still disagree, verbatim, five days later. The
troubleshooting page: *"Every Agent Actions request needs `schemaId`. The client
doesn't validate it, so omitting it is only a TypeScript error locally."* The
Prompt quick start now carries **five** complete examples, none of which passes
one.

The installed types settle it. In `@sanity/client` 8.6.2,
`PromptRequestBase` declares exactly four members — `instruction`,
`instructionParams?`, `temperature?` and `format` — and the string `schemaId`
appears **zero times** in it. It appears as a *required* member on the other
action request types, four separate times in the same file.

So the quick start is right and the troubleshooting page is wrong, and it is
wrong in a specific way worth naming: its claim is not merely inaccurate, it is
**backwards**. "Omitting it is only a TypeScript error locally" describes the
opposite of the shipped type, where omitting `schemaId` is correct and
*including* it is the type error.

Two things follow.

**A doc defect that survives a week of being noticed is a different class from
one that is merely wrong.** Session 8 recorded this, the project worked around
it by planning a schema deploy "to be robust either way", and the deploy was
carried on the plan for five days as a production write awaiting approval. The
cost of the contradiction was not a broken request; it was a scheduled write to
the real dataset that was never needed.

**This is the fifth time this project has answered a documentation question by
reading `node_modules`**, after the App SDK `perspective` option, `readOnly`
reaching the mutation layer, the two env-var bundles, and Vite 8's JSX
handling. The pattern is now stable enough to state as a rule rather than an
observation: where the docs and the installed package disagree, the package is
the answer, and checking costs about a minute.

#### A premise checked, and corrected

The brief for this session stated that session 7 established GROQ cannot
express authority-then-recency resolution.

Two corrections. It is not in session 7, it is in `docs/temporal-resolution.md`,
and it does not say that. The spec says expressing authority-tiered resolution
in a single GROQ query is *"possible and unreadable, and it would need
rewriting the first time a tier is added."*

The difference matters for the decision it was supporting. "GROQ cannot express
it" makes the projection the only route to queryable state. "Possible and
unreadable" makes the projection the *readable* route, and turns the objection
into duplication — a second implementation of the load-bearing rule, in a second
language, somewhere the test suite does not reach. That is still a real cost and
it still blocks the same two polish items, but it is an argument about
maintainability rather than capability, and the amendment says so.

Worth recording because the drift happened inside this repository, between a
spec and a prompt, over about six days. The spec was precise; the restatement
was not; and the restatement was the version that nearly went into an ADR.

#### What breaks first at scale, measured rather than assumed

The defence of a projection is usually that it will matter once the cellar is
large. Measured against production:

| | Today | ×100 | ×2767 |
| --- | ---: | ---: | ---: |
| Bottles | 542 | 54,200 | 1,499,714 |
| `CELLAR_QUERY` payload | 211.9 KB | 20.7 MB | 572.6 MB |
| Full state tally | 0.07 ms | ~7 ms | ~200 ms |

1,637 documents, 211.9 KB, about 400 bytes per bottle.

The arithmetic in the brief was right: 0.07 ms across 542 bottles is about
200 ms at 1.5 million. The conclusion drawn from it was right too, and is now
quantified. At that size the scan is slow enough to feel on a drag and not
slow enough to break; the fetch is **572 MB of JSON into a browser**, which does
not work at all. The fetch becomes impractical near 20 MB, around 50,000
bottles — roughly two orders of magnitude earlier.

The part worth keeping is that a projection would not have helped with the
thing that actually breaks. It changes what the fetch returns, and what has to
change is how much of the ledger crosses the network at once. `WINE_SCOPED_QUERY`
already exists in `@cellar/core`, so the answer at scale was already in the
codebase before the Function was proposed.

#### The cut is free, which is what makes it the right call

No Function ever ran, so no document in the dataset has a `derived` key. The
removal touches no data, needs no migration, breaks no test, and is not a
production write because no schema is deployed. The App never read the fields.

That is worth separating from the argument for cutting. The design reasons stand
on their own, but the reason it can be done *now*, three days before the
deadline, is that eight declared fields with nothing behind them cost exactly
one file and two field declarations to remove.

The concrete cost of leaving them is on screen rather than in the model: an
always-empty greyed `Derived` panel on all 640 wines and bottles, on the surface
the Stage 4a workflow is filmed on. An empty panel reads as broken, not as
deferred — which was already recorded as polish item 9 before it became an
argument for deletion.

---

### Stage 4b built: the Agent Action

#### The auth question was settled by an example in a plugin's documentation

The one thing flagged as needing verification before writing any code was
whether the Studio's `useClient()` session carries agent-action authorisation,
or whether a token has to be minted and stored.

The evidence chain had three links and the first two were discouraging. The
Agent Actions HTTP reference says **"All endpoints require: BearerAuth"**, so
cookie auth is out. The Studio does support cookie auth — `loginMethod` appears
86 times in the built package with `'cookie'`, `'token'` and `'dual'` branches,
and `withCredentials: true` appears six times — so "the Studio is logged in"
does not by itself mean "the Studio holds a bearer token". The Prompt quick
start's prerequisites name "an API or personal token… store it in the
environment", which reads like a script's requirement rather than a
component's.

The answer is in the AI Assist **custom field actions** guide, which is not a
page about authentication at all. It shows the complete pattern twice:

```ts
const client = useClient({apiVersion: 'vX'})
// ...
await client.agent.action.transform({ … })
```

No token anywhere, in an official example of calling an Agent Action from
inside a Studio component. The annotation beside it is the only place the
version requirement is stated conversationally: *"Set up the client with
`useClient`. Note: Agent Actions require using the `vX` API version at this
time."*

So the answer is yes, and the work proceeded. Two things about *how* it was
found are worth more than the answer.

**The authoritative page was the least useful one.** The HTTP reference states
the constraint that made the question hard (bearer only) and says nothing about
which clients satisfy it. The quick start describes a Node script and its
prerequisites read as universal. The page that answers it is a guide to a
different product's plugin feature, and it answers by example rather than by
statement — there is no sentence anywhere saying "the Studio session
authorises Agent Actions."

**Two pages carry a paid-feature notice and only one of them means it.** The
custom field actions guide is headed "This is a paid feature — available in the
Growth plan". That applies to AI Assist's field actions, the plugin mechanism,
not to Agent Actions reached directly from a document action. Reading the page
for the auth pattern means reading past a banner that does not apply to the
thing being copied from it. The real gate is elsewhere and is org-level: a 403
with "AI features have been disabled at this organization's request".

#### What that resolution removed from the plan

Two production writes, both of which had been sitting on the plan awaiting
approval for reasons that turned out not to exist.

The schema deploy is unnecessary, because Prompt takes no `schemaId` — settled
earlier this session from `PromptRequestBase`. And no API token needs minting
or storing, because the Studio supplies one. Stage 4b therefore writes nothing
but the proposal itself, and that write happens in staging first.

Both were scheduled by session 8's plan as prudence against documentation that
was wrong in one case and silent in the other. The pattern is worth naming: an
unresolved doc contradiction does not merely cost the time to resolve it, it
accretes defensive work that looks like diligence and is aimed at nothing.

#### The shape the code took, and why the model is in one function

Everything except the model's four-key JSON reply is deterministic, so all of
it lives in `studio/lib/agentProposal.ts` with no React, no client and no
network: build the instruction, validate the reply, assemble the document,
check it. Four callers share it — the document action, the dry-run script, the
rubric, and 35 tests that need neither a credit nor a token.

That is what makes the claims assertable rather than argued. "The agent can
never create an accepted assessment" is a test that feeds the parser a reply
containing `reviewState: 'accepted'` and checks it is discarded. "Abstention
writes nothing" is a test that `buildProposal` throws rather than producing a
document with empty bounds. "The instruction withholds the resolved window" is
a regex against the built instruction rather than a comment claiming it.

The twelve-note rubric asserts **direction** rather than years: a past-peak
note must close the window before the year the bottle was opened, whatever
years it picks. Direction is mechanically checkable on a non-deterministic
reply; the years are not, so they are printed for reading. Six further notes —
"Settling down nicely", "Surprisingly good for what it cost", and four more —
are recorded as borderline and deliberately excluded, because putting a
judgement call in a rubric turns it into a failing test.

#### A tsconfig gap the studio had and the app had already closed

`studio/tsconfig.json` lacked `allowImportingTsExtensions`, so the new scripts
and tests failed to typecheck the moment they imported from `lib/`. The app hit
this in Stage 3 and fixed it then, with a comment explaining that `node --test`
runs the files directly and Node's resolver does not guess extensions.

Nothing surfaced it earlier because the studio's existing scripts import only
bare package specifiers. The first shared module between a script and a test is
what exposes it — which is to say the configuration was wrong for a week and
the code that would have noticed had not been written yet.
