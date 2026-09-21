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
| Account created to Studio running locally | | |
| Studio running to first custom schema saved | | |
| First document created by hand | | |
| First successful GROQ query against real data | | |
| First dataset import completed | | |
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


**Would have helped:** one sentence in the init prompt saying that other
editors are supported and pointing at `sanity mcp configure`. As written, the
Cursor-only list reads as "Cursor is the supported editor," which is not true.

**Would also have helped:** `mcp configure` saying which config file it wrote
and at what scope, rather than only that it succeeded.


### 21 September 2026

#### Stage 1, Prompt 1

> Read CLAUDE.md, then docs/content-model.md and the ADRs in docs/ADRs.

Create the six document types in studio/schemaTypes: producer, wine, bottle,
acquisition, consumption, assessment. Follow the field tables in the content
model exactly, and register them in the Studio config.

Stage 1 only: no projection or derived fields yet, no custom input
components, no structure customization. Before writing code, list any place
where the content model and your understanding of the Sanity schema API
disagree, and ask me rather than resolving it yourself.

Partway through the prompt, CLaude Code asked this:

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

Pick 1. It's right, and the clause was my error. I wrote a creation-time rule into a system that only validates current state, and it would have broken the exact transition ADR 0011 exists to model.

Quick answers for the other tabs and items, so you can move through the menu:

**Uniqueness.** Do not add an async validator. Route it to dataset health, same as invariants 5 to 7. A GROQ query on every keystroke for a field that nobody will realistically duplicate is not worth it.

**Enums.** Take the spec lists as written.

**Previews.** Make `wine.title` optional and have the preview compose producer, cuvée, and vintage. `wines.csv` has no title column anyway, so a required title would force the import to fabricate one.

**Item 5, acquisition source.** Its reading is correct: `source` is the free-text name. Tell it to map the ledger's `sourceName` into `source`, and infer `sourceType` where obvious (winery club to winery, grocery store to retail, auction lot to auction, gift to gift).

**Item 7, inclusive min.** Inclusive is correct. Windows normalize to January 1 and December 31, so a same-year window still spans a whole year. Several wines in the dataset depend on that.

**Item 8, varietals.** Warning, not blocking, and only when every percentage is filled.

**Item 9, dates.** Accept its default. It's more careful than the spec.

**Item 10.** Leave vintage required. The dataset has no non-vintage wines.

**The path nit.** Also mine. Fix CLAUDE.md to say `docs/ADRs/`.

Now the important part: log this before you continue, because it's the best spec-first data point you'll get all week. The model read every document, pulled current Sanity docs through the MCP server rather than working from memory, wrote no code, and returned ten issues, three of them genuine spec bugs. The honest version for the writeup cuts both ways. The specs contained errors, and the specs are also why the errors were findable, since an explicit rule is one that can be checked against the platform. A vibe-coded project would have had the same misconceptions without anything written down to catch them against.

Once you're through the menu, the content model needs three small updates: close the underscore question in favor of the `derived` wrapper, drop rule 0's second clause, and note that schema validation does not run on import. That last one matters beyond Stage 1, since it means your dataset health view is the only place imported data gets checked.

Prmopt 1 end: 2:46 pm

Claude Code Output:

```text
After prmopt 1 only, here's the output:


```


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


Anything need changing in the 1.5 prompt?
```

#### Prompt 1.5

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

#### Prompt 1.5 Results:

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

#### Pfrompt 1.75

> Yes, please fix.

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

