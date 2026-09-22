# Friction log

A record of the experience of learning and building on Sanity, captured while
it is happening.

## Why this exists

Two reasons, and they pull in the same direction.

The first is that the article is better if it has real moments in it. Specific
confusions, specific delights, and the exact place where a mental model
clicked are worth more than a competent walkthrough.

The second is that a friction log is a developer relations deliverable in its
own right. Documenting where a platform is hard to learn, precisely and
constructively, is the work. It is also unrecoverable after the fact: once you
understand something, you cannot reconstruct what it was like not to.

## Rules of capture

1. **Write at the moment of friction, not after resolving it.** The value is in
   the confusion, and the confusion evaporates the second it resolves. Thirty
   seconds of notes beats a careful reconstruction on day nine.
2. **Record what you expected before recording what happened.** The gap between
   the two is the finding. "It did X" is a bug report. "I expected Y and it did
   X" is a mental model mismatch, which is more useful.
3. **Timestamp everything.** Elapsed time is data.
4. **Do not soften.** This is a raw capture file. Judgement about what is fair,
   what is a real problem, and what is a skill issue happens later, when
   something gets published.
5. **Note the search that failed.** What you typed into docs search or a search
   engine when you were stuck tells you what vocabulary you had at the time,
   and vocabulary mismatch is the most common documentation failure.

## Entry template

```
### [date, time] Short title

Category:   surprise | delight | confusion | friction | click | gap
Surface:    Studio | GROQ | Functions | Agent Actions | schema | CLI | docs | frontend
Elapsed:    how long this cost me

Expected:
What I thought would happen, or what I thought the thing was.

Happened:
What actually did.

Resolution:
How I got past it, and what finally made it make sense.

Would have helped:
The one sentence in the docs, error message, or tutorial that would have
saved this entirely.
```

The "would have helped" field is the most valuable one and the easiest to
skip. It converts a complaint into a recommendation, which is the difference
between a rant and a friction log.

## Entries

<!-- Newest last. Append during the build, do not tidy. -->

## Standing questions

Revisit at the end of each build day rather than once at the end. Answers
change as competence grows, and the change is itself interesting.

### On learning the platform

- What surprised me?
- What was delightful?
- What confused me?
- What would I teach a new Sanity developer first?
- Where did Studio's mental model click, and what triggered it?

### On the tools

- What did GROQ make easier? Where did I reach for it and find it was the
  wrong instrument?
- What did Agent Actions actually enable that ordinary generation did not?
  Be specific. If the honest answer is "nothing", that is a finding too.
- Where did Functions fit the problem, and where did they feel like a
  workaround?

### On the model

- Where did the content model help?
- Where did I fight the platform? Distinguish carefully between three things:
  a bug, a documentation gap, and a genuine design disagreement. They have
  different fixes and only one of them is Sanity's fault.
- What would I build differently next time?

### On the documentation

- What did the documentation explain well?
- What did it explain poorly?
- What did it not explain at all, that I only learned by failing?
- Where did I end up in Discord, GitHub issues, or a blog post instead of the
  docs, and what was I looking for?

## Build process capture

Path Two's first judging criterion is the quality and honesty of the build
process writeup. That writeup is assembled from this section, and it cannot be
reconstructed afterwards. Capture daily, at the end of each session, while the
prompts are still in scrollback.

### Per session

```
### [date] Session N

IDE / tool:
What I was trying to build:

Prompts that worked:
The ones that produced usable output first time. Paste them.

Prompts that failed:
What I asked for, what I got instead, and how many attempts it took.

Where the model got stuck:
Wrong API surface, invented functions, outdated patterns, confident nonsense.
Be specific about which Sanity feature it got wrong, because that is a
signal about what the training data contains and what the docs make clear.

How I course-corrected:
Pointed it at docs, rewrote the prompt, gave up and hand-wrote it.

Hand-written vs generated:
Rough proportion, and which parts I did not trust it with.
```

### The spec-first question

This project arrived with fourteen documents written before any code existed.
Most Path Two entries will have none. The comparison is the writeup's spine,
so track it deliberately:

- Did pointing the model at a spec file produce better output than describing
  the same thing in the prompt?
- Where did the model ignore the spec and do something else?
- Which spec turned out to be wrong in a way only implementation revealed?
- What did I have to decide mid-build that no spec covered?
- Would I do this again, honestly?

The criterion is honesty, not vindication. If the specs were overhead, say so.
A writeup that concludes the planning was unnecessary is more interesting than
one that concludes the author was right all along, and judges can tell the
difference.

## Instrumentation

Record these as they happen. They are the closest thing to activation metrics
you can gather on yourself, and they are exactly the evidence that
time-to-value claims usually lack.

| Marker | Time | Notes |
| --- | --- | --- |
| Account created to Studio running locally | 18 Sep, 1h 15m at most | Session 0. Upper bound, includes an unrelated local problem |
| Studio running to first custom schema saved | 21 Sep, 2:46 pm | Session 1, Prompt 1. Generated after ten clarifying findings; about 9.5 minutes of model time |
| First document created by hand | skipped | Seed import used instead |
| First successful GROQ query against real data | 21 Sep, after 3:19 pm | Session 1, via Vision, which onboarding never mentioned |
| First dataset import completed | 21 Sep, after 3:19 pm | 1,645 documents in about 8 seconds, after a 5 minute wrong-directory detour |
| First Function deployed and firing | | |
| First Agent Action returning usable structured output | | |
| First App SDK view rendering real data | | |
| First workflow transition moving a proposed assessment | | |

Also worth noting: how many of these required leaving the documentation, and
where you went instead.

## What this feeds

- Specific moments in the challenge article, which make it concrete rather
  than generic
- A separate piece on learning the platform, if the material supports one
- A work sample, if Sanity turns out to be interesting as a place to work

On that last point: this file is raw and stays raw. Anything published gets
rewritten with judgement applied, proposed fixes attached, and the skill
issues separated out from the real problems. A friction log written to be
published is a friction log with the useful parts removed.

---

### 18 September 2026, Session 0

#### Sanity signup, project scaffold, MCP configuration

IDE / tool: WebStorm + Claude Code, Windows / PowerShell
What I was trying to build: nothing yet. Account created, project
initialized, Studio running locally, MCP wired to Claude Code.
Elapsed: roughly 1 hour 15 minutes end to end, including package
installation, onboarding, scaffolding, and MCP configuration. That figure also
includes time lost to an unrelated local error and a slow machine, which
required closing and restarting the terminals and IDE, so treat it as an upper
bound on Sanity setup rather than a clean measurement.

No project code written. Numbering this Session 0 so Session 1 lines up with
Stage 1 of the build plan.

---

#### What worked

- GitHub account connection was immediate and asked nothing unnecessary.
- The scaffold command ran first time with a long flag string and no
  correction needed.
- The `clean` template produced a Studio that ran on the first
  `npm run dev` with no fiddling, no missing dependencies, and no config
  editing.
- The CLI offered a package manager choice rather than assuming npm. Small
  thing, well judged.
- `sanity mcp configure` was a single command, used my logged-in CLI session,
  and needed no API token to generate, store, or accidentally commit.
- Setting up the Sanity MCP server in Claude code worked, authentication was easy and painless. Thirty seconds.

#### Onboarding

Eight steps before reaching anything buildable.

**Step 4, "What are you building?"** Six options: marketing site, media and
publishing, e-commerce, knowledge base, product / app, blog. None quite
describes this project. The question asks you to classify yourself before you
know what the classification changes. Answered Product / App as the closest
fit. Avoided Knowledge Base, since Sanity uses that term specifically for
Sanity Context knowledge bases and picking it might have steered the setup
toward machinery this project does not use.

**Step 6, "What technologies are you using?"** Fifteen options, every one of
them a frontend framework or a hosting platform. There is no option for
building inside Sanity itself. The list quietly assumes you are building a
separate site that consumes the content. That is a fair assumption for most
users and an odd one given that the App SDK is a headline feature on the same
platform. Answered React and TypeScript, which are true regardless of where
the interface ends up living.

**Step 7, "Adding Sanity to an existing site or app?"** Answered from scratch.

#### Scaffolding

```
npm create sanity@latest -- --project aos9nze5 --dataset production \
  --template clean --typescript --output-path studio
```

- Required `create-sanity@6.0.48` to be installed first.
- Login to Sanity via GitHub.
- Prompt: "Configure Sanity MCP and agent skills for these editors?" The only
  option offered was Cursor. Declined.

Studio came up on `localhost:3333`, authenticated, and showed an empty
structure with "No document types," which is correct for a clean template with
no schemas defined.

#### Where the setup flow assumes a frontend

Three separate points in setup assume Sanity plus a separate frontend:
step 6 offers only frontend frameworks, step 7 asks existing site or from
scratch, and the closing agent prompt hard-codes `Framework: Next.js`. The
App SDK is a headline feature and a named bonus in the current DEV Challenge,
and no path through onboarding leads to it.

#### The Next.js app and the vendor agent prompt

I ran every command in their walkthrough, including the Next.js scaffold:

```
npx create-next-app@latest web --tailwind --ts --app --src-dir --eslint \
  --import-alias "@/*"
```

So a `web/` directory now exists. The one thing I did not run is the final
agent prompt itself, which does two separate things: installs the
`sanity-best-practices` skill from the Sanity Agent Toolkit, and wires the
`web` app to Sanity. Both were declined on purpose.

```text
Set up Sanity using the `sanity-best-practices` skill's `getting-started` reference.

If the skill can't be found, install it by running `npx skills add sanity-io/agent-toolkit --skill sanity-best-practices -y`. If the install fails, stop and ask me to run it.

Context:
- Project: Cellar (aos9nze5)
- Dataset: production
- Framework: Next.js
- Project Type: Product / App
- This is a monorepo: the current folder is the root, with the Studio in `studio` and the Next.js app in `web`
- Connect Sanity to my new `web` app
- First, confirm `studio` and `web` are both in your working directory. If not, stop and ask me to restart you from the `cellar` folder.
- Keep the Studio standalone - do not embed it in the Next.js app
```

**The skill install** would have loaded vendor content-modelling guidance
alongside this project's own CLAUDE.md, which carries six design rules that
deliberately contradict conventional Sanity practice, most notably that
drinking windows are never fields on a wine. Installing both at once would
make it impossible to attribute any given model behaviour to the MCP server,
the toolkit skills, or the project specs. Holding the toolkit back preserves a
clean first observation of how well spec-first instructions hold on their own.
It can be added later as a deliberate second variable.

**The Sanity wiring** conflicts with
[ADR 0010](ADRs/0010-time-machine-as-sanity-app.md), dated before this
session, which puts the temporal view in a Sanity App built on the App SDK and
keeps Next.js as a day-four fallback. The `web/` app exists but is
deliberately unwired to Sanity. Keeping it costs nothing and removes a step if
the gate ever trips.

Also worth noting: the prompt asserts `Framework: Next.js` even though
step 6 was answered React and TypeScript. The flow supplied that on my behalf
rather than carrying forward what I told it.

#### Next 16.3.5 makes the fallback more expensive than assumed

The scaffold installed Next 16.3.5. It also generated `web/AGENTS.md` and
`web/CLAUDE.md`, the latter containing nothing but `@AGENTS.md`, an import, so
both agents read one source of truth. Worth stealing that pattern.

The content is Next.js's own agent rules, not Sanity's, and the warning is
blunt: this version has breaking changes, APIs and conventions and file
structure may all differ from training data, and agents should read the
bundled guides in `node_modules/next/dist/docs/` before writing any code. The
block is regenerated by `next dev`, so deleting it just produces an
uncommitted change that returns. Commit it.

This matters for ADR 0010. The day-four fallback to Next.js was costed as
cheap, because Next is well represented in training data. At 16.3.5 that
assumption is weaker: falling back would mean falling back to a version the
model is likely to get wrong, on a deadline. It does not change the decision,
since the App SDK remains the right target, but the fallback is no longer free
and the ADR should say so.

#### MCP configuration

The init prompt offered only Cursor, but a sibling command supports three
editors. Found by looking it up rather than by being told.

```text
❯ npx sanity@latest mcp configure
Need to install the following packages:
sanity@6.15.0
Ok to proceed? (y)
npm warn deprecated uuid@10.0.0: uuid@10 and below is no longer supported.
npm notice run npx
npm notice run sanity mcp configure
✔ Configure Sanity MCP server? Claude Code
✔ MCP configured for Claude Code

~ took 5m16s
```

Note the prompt: this ran from the home directory, not the repo, so it likely
wrote a user-scoped config rather than a project-scoped one.
Resolved in a later session: Claude Code, started from the `Cellar` folder,
sees the Sanity server.


**Would have helped:** one sentence in the init prompt saying that other
editors are supported and pointing at `sanity mcp configure`. As written, the
Cursor-only list reads as "Cursor is the supported editor," which is not true.

**Would also have helped:** `mcp configure` saying which config file it wrote
and at what scope, rather than only that it succeeded.

### 21 September 2026, Session 1

#### Stage 1: schemas, spec corrections, seed import

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to build: the six document types, the seed dataset
imported, and one GROQ query resolving a 2023 consumption through bottle,
wine, and producer.
Outcome: Stage 1 gate passed. 1,645 documents imported.
Elapsed: roughly 2:30 to 3:30 pm for the build itself. Prompt 1's start time
was not recorded.

Prompts were drafted in a separate planning session with Claude in the chat
app, then pasted into Claude Code and adjusted. Decisions at each fork were
made in that planning session and relayed. Recorded here because the
writeup's first criterion is honesty about process.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 2:25 | Setup environment, prompt development, CLI login | N/A |
| 2:46 pm | Prompt 1: read specs, report conflicts, then write schemas | 9m 26s after answers |
| to 2:59 pm | Prompt 1.5: correct the specs; Prompt 1.75: align code | 3m 57s, 1m 24s |
| 3:02 to 3:12 pm | Prompt 2: seed transform to NDJSON | 6m 14s |
| 3:12 to 3:18 pm | Prompt 2.5: derivedFrom rule and cleanups | 3m 19s |
| from 3:19 pm | Commits, import, verification in Vision | about 5m lost to a path error |

#### What worked

- **The model read before it wrote.** Prompt 1 asked for conflicts before
  code. It read CLAUDE.md, every spec, and all eleven ADRs, pulled current
  Sanity docs through the MCP server rather than working from memory, wrote
  nothing, and came back with ten findings. Three were real spec bugs.
- **It asked instead of guessing,** through a tabbed decision menu in Claude
  Code, with a recommended option and the tradeoff of each alternative.
- **It refused to fabricate data.** The ledger had no `derivedFrom` column.
  Rather than infer links from the obvious day-after pattern, it declined and
  asked for an explicit rule. That also exposed that my own `check.py` was
  passing demo moment 4 on a proxy.
- **Deterministic, idempotent output.** Byte-identical NDJSON across runs,
  integrity checks built into the transform, and a correct note that
  `--replace` makes reruns safe.
- **It noticed things outside its task:** stale counts in the seed README, a
  Python rule in CLAUDE.md contradicted by the repo, and uncommitted changes
  it had not made.
- **The import itself:** 1,645 documents in about eight seconds, with
  references strengthened after load so document order did not matter.
- **Preview dot notation** through references works as documented, once the
  model checked.

#### Spec errors found in implementation

These were in documents written before any code. Recorded as errors, not
refinements.

1. **Validation rule 0, second clause.** "An assessment with `derivedFrom` set
   was created as `proposed`." Sanity validates current state, not creation
   history, so the rule as written would have made the accept transition
   permanently invalid, breaking the one thing ADR 0011 exists to model.
2. **Validation does not run on import.** The spec assumed schema rules
   protect the data. They run in Studio only; imports and API mutations
   bypass them, as does `initialValue`. The seed plan's ledger had no
   `reviewState` column as a result.
3. **Underscore-prefixed projection fields** are rejected by the schema
   validator. The spec flagged this as unconfirmed; it was wrong.
4. **Cross-document uniqueness** on `producer.name` has no declarative
   equivalent.
5. **CLAUDE.md pointed at `docs/adr/`**; the directory is `docs/ADRs/`.
6. **`check.py` moment 4 tested a proxy.** It checked that a personal note
   shortened a window, not the `derivedFrom` chain the seed plan describes.
7. **The `_createdAt` tie-break** in ADR 0006 is not deterministic against a
   bulk import. Amended to fall back on `_id`.

#### Model errors

- **Preview references.** Claimed preview `select` cannot follow references
  and deferred bottle previews to a Stage 5 custom component. Wrong. Asked to
  verify against the docs, it found the section demonstrating exactly that
  and said so plainly. One-line fix.
- **Right conclusion, wrong reasoning.** Said strict date comparison would
  reject same-year windows in the seed data. It would not: same-year windows
  normalize to January 1 and December 31. Inclusive was still correct.
- **Deprecated CLI syntax.** Gave `sanity dataset import <file> production`;
  the CLI warns the positional dataset argument is deprecated in favor of
  `--dataset`.
- **Working-directory assumption.** The import path `..\sample_data\...` only
  works from `studio/`, mentioned once in passing. Run from the repo root it
  resolved to `C:\Users\kenal\sample_data` and failed. About five minutes.

#### Platform friction

**Vision was never mentioned.** The primary way to check your data is a
query tool inside Studio, and nothing in onboarding or the scaffold output
pointed at it. I did not know it existed until the verification step.

- *Would have helped:* one line after scaffolding saying a Vision tab exists
  for running GROQ against your dataset.

**Validation runs in Studio only.** Reasonable design, but it is the single
most consequential fact for anyone seeding a dataset, and it surfaced through
the model reading docs rather than through any setup path.

- *Would have helped:* a callout on the dataset import docs page stating that
  imported documents are not validated until opened in Studio.

**Running `npx sanity` outside the project** silently fetched a fresh CLI and
prompted for which project to use, rather than saying no Sanity config was
found in the current directory.

- *Would have helped:* an error that names the missing config and the
  directory searched.

Minor: `npm warn deprecated uuid@10.0.0` on every CLI invocation.

#### Spec-first, so far

- **Did pointing the model at spec files beat describing things in the
  prompt?** Yes, clearly. The explicit specs gave it something to check
  against the platform, which is how seven errors surfaced before any code
  ran. A vibe-coded project would have carried the same misconceptions with
  nothing written down to catch them.
- **Where did the model ignore the spec?** Nowhere silently. Every departure
  was raised as a question or a stated judgement call.
- **Which spec was wrong in a way only implementation revealed?** Rule 0,
  import-time validation, and the tie-break. See above.
- **What had to be decided mid-build that no spec covered?** Bottle format
  default on import, `consumedAt` time of day, source-type mapping for
  unmatched rows, the `derivedFrom` rule, and where wine display names are
  composed.
- **Honest caveat.** The specs contained errors, several of them mine. They
  were also detailed enough that the errors were findable. Both are true.

#### Transcripts

Full prompts and outputs, unedited.

<details>
<summary>Prompt 1</summary>

```text
Read CLAUDE.md, then docs/content-model.md and the ADRs in docs/ADRs.

Create the six document types in studio/schemaTypes: producer, wine, bottle,
acquisition, consumption, assessment. Follow the field tables in the content
model exactly, and register them in the Studio config.

Stage 1 only: no projection or derived fields yet, no custom input
components, no structure customization. Before writing code, list any place
where the content model and your understanding of the Sanity schema API
disagree, and ask me rather than resolving it yourself.
```

</details>

<details>
<summary>Prompt 1: clarifying findings before any code</summary>

```text
Read 1 file, called Sanity 9 times (ctrl+o to expand)

● I read CLAUDE.md, docs/content-model.md, docs/temporal-resolution.md, docs/build-plan.md, docs/seed-data-plan.md, and all eleven ADRs. I also pulled the Sanity schema rule set and the current docs for naming, validation, the date type, and the reference type rather than working from memory, since the
  Studio here is v6.15 and CLAUDE.md is explicit about not inventing API surface.

  No code written yet. Here is where the content model and the Sanity schema API actually disagree.

  Hard conflicts — the spec can't be implemented as written

  1. Underscore-prefixed projection fields are rejected by the schema validator.
  content-model.md flags this as unconfirmed. It's now confirmed, against the spec. The naming docs say field names "must not start with underscores (_), which are reserved for system fields." So _bottlesOnHand, _windowFrom, _status et al. are invalid names, and the derived object wrapper named as the
  fallback is the path. This doesn't block Stage 1 — projections are explicitly out — but the open question in the content model can be closed now.                                                                                                     

  2. Validation rule 0's second clause is not expressible. "An assessment with derivedFrom set was created as proposed." Sanity validation sees current document state on every edit; there is no create-time-only hook. Encoded literally as derivedFrom ⇒ reviewState === 'proposed', accepting an agent-proposed
  assessment becomes a permanent validation error — which kills the one transition ADR 0011 exists to model. The rule as written is wrong, not just awkward.

  3. producer.name "Unique" has no declarative equivalent. rule.unique() validates array members, not cross-document uniqueness. Cross-document uniqueness needs an async custom() validator firing a GROQ count() on every keystroke. That's the same category as invariants 5–7, which CLAUDE.md routes to dataset
  health warnings rather than schema validation.

  4. None of this validation runs on the ledger import. The docs state that schema validation is Studio-only; API and client mutations aren't checked. The Stage 1 gate imports ~250 documents via NDJSON, so every rule below is bypassed at import and only appears when a document is opened. Two consequences:
  initialValue is also a Studio-only mechanism, so the transform must write reviewState explicitly on every assessment — and seed-data-plan.md's ledger column list has no reviewState column. That's a seed-plan gap, not a schema one, but it lands in Stage 1.

  Ambiguities where I'd otherwise be guessing

  5. acquisition.source vs acquisition.sourceType looks like a slip. source is annotated "Merchant, winery, gift, auction" and sourceType "retail, winery, auction, gift, trade" — nearly the same list twice. assessment does this correctly with free-text sourceName beside enum sourceType. I read
  acquisition.source as intended to be the free-text merchant name and the Notes column as stale.

  6. wine.title is the only identity field not marked Required, while producer and vintageYear both are.

  7. drinkUntil "must be after drinkFrom" — rule.min(rule.valueOfField('drinkFrom')) is inclusive, so a same-day window passes. Strictly-after needs a custom validator. Which is intended?

  8. varietals percentages "sum to 100 when more than one is present" — undefined for a partially-filled blend (two varietals, one percentage entered), and unspecified whether it blocks publishing.

  9. "Must not be in the future" has a day-boundary problem. date fields are timezone-free strings; new Date() is an instant. Comparing in UTC means someone in Pacific time can't record today's acquisition until 5pm local. My default: compare the two date fields against the local calendar date, consumedAt
  against the actual instant, and compute the bound inside the validator rather than at module load so a Studio tab left open overnight doesn't go stale.

  10. vintageYear required means no non-vintage wines. seed-data-plan.md calls for one Champagne. Fine if it's a vintage Champagne — flagging only.

  One doc nit: CLAUDE.md points at docs/adr/; the directory is docs/ADRs/.

❯ /login                                                                                                                                                                                                                                                                                                            
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
←  ☐ Rule 0  ☐ Enums  ☐ Uniqueness  ☐ Previews  ✔ Submit  →

Validation rule 0 says an assessment with `derivedFrom` set was created as `proposed`. Sanity can only see current state, so enforcing that literally blocks the accept transition. How should I handle it?

❯ 1. Drop the clause, use initialValue (Recommended)
     Schema enforces only that reviewState is one of the three values. The agent sets `proposed` explicitly when it writes. Records rule 0's second clause as a spec bug found in implementation — writeup material per ADR 0009.
  2. Enforce as a warning
     `derivedFrom` set + reviewState `accepted` shows a non-blocking warning. Preserves the intent visibly but nags on every accepted agent assessment, which is the normal end state.
  3. Keep it, scope to drafts only
     Enforce on documents with no published version, approximating 'at creation'. Fragile, and it still fires wrongly if an assessment is accepted before first publish.
  4. Type something.
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  5. Chat about this

Enter to select · Tab/Arrow keys to navigate · Esc to cancel
```

Planning-session guidance relayed back: choose option 1 for rule 0; route
uniqueness to dataset health; take the spec enum lists; make `wine.title`
optional with a composed preview; map ledger `sourceName` into
`acquisition.source` and infer `sourceType` where obvious; keep `drinkUntil`
inclusive; varietal sum as a warning only when every percentage is filled;
accept the model's date-boundary default; keep vintage required; fix the
`docs/adr/` path.

</details>

<details>
<summary>Prompt 1 output: schemas written (ended 2:46 pm)</summary>

```text
● PowerShell(Set-Location 'C:\Users\kenal\Cellar\studio'; npx --no-install prettier --write schemaTypes; npx --no-install tsc --noEmit)
⎿  npm notice run cellar@1.0.0 npx
npm notice run prettier --write schemaTypes
schemaTypes/acquisition.ts 169ms (unchanged)
… +10 lines (ctrl+o to expand)
⎿  (timeout 5m)

● Done. Schema validates clean.

Files created in studio/schemaTypes/: producer.ts, wine.ts, bottle.ts, acquisition.ts, consumption.ts, assessment.ts, plus varietal.ts and lib/validation.ts. index.ts now exports all seven types; sanity.config.ts already imported schemaTypes, so registration needed no change there.

Verification: tsc --noEmit clean, eslint . clean, prettier --check clean, and sanity schema validate reports 0 errors, 0 warnings.

All eight of your answers are implemented as chosen. Three things I decided without asking, because they're mechanical rather than model decisions:

- varietal lifted to a top-level object type. The content model specifies an anonymous inline object. Studio accepts that, but sanity graphql deploy rejects it — and deploy-graphql is a script in this package. It's a seventh registered type, but an object type, not a document type.
- @sanity/icons added to package.json at ^5.2.2. It was resolving only by hoisting from sanity; importing an undeclared dependency is a latent break. npm install reported "up to date" — nothing was fetched, only the declaration added.
- bottle.notes and the rest of the free-text fields got explicit rows values so the textareas aren't the 10-row default.

One invented value set you should check: acquisition.currency is constrained to USD, EUR, GBP. The content model specifies a default of USD but never lists the permitted values, and you asked for options.list on it. Tell me the real set if that's wrong.

Three deferred items are load-bearing later and worth noting now:

- Bottle previews can't show the wine. Preview select reads the document and doesn't follow references, so a bottle reads 750ml · Rack B3, not its wine title. Fixing that needs a custom preview component — Stage 5.
- The ledger import bypasses every rule here. Validation is Studio-only. Most concretely: initialValue: 'accepted' on reviewState won't apply to imported assessments, and seed-data-plan.md's ledger columns (date | type | wine | bottleRef | sourceType | sourceName | drinkFrom | drinkUntil | note) have no
  reviewState column. The transform has to supply it, or every imported assessment fails validation the moment it's opened and resolves nothing per ADR 0011.
- _createdAt tie-breaking works on imported documents only if the import preserves it. ADR 0006 and the edge-case table both lean on it, and a bulk import that lets the Content Lake stamp _createdAt will produce import-order ties, not authored-order ones.

I left the docs untouched. Four of them now have answers they were waiting on — the underscore question in content-model.md is settled, rule 0's second clause is unimplementable, the acquisition.source Notes column is stale, and CLAUDE.md points at docs/adr/ rather than docs/ADRs/. Say the word and I'll
apply those edits; the rule 0 finding also looks like friction-log material, since it's exactly the case of a spec being wrong in a way only implementation revealed.

✻ Cogitated for 9m 26s
```

</details>

<details>
<summary>Prompt 1.5: correct the specs</summary>

```text
Update the specs to match the decisions made during Stage 1. Documentation
only, no code changes.

In docs/content-model.md:

1. Projection fields. Remove the underscore naming convention. Derived fields
   live in a `derived` object on wine and bottle. Close the open question.
2. Validation rule 0. Keep the first clause (reviewState is one of the three
   values). Drop the second clause about derivedFrom. The agent sets
   `proposed` explicitly when it writes; the schema does not enforce how a
   document was created.
3. producer.name uniqueness moves out of schema validation and into the
   cross-document checks alongside invariants 5 to 7, surfaced as a dataset
   health warning.
4. Add a note under the validation rules: schema validation and initialValue
   run in Studio only. Imports and API mutations bypass them, so the import
   must write every required value explicitly, including reviewState
   `accepted` on every seeded assessment, and dataset health is the only check
   that sees imported data.
5. acquisition.source is the free-text source name. acquisition.sourceType is
   the enum. Record the import mapping from the ledger: sourceName goes to
   source; sourceType is inferred where obvious (winery club to winery,
   grocery store to retail, auction lot to auction, gift to gift) and left
   empty otherwise.
6. wine.title becomes optional. The Studio preview composes producer, cuvee,
   and vintage.
7. drinkUntil must be on or after drinkFrom, inclusive. Note that because
   windows normalize to January 1 and December 31, a same-year window still
   spans the full year.
8. Varietal percentages summing to 100 is a warning, not a blocking error, and
   only applies when every percentage is filled.
9. "Not in the future": date fields compare against the local calendar date,
   consumedAt against the current instant, and the bound is computed at
   validation time.
10. vintageYear stays required. Non-vintage wines are out of scope.
11. The varietal object is a registered top-level object type rather than an
    anonymous inline object, because `sanity graphql deploy` rejects
    anonymous objects. Record this in the model.
12. acquisition.currency is constrained to USD, EUR, GBP. Record the list.
13. Assessment resolution tie-break: `_createdAt` descending, then `_id`
    descending. Imported documents share an import-time `_createdAt`, so
    `_id` makes the order deterministic. Update docs/temporal-resolution.md
    and note the change in ADR 0006 as an amendment. The seed data currently
    contains no same-tier, same-day ties.
14. Before writing anything about bottle previews: verify against the Sanity
    documentation whether preview `select` can follow references with dot
    notation, for example `wine.cuvee` or `wine.producer.name`. If it can,
    update bottle.ts so the preview shows the wine, and record that the
    earlier claim was incorrect. If it cannot, cite the documentation.

In CLAUDE.md, also add to "How to work in this repo": when a stage in
docs/build-plan.md completes, update CHANGELOG.md at milestone level only.

Then append a section at the end of content-model.md titled "Changes during
implementation", with a dated entry listing each change above and why. Mark
items 2 and 4 as spec errors found in implementation rather than refinements.
Do not rewrite history elsewhere in the file beyond what the changes require.

In CLAUDE.md: fix the path from docs/adr/ to docs/ADRs/, and replace the
underscore convention line with the `derived` object convention.

In docs/seed-data-plan.md: add a line noting the ledger has no reviewState
column and the import sets `accepted` on all seeded assessments.

When done, summarize each file changed in one or two lines.
```

</details>

<details>
<summary>Prompt 1.5 output</summary>

```text
PowerShell(Set-Location 'C:\Users\kenal\Cellar\studio'; npx --no-install tsc --noEmit; if ($?) { npx --no-install sanity schema validate; npx --no-install prettier --check…)
  ⎿  npm notice run cellar@1.0.0 npx
     npm notice run tsc --noEmit
     npm notice run cellar@1.0.0 npx
     … +13 lines (ctrl+o to expand)
  ⎿  (timeout 7m)

● Item 14 first: I was wrong. Preview select does follow references with dot notation — the list previews docs have a section titled "Preview using fields from referenced documents" demonstrating exactly that. So bottle.ts got the one code change you carved out; everything else is documentation.

  Files changed

  - studio/schemaTypes/bottle.ts — the only code change. Preview now selects wine.title, wine.cuvee, wine.vintageYear and shows the wine, falling back to vintage + cuvee since title is now optional. The comment claiming references can't be followed is replaced. Only single-hop resolution is documented, so
  nothing depends on wine.producer.name.
  - docs/content-model.md — items 1–12 applied across the field tables and the validation section: derived object replaces the underscore convention on both wine and bottle, rule 0 loses its second clause, producer.name uniqueness becomes cross-document rule 8, and a new "Validation runs in Studio only"
  subsection covers the import. Appended a dated "Changes during implementation" section marking items 2 and 4 as spec errors and the rest as refinements.
  - docs/temporal-resolution.md — resolvedWindow tie-break gains _id descending after _createdAt descending, with the reason; the edge-case table row updated and noted that the seed data contains no such tie.
  - docs/ADRs/0006-… — status now "Accepted, amended 2026-09-21", with an amendment section explaining why _createdAt alone isn't deterministic against a bulk import.
  - CLAUDE.md — underscore convention line replaced with the derived object form; producer.name added to the cross-document invariants list; new "How to work in this repo" bullet on updating CHANGELOG.md at stage completion, milestone level only.
  - docs/seed-data-plan.md — notes the ledger has no reviewState column and the transform sets accepted on all seeded assessments, with the initialValue reason.

  tsc --noEmit, sanity schema validate (0 errors, 0 warnings), and prettier --check all pass.

  Two places the code now contradicts the spec, because you said documentation only and these weren't carved out:

  1. wine.title is still rule.required() in wine.ts, and wine's own preview doesn't yet compose producer + cuvee + vintage. That composition needs producer.name — one hop from wine, so it's the documented case and will work.
  2. drinkUntil is still strictly after drinkFrom in assessment.ts. Worth flagging that item 7 reverses the Stage 1 decision you made earlier, and your reasoning is right — normalization produces equal-year pairs, so strict comparison would reject the most ordinary window in the ledger. It would have failed
  on real seed data.

  Both are small edits. Say the word and I'll make them.

✻ Churned for 3m 57s
```

</details>

<details>
<summary>Prompt 1.75: "Yes, please fix." (ended 2:59 pm)</summary>

```text
PowerShell(Set-Location 'C:\Users\kenal\Cellar\studio'; npx --no-install tsc --noEmit; if ($?) { npx --no-install sanity schema validate; npx --no-install eslint .; npx --…)
  ⎿  npm notice run cellar@1.0.0 npx
     npm notice run tsc --noEmit
     npm notice run cellar@1.0.0 npx
     … +15 lines (ctrl+o to expand)
  ⎿  (timeout 7m)

● Both fixed; code and spec now agree.
  
  - studio/schemaTypes/wine.ts — title is no longer required, and its description says what happens when it's left empty. The preview selects producer.name (single hop, the documented case) and composes vintage + producer + cuvee when title is absent, with appellation as the subtitle.
  - studio/schemaTypes/assessment.ts — drinkUntil is now inclusive. Replaced the custom strictly-after validator with the built-in rule.min(rule.valueOfField('drinkFrom')), which the date type documents as inclusive. Split into an array so required() keeps its own message rather than inheriting the range
  one, and left a comment explaining why equal dates are legal.
  
  tsc --noEmit, sanity schema validate (0 errors, 0 warnings), eslint ., and prettier --check all pass.

  Worth noting for Stage 2: wine.title going optional means the resolution module and any GROQ projection that displays a wine can no longer assume it exists. The Studio composes a fallback in prepare, but that logic lives in the preview and isn't available to the App SDK or to Functions — so either the
  seed transform always writes a title, or that composition needs to move somewhere both surfaces can import.

✻ Cooked for 1m 24s
```

</details>

<details>
<summary>Prompt 2: seed transform (3:02 to 3:12 pm)</summary>

```text
Write a script that reads sample_data/wines.csv and sample_data/ledger.csv
and produces NDJSON for `sanity dataset import`. Follow docs/content-model.md,
including the "Changes during implementation" section.

IDs must be deterministic so references resolve: wine_id for wines, the
bottle handle for bottles, "acq-" and "con-" plus the bottle handle for
acquisitions and consumptions, a stable hash of the row for assessments.
Producers come from the distinct producer names in wines.csv.

Validation does not run on import, so write every required value explicitly:
- reviewState "accepted" on every assessment
- drinkFrom and drinkUntil normalized from years to January 1 and December 31
- acquisition.source from the ledger's sourceName; sourceType inferred where
  obvious (winery club to winery, grocery store to retail, auction lot to
  auction, gift to gift), otherwise omitted

Leave wine.title empty. Write no derived fields. Bottles carry no dates.

The script must run on Windows under PowerShell. Tell me the exact import
command, but do not run the import yourself. Before I run it, report document
counts by type so I can check them against check.py: 98 wines and 542 bottles.
```

</details>

<details>
<summary>Prompt 2 output</summary>

```text
PowerShell(Set-Location 'C:\Users\kenal\Cellar\studio'; npx --no-install prettier --write scripts | Out-Null; npx --no-install prettier --check scripts schemaTypes; npx --…)
  ⎿  npm notice run cellar@1.0.0 npx
     npm notice run prettier --write scripts
     npm notice run cellar@1.0.0 npx
     … +15 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

  Called Sanity (ctrl+o to expand)

● Script written and run. The NDJSON is built; I have not imported it.

  Counts

  producer       8
  wine          98   ✓
  bottle       542   ✓
  acquisition  542
  consumption  294
  assessment   161
  total       1645

  Wines and bottles match check.py. The integrity checks the script runs — every ledger wine exists in wines.csv, one acquisition per bottle, at most one consumption per bottle, no consumption without an acquisition, no assessment hash collisions — all passed with zero problems. Output is byte-identical
  across runs, so the IDs are genuinely stable.

  Import command

  From C:\Users\kenal\Cellar\studio:

  npx sanity dataset import ..\sample_data\cellar.ndjson production

  I checked the target: production is empty, so a plain import is correct. If you re-run after regenerating, add --replace — the deterministic IDs make that idempotent rather than duplicating the cellar.

  Four judgement calls worth your review

  format: "750ml" is written on all 542 bottles. The ledger records no format. The content model documents 750ml as the default, but initialValue doesn't fire on import, so leaving it out means 542 bottles with no format at all. I wrote it. One-line change (DEFAULT_FORMAT) if you'd rather the field be
  absent.

  consumedAt is noon UTC. The ledger has dates; the field is a datetime. Noon UTC keeps the calendar date intact when rendered anywhere from UTC-11 to UTC+11 — midnight UTC would show the previous day in Pacific time. Consequence: bottles opened the same day share a timestamp, so intra-day ordering is
  undefined. That's the one thing temporal-resolution.md says consumedAt keeps its time for, and the seed data can't exercise it.

  6 acquisitions have no sourceType. All six are the Mouton, source "retail, delayed release". It isn't one of the four patterns the recorded mapping names, so it's left unset per spec — but it does say "retail" in plain text. Say the word and I'll add the rule.

  No assessment has derivedFrom. The ledger has no column for it. It's clearly intended: personal assessments land the day after a consumption of the same wine — Mouton consumed 1996-11-09, assessed 1996-11-10; consumed 1999-03-20, assessed 1999-03-21. But inferring the link would be fabricating a
  reference, so I didn't. This means demo moment 4 in seed-data-plan.md, the derivedFrom feedback loop, has no data behind it — and that's the moment the README calls "the best single illustration of why assessments are documents." Fixing it needs either a column in ledger.csv or an explicit rule you
  approve.

  Also absent because the ledger has no columns for them: price, currency, confidence, occasion, and producer.country.

  Files

  - studio/scripts/build-ndjson.mts (new) — the transform. .mts so Node treats it as an ES module and strips types natively; no build step, no new runtime dependency. Includes its own RFC 4180 CSV reader, since tasting notes carry commas and apostrophes.
  - studio/tsconfig.json — added **/*.mts to include so the script is typechecked.
  - studio/package.json — added @types/node as a devDependency, needed for the script to typecheck.
  - sample_data/cellar.ndjson (generated, 1645 docs) — not covered by either .gitignore; worth adding if you don't want the artifact committed.

  tsc --noEmit, sanity schema validate, eslint ., and prettier --check all pass.

  One stale doc: sample_data/README.md still reports 105 wines and 576 bottles against the actual 98 and 542. Happy to update it — and separately, CLAUDE.md says "No Python anywhere in this project" while sample_data/ contains four .py files. The rule presumably means the application stack rather than the
  data-generation toolchain, but as written the two disagree.

✻ Sautéed for 6m 14s
```

</details>

<details>
<summary>Prompt 2.5: derivedFrom rule and cleanups (3:12 to 3:18 pm)</summary>

```text
Apply these, then rebuild the NDJSON and report counts again. Do not import.

1. Approved rule for derivedFrom: a personal assessment dated exactly one day
   after a consumption of the same wine gets derivedFrom set to that
   consumption. If more than one consumption of that wine falls on that day,
   leave it unset and list the case. Report how many assessments were linked.
   This is an explicit rule, not an inference, and should be documented as
   one in docs/seed-data-plan.md.
2. Add "retail, delayed release" to the sourceType mapping as retail.
3. Add sample_data/cellar.ndjson to .gitignore.
4. Update sample_data/README.md counts to 98 wines, 542 bottles, and the
   current state figures from check.py.
5. In CLAUDE.md, change "No Python anywhere in this project" to say the
   application stack is TypeScript, and that sample_data/ contains Python
   tooling used only to generate and check the seed dataset.
```

</details>

<details>
<summary>Prompt 2.5 output</summary>

```text
PowerShell(Set-Location 'C:\Users\kenal\Cellar'; git check-ignore -v sample_data/cellar.ndjson; Write-Output "--- git status (short) ---"; git status --short)
  ⎿  .gitignore:246:sample_data/cellar.ndjson   sample_data/cellar.ndjson
     --- git status (short) ---
      M .gitignore
     … +9 lines (ctrl+o to expand)

● All five applied, NDJSON rebuilt, nothing imported.

  Counts

  producer       8
  wine          98
  bottle       542
  acquisition  542
  consumption  294
  assessment   161
  total       1645

  Unchanged from before — the new rules add fields, not documents.

  derivedFrom: 38 of 46 personal assessments linked. Zero ambiguous cases — no wine had two bottles opened on a day that a personal assessment followed, so nothing was dropped for that reason. The other 8 are personal assessments with no consumption of that wine on the preceding day: standalone opinions,
  correctly carrying no link. Demo moment 4 now has data behind it. Spot-checked the Mouton: the 1996-11-10 assessment links to the bottle opened 1996-11-09, and the 1999-03-21 revision links to the blind-tasting bottle from 1999-03-20.

  sourceType: all 542 acquisitions now have one. The 6 Mouton rows map to retail.

  Import command

  Unchanged. From C:\Users\kenal\Cellar\studio:

  npx sanity dataset import ..\sample_data\cellar.ndjson production

  Files

  - studio/scripts/build-ndjson.mts — added the derivedFrom rule with a pre-pass index of consumptions by wine and date, a previousDay helper computed in UTC, retail in the source-type mapping, and reporting for links made plus any ambiguous case declined.
  - docs/seed-data-plan.md — new "The derivedFrom rule" section stating the rule as a block quote, framed explicitly as a statement about how the ledger was authored rather than a pattern read off the data, with why the distinction matters and what it buys demo moment 4.
  - CLAUDE.md — Stack section now says the application stack is TypeScript end to end, and that sample_data/ holds Python tooling for generating and checking the seed dataset only, with a note that it isn't a precedent.
  - sample_data/README.md — count block updated to 98 / 542 / 294 / 248 / 997 and the state figures from check.py (HOLD 45, DRINKING 166, PAST_WINDOW 33, UNASSESSED 4). Also corrected two prose figures in the same section that were stale by the same margin: "roughly 560 acquisitions" → 540, "about 237
  bottles on hand" → 250.
  - .gitignore — sample_data/cellar.ndjson ignored; confirmed with git check-ignore.

  tsc --noEmit, eslint ., prettier --check, and sanity schema validate all pass.

  One thing I noticed while checking git status, unrelated to this work: docs/build-plan.md and docs/friction-log.md have uncommitted changes I didn't make. Flagging only so they don't get swept into a commit unintentionally.

✻ Worked for 3m 19s
```

</details>

<details>
<summary>Import and verification (from 3:19 pm)</summary>

Commits:

```text
git add docs/build-plan.md docs/friction-log.md
git commit -m "Friction log: Stage 1 entries; build plan: shared display name in Stage 2"

git add -A
git commit -m "Stage 1: seed transform to NDJSON, derivedFrom rule, doc corrections"
```

First attempt, from the repo root:

```text
npx sanity dataset import ..\sample_data\cellar.ndjson production
 »   Warning: Positional dataset argument is deprecated. Use the --dataset flag instead: --dataset <name>
 »   Error: Error: ENOENT: no such file or directory, open 'C:\Users\kenal\sample_data\cellar.ndjson'
```

Second attempt, from `studio/`:

```text
✔ [100%] Reading/validating data file (257ms)
✔ [100%] Importing documents (6.28s)
✔ [100%] Strengthening references (1.96s)
Done! Imported 1645 documents to dataset "production"
```

Access Vision tool:

`npm run dev`

https://localhost:3333/

Upper Left Hamburger Menu -> Vision -> QUERY

Gate query, in Vision:

```groq
*[_type == "consumption" && consumedAt >= "2023-01-01" && consumedAt < "2024-01-01"][0]{
  consumedAt,
  tastingNote,
  bottle->{
    format,
    wine->{ cuvee, vintageYear, producer->{ name } }
  }
}
```

```text
consumedAt: 2023-12-27T12:00:00Z
tastingNote: Silky. Drinking well right now.
bottle.format: 750ml
bottle.wine: Brooks Pinot Noir 2018
```

The derivedFrom chain:

```groq
*[_type == "assessment" && defined(derivedFrom)]{
  assessedAt, sourceType, drinkUntil,
  "fromBottle": derivedFrom->bottle->_id
} | order(assessedAt asc)[0...3]
```

```text
1996-11-10  personal  drinkUntil 2018-12-31  from chateau-mouton-rothschild-grand-vin-1993-a
1999-03-21  personal  drinkUntil 2012-12-31  from chateau-mouton-rothschild-grand-vin-1993-b
2017-03-17  personal  drinkUntil 2025-12-31  from california-assorted-cabernet-sauvignon-2012-a
```

The Mouton's two reassessments resolve to the exact bottles opened the day
before, thirty years of provenance in one query. The 1999 entry, with its 2012
window, is the one that currently wins resolution under ADR 0006.

</details>

### Stage 2
#### 22 September 2026
#### Start Time: 

Prompt 1:

```text
Stage 2: the temporal resolution module.

Read CLAUDE.md, docs/temporal-resolution.md including its amendments, ADRs
0001, 0005, 0006, 0010, and 0011, and the Stage 2 section of
docs/build-plan.md.

Do not write code yet.

First, identify any conflicts between these documents, the current repo
structure, and the Sanity capabilities this stage depends on. Verify current
Sanity behavior through the MCP server where necessary rather than relying
on training data. Do not resolve conflicts or uncertainties silently.

Then propose the following and stop for my approval:

1. Shared module location

   Propose where the shared temporal module lives. It must be importable by:

   - Studio, including wineDisplayName in previews
   - a Sanity App built with the App SDK
   - Sanity Functions

   The repo currently has studio/ and web/.

   Explain how each consumer would import the module. Verify that the proposed
   package/module structure is compatible with the App SDK and Functions.
   Flag anything you cannot verify rather than assuming support.

2. Public API

   Propose the module's public API and TypeScript types for:

   - acquired
   - consumed
   - inCellar
   - resolvedWindow
   - state
   - verdict
   - missed opportunities
   - wineDisplayName

   Keep the temporal module pure. It must contain domain logic only and must
   not import a Sanity client, execute GROQ, or fetch data itself.

3. Data boundary

   Propose the input shape the temporal module consumes.

   Separately propose the GROQ query or queries that a Sanity-facing adapter
   would use to fetch and project Content Lake documents into that shape.

   Keep fetching and temporal resolution as separate concerns.

4. Missed opportunities

   Explain how missed opportunities will be computed before proposing code.
   Follow docs/temporal-resolution.md exactly: evaluate the state-change
   boundaries required for an exact result. Do not substitute periodic or
   monthly sampling.

5. Test setup

   Tests read sample_data/expected-states.csv as the independent oracle.

   It contains one row per check:

   - kind: state or verdict
   - bottle
   - date
   - expected
   - resolved window and source fields for debugging

   Propose the test runner and how the CSV becomes test inputs. Prefer no new
   dependencies if Node's built-in test runner is sufficient.

Rules the module must implement exactly:

- Only accepted assessments participate in resolution.
- Assessment authority is resolved by tier first.
- Within a tier: assessedAt descending, then _createdAt descending, then _id
  descending.
- Verdict resolves the drinking window as of consumedAt, not as of now.
- Temporal window comparisons operate on dates.
- Human drinking-window years normalize to drinkFrom January 1 and drinkUntil
  December 31.
- Missed-opportunity calculations use exact state-change boundaries, not
  periodic sampling.
- All asOf comparisons are calendar-date comparisons. consumedAt is truncated
  to its UTC calendar date before comparing. An event dated on day T counts
  as having happened as of T, inclusive. This matches how
  expected-states.csv was generated. consumedAt keeps its time only for
  ordering multiple openings on the same day.

The expected-output table was generated independently and checked by hand
before any temporal-module code existed.

Treat it as an oracle, not output to be repaired.

Do not modify expected-states.csv to make tests pass. If implementation and
the oracle disagree, report the failing rows, explain what the implementation
produced and why, and stop for my decision.

Do not write code until I approve the proposal.
```

Response:

```text

● PowerShell($d = Join-Path $env:TEMP ('nodetest-' + [guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Path $d | Out-Null…)
  ⎿  ✔ adds (0.4711ms)
     ℹ tests 1
     ℹ suites 0
     … +7 lines (ctrl+o to expand)

● I've read all of it and verified the Sanity-side questions against the docs and the live dataset. No code written.

  Three things I verified empirically, because they change the proposal:

  - The seed import has run. 1645 documents, 0 drafts. All 161 assessments share exactly one _createdAt (2026-09-21T22:26:40Z) — ADR 0006's amendment predicted this precisely, and on this data _createdAt is dead weight; _id descending is the operative tie-break.
  - There are no same-tier, same-day assessment ties. I pulled all 161 accepted assessments and checked wine|sourceType|assessedAt — 161 distinct keys. ADR 0006's claim holds.                                                                         
  - node --test runs .mts directly on Node 26.3.0 with native type stripping, importing sibling .mts modules. Ran a scratch test outside the repo: 1 pass, exit 0. No test dependency needed.

  ---
  Conflicts and uncertainties

  Spec-vs-spec

  1. CLAUDE.md design rule 3 is stale. It still reads "Ties break on _createdAt descending" — missing the _id key added to temporal-resolution.md and ADR 0006 on 2026-09-21. CLAUDE.md is listed as authoritative, so it currently contradicts the amended spec and your brief. I'll follow the amended rule. Needs
  a one-line fix.

  2. temporal-resolution.md "Where this code lives" is stale. It says the logic "is written once, in the frontend" — superseded by ADR 0010, which replaced the separate frontend with a Sanity App. This section is precisely what item 1 asks me to propose, so it needs rewriting either way.

  3. The missed-opportunities boundary list in the spec is incomplete. This is a real bug, not a wording nit. The spec names "period start, period end, each drinkFrom and drinkUntil from assessments visible in the period, and each acquisition date." It omits assessedAt. A new assessment becoming visible
  swaps which window resolves, flipping state with no drinkFrom/drinkUntil boundary crossed. Your own seed data does this: paradis-vineyards-estate-marechal-foch-2021 reads DRINKING under the producer window 2023–2027 until 2024-02-21, when the personal assessment replaces it with 2023–2024. A scan without
  assessedAt boundaries misses the transition entirely. Details in §4.

  4. consumedAt comparison semantics read two ways. temporal-resolution.md and CLAUDE.md both say comparisons are date-level "except consumedAt, which keeps its time," and the verdict pseudocode compares a datetime directly against dates. Your brief resolves this — truncate to UTC calendar date, keep time
  only for same-day ordering — and I'll implement your version. Worth knowing why it matters: the import wrote every consumedAt as T12:00:00Z, so UTC truncation recovers the ledger date exactly. But a consumption authored in Studio at 21:00 Pacific is 04:00Z the next day, and UTC truncation shifts it a day
  forward. The rule is right for the seed data and will surprise someone later.

  Oracle coverage gaps

  5. The oracle does not cover missed opportunities. expected-states.csv has kind values state and verdict only, and Stage 2's success test names only those. missedOpportunities would ship with no independent verification. I can write synthetic tests, but those are my own reasoning, not an oracle — they'd
  prove consistency, not correctness.

  6. The oracle cannot exercise two of the rules you listed. All 161 assessments are accepted, so "only accepted assessments participate" has zero coverage. And with no same-tier same-day ties, the tie-break chain has zero coverage. Both are load-bearing. I propose synthetic unit tests for them, kept in a
  separate file and clearly labelled as not the oracle.

  7. The oracle's "now" is 2026-09-18, matching check.py's hardcoded TODAY. The module must never read the clock internally or these tests rot the moment the date passes. now is a required parameter everywhere in my proposed API.

  Repo structure vs Sanity requirements

  8. There is no root package.json or lockfile. studio/ and web/ each have their own. The Blueprints doc is explicit: sanity.blueprint.ts and the lockfile must be co-located, and putting the manifest inside studio/ is named as an anti-pattern. Stage 4 needs Functions, so a root manifest and lockfile are
  coming. That makes the workspace question a Stage 2 decision, not a Stage 4 one.

  9. The one thing I could not verify: whether the Functions bundler packages an npm-workspace-linked local package. The docs state two cases and this repo falls in neither:

  ▎ "For TypeScript Functions in a pnpm workspace, the CLI bundles inline using Vite."
  ▎
  ▎ "For npm or yarn projects that doesn't use TypeScript, the CLI externalizes dependencies and ships them as a node_modules folder alongside the source."

  This repo is npm and TypeScript. Which path it takes is unstated, and whether a symlinked workspace package survives the externalize path is documented nowhere. I can't settle it without deploying a Function. Mitigation in §1.

  10. Unverified: Studio autoUpdates: true with a workspace-linked local package. Auto-updates swap the sanity package at runtime; your own code is still bundled by sanity build. I expect this is fine, but I haven't confirmed it and won't claim it. Cheap to settle: one sanity build after wiring the import.

  11. wineDisplayName has no authoritative definition. build-plan.md:46 adds it to the shared module; content-model.md only says the preview "composes producer, cuvee, and vintage." The actual order lives in studio/schemaTypes/wine.ts where I wrote [vintageYear, producerName, cuvee]. Moving it to the shared
  module makes that the canonical definition — confirm it's the one you want. Also: it isn't temporal, which affects the package name.

  ---
  1. Shared module location

  Proposal: packages/cellar-core/, published as @cellar/core, with the repo root becoming an npm workspace root.

  Cellar/
  ├─ package.json            NEW — private workspace root
  ├─ package-lock.json       NEW — at root, where the blueprint will need it
  ├─ packages/
  │  └─ cellar-core/
  │     ├─ package.json      "@cellar/core"
  │     ├─ src/*.ts
  │     ├─ dist/             built ESM + .d.ts  (gitignored)
  │     └─ test/*.test.mts
  ├─ studio/                 workspace member
  ├─ web/                    workspace member
  ├─ app/                    Stage 3, App SDK
  └─ functions/              Stage 4

  This is the layout the Blueprints doc calls "Multi-application project (recommended for monorepos)" and marks "fully supported" — including a packages/shared-utilities sibling, which is exactly this case. Cost: a root package.json and lockfile, one reinstall, and node_modules hoisting for studio/ and
  web/. That's real disruption two days before the ADR 0010 gate, which is why I'm flagging it rather than just doing it.

  The package ships compiled ESM + .d.ts, not raw TypeScript. Vite, Next 16, and Node 24 all consume built ESM without per-consumer transpile config; raw .ts in a dependency is something Vite and Next both resist by default. The cost is a tsc build step in a repo that currently has none.

  How each consumer imports:

  ┌──────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
  │               Consumer               │                                                Import                                                 │                                   Confidence                                   │
  ├──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Studio (schemaTypes/wine.ts preview) │ import {wineDisplayName} from '@cellar/core'                                                          │ High — Vite resolves workspace symlinks. Unverified against autoUpdates (#10). │
  ├──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ App SDK app                          │ import {bottleState, resolvedWindow} from '@cellar/core'                                              │ High mechanically; the app doesn't exist yet, so untested.                     │
  ├──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Next.js fallback (web/)              │ same                                                                                                  │ High, given built ESM. Next 16.3.5 caveat per ADR 0010.                        │
  ├──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ Functions                            │ import {bottleState} from '@cellar/core', declared in the package.json the CLI uses for that function │ Unverified — see #9.                                                           │
  └──────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

  Mitigation for the Functions risk, in order of preference:

  1. Deploy one trivial Function importing @cellar/core early in Stage 4 and find out. Cheapest real answer.
  2. If the bundler won't follow the symlink: transpile: false with src: './functions/<name>/dist', building the function and its copy of the module ahead of deploy. The doc names this escape hatch explicitly.
  3. Switch the workspace to pnpm, which is the combination the docs explicitly certify. Largest change, highest certainty.

  I'd rather not pre-emptively switch to pnpm on a deadline for a risk that one test deploy resolves.

  Name: @cellar/core, not @cellar/temporal, because wineDisplayName is display logic and would be misfiled in a package named "temporal." Single entry point, named exports.

  ---
  2. Public API

  Pure. No client import, no GROQ execution, no fetch, and no clock read — asOf and now are always parameters.

  export type IsoDate = string      // 'YYYY-MM-DD'
  export type IsoDateTime = string  // full ISO 8601

  export type SourceTier = 'personal' | 'producer' | 'critic' | 'merchant' | 'other'
  export const AUTHORITY_ORDER: readonly SourceTier[]  // tier order, exported so the UI can sort

  export type ReviewState = 'proposed' | 'accepted' | 'rejected'
  export type BottleState = 'NOT_YET_OWNED' | 'CONSUMED' | 'UNASSESSED' | 'HOLD' | 'DRINKING' | 'PAST_WINDOW'
  export type Verdict = 'EARLY' | 'IN_WINDOW' | 'LATE' | 'UNKNOWN'

  export interface ResolvedWindow {
    drinkFrom: IsoDate
    drinkUntil: IsoDate
    sourceType: SourceTier
    sourceName: string
    assessedAt: IsoDate
    assessmentId: string
    visibleCount: number   // accepted assessments visible as of the resolution date
  }

  export interface BottleStateResult {
    state: BottleState
    window: ResolvedWindow | null
  }

  export interface VerdictResult {
    verdict: Verdict
    consumedOn: IsoDate                        // consumedAt truncated to UTC date
    windowAtConsumption: ResolvedWindow | null
  }

  // Predicates
  export function acquired(cellar: Cellar, bottleId: string, asOf: IsoDate): boolean
  export function consumed(cellar: Cellar, bottleId: string, asOf: IsoDate): boolean
  export function inCellar(cellar: Cellar, bottleId: string, asOf: IsoDate): boolean

  // Resolution
  export function resolvedWindow(cellar: Cellar, wineId: string, asOf: IsoDate): ResolvedWindow | null
  export function bottleState(cellar: Cellar, bottleId: string, asOf: IsoDate): BottleStateResult
  export function consumptionVerdict(cellar: Cellar, bottleId: string): VerdictResult | null

  // Display bucket, deliberately outside the state machine
  export function isDrinkSoon(result: BottleStateResult, asOf: IsoDate, withinMonths?: number): boolean

  // Missed opportunities — see §4
  export function missedOpportunities(cellar: Cellar, period: Period, now: IsoDate): MissedOpportunity[]

  // Display
  export function wineDisplayName(wine: WineDisplayInput): string

  visibleCount is what lets the UI say "window based on 3 assessments, most recent personal, May 2026" without a second query, as the spec requires.

  Two naming notes. The spec calls these state() and verdict(); I've proposed bottleState / consumptionVerdict because bare state and verdict are miserable to import into React components. Say the word and I'll use the spec names. And consumptionVerdict takes a bottleId rather than a consumption, since a
  bottle has at most one consumption and callers hold bottle IDs — it returns null for an unconsumed bottle.

  One optional addition, which is the sentence ADR 0005 says the UI should display: verdictDrift(cellar, bottleId, now), returning the verdict at the time alongside what today's window would say. Falls out for free. Tell me if you want it in Stage 2 or deferred.

  ---
  3. Data boundary

  Input shape — flat, id-keyed, no references left to resolve:

  export interface WineInput {
    id: string; title?: string; cuvee?: string
    vintageYear?: number; producerName?: string; appellation?: string
  }
  export interface BottleInput { id: string; wineId: string; format?: string; location?: string }
  export interface AcquisitionInput { id: string; bottleId: string; acquiredAt: IsoDate }
  export interface ConsumptionInput { id: string; bottleId: string; consumedAt: IsoDateTime }
  export interface AssessmentInput {
    id: string; wineId: string
    sourceType: SourceTier; sourceName: string
    assessedAt: IsoDate; drinkFrom: IsoDate; drinkUntil: IsoDate
    reviewState: ReviewState
    createdAt: IsoDateTime   // from _createdAt
  }

  export interface CellarSnapshot { wines; bottles; acquisitions; consumptions; assessments }
  export function buildCellar(snapshot: CellarSnapshot): Cellar

  Cellar is an opaque pre-indexed structure — acquisitions and consumptions keyed by bottle, accepted assessments grouped by wine and pre-sorted by the full comparator. Missed opportunities evaluates hundreds of bottles at a dozen boundary dates each, and rescanning 161 assessments per call would be silly.

  One judgement call to confirm: invariant 5 says one acquisition per bottle, but the schema can't enforce it and the module shouldn't assume it. I propose earliest acquiredAt wins, earliest consumedAt wins, and the module exposes violations rather than throwing. Flagging because "earliest" is a choice.

  The adapter's GROQ — shipped as strings, not executed. The module exports CELLAR_QUERY and toCellarSnapshot(raw); each consumer runs it with its own client or hook. A string constant is not a client dependency, so the purity rule holds.

  groq
  {
    "wines": *[_type == "wine"]{
      "id": _id, title, cuvee, vintageYear, appellation,
      "producerName": producer->name
    },
    "bottles": *[_type == "bottle"]{"id": _id, "wineId": wine._ref, format, location},
    "acquisitions": *[_type == "acquisition" && defined(bottle._ref) && defined(acquiredAt)]{
      "id": _id, "bottleId": bottle._ref, acquiredAt
    },
    "consumptions": *[_type == "consumption" && defined(bottle._ref) && defined(consumedAt)]{
      "id": _id, "bottleId": bottle._ref, consumedAt
    },
    "assessments": *[_type == "assessment" && defined(wine._ref)]{
      "id": _id, "wineId": wine._ref, sourceType, sourceName,
      assessedAt, drinkFrom, drinkUntil, reviewState, "createdAt": _createdAt
    }
  }

  Deliberately not filtering reviewState == "accepted" in GROQ. The module owns that rule, and the review queue needs the proposed ones anyway. 161 assessment documents is nothing to over-fetch, and one query with one owner of the rules is a simpler thing to reason about than a filter split across two
  layers.

  A second, scoped query for Functions (WINE_SCOPED_QUERY with $wineId), since a Function recomputing projections on publish shouldn't pull the whole cellar.

  Perspective: these must run against published. There are 0 drafts today, but the moment you edit in Studio, a draft assessment would otherwise leak into resolution. Worth a decision now rather than a bug later.

  ---
  4. Missed opportunities — the algorithm

  regret(period) = peaked(period) − opened(period), restricted to state(b, now) == PAST_WINDOW
  peaked(b)      = ∃ T ∈ [start, end] : state(b, T) == DRINKING

  state(b, ·) is a step function. It changes only where one of its inputs changes, so the exact discontinuity set for bottle b is:

  D(b) = { acquiredAt(b) }                                    NOT_YET_OWNED → something
       ∪ { consumedDate(b) }                                  → CONSUMED
       ∪ { a.assessedAt  : a ∈ acceptedAssessments(wine(b)) }  resolved window swaps  ← missing from the spec
       ∪ { a.drinkFrom   : a ∈ acceptedAssessments(wine(b)) }  HOLD → DRINKING
       ∪ { dayAfter(a.drinkUntil) : a ∈ ... }                  DRINKING → PAST_WINDOW

  The evaluation set is then:

  C(b) = { start } ∪ { d ∈ D(b) : start < d ≤ end }
  peaked(b) = ∃ T ∈ C(b) : bottleState(b, T).state == 'DRINKING'

  Why that is exact, in one sentence: every constant segment of state(b, ·) that intersects [start, end] either begins at a discontinuity inside the period or already contains start, so evaluating at start plus every in-period discontinuity visits every segment — no sampling, no interval can be skipped
  however brief.

  Note dayAfter(drinkUntil) rather than drinkUntil: the bottle is DRINKING through drinkUntil inclusive, so the transition lands the following day. Ranging windows over every accepted assessment's own drinkFrom/drinkUntil is safe because the resolved window is always one of them.

  Cost: ~542 bottles × a handful of boundaries. Trivial.

  export interface Period { start: IsoDate; end: IsoDate }
  export interface MissedOpportunity {
    bottleId: string
    wineId: string
    peakIntervals: {from: IsoDate; until: IsoDate}[]  // beyond spec — falls out of the scan
    windowNow: ResolvedWindow | null
  }

  peakIntervals is free from the segment scan and makes the UI considerably better than a boolean. Flagging it as beyond spec; drop it if you'd rather keep the surface minimal.

  ---
  5. Test setup

  Runner: node --test. No new dependencies — verified working with .mts on this machine.

  packages/cellar-core/test/
  ├─ oracle.test.mts     drives expected-states.csv — the oracle
  ├─ rules.test.mts      synthetic fixtures — NOT the oracle, clearly labelled
  └─ helpers/csv.mts     CSV reader

  oracle.test.mts reads sample_data/expected-states.csv, emits one test() per row (49 tests) so a failure names the exact row, and asserts:

  - the expected value against bottleState(...).state or consumptionVerdict(...).verdict
  - and, where the row fills them, windowFrom / windowUntil / windowSource against the resolved window's drinkFrom, drinkUntil, and `${sourceType} ${assessedAt}`

  Twenty rows carry those columns. Checking them turns the oracle into a test of provenance, not just of the final label — which is where a resolution bug would actually hide. On failure the assertion message carries expected vs actual plus the full resolved window, which is what those columns are there
  for.

  now is passed explicitly as 2026-09-18 to match how the oracle was generated (#7).

  Fixture source: sample_data/cellar.ndjson, read from disk. No network. It's the exact document shape that was imported, so the test exercises toCellarSnapshot rather than a parallel reimplementation of the transform. One wrinkle needing your call: cellar.ndjson is gitignored, so a fresh clone has no
  fixture. Either add a pretest that runs build-ndjson, or un-ignore the file. I lean toward pretest — the generator is deterministic and byte-stable, so regenerating costs nothing.

  rules.test.mts covers what the oracle structurally cannot (#6), on hand-built fixtures of three or four documents: proposed and rejected assessments being ignored, tier order beating recency, the assessedAt → _createdAt → _id tie-break chain, year normalization, and the missed-opportunities boundary scan
  — including the assessedAt-transition case from #3, which is the one a monthly sampler would get wrong. These prove the implementation matches my reading of the spec. They are not independent verification, and I'll keep them in a separate file so nobody mistakes them for the oracle.

  If the implementation and the oracle disagree, I'll report the failing rows with what the module produced and the window it resolved, and stop. I won't touch the CSV.

  ---
  Nothing is written yet. The decisions I need from you: the workspace root in §1 (#8, and how you want to handle the Functions risk in #9), the API names in §2, the GROQ perspective and the over-fetch call in §3, peakIntervals in §4, and the gitignore-vs-pretest question in §5. Plus whether you want the
  four stale-spec items (#1, #2, #3, #11) fixed as part of this stage or recorded separately.

✻ Churned for 5m 35s
```

