### 22 September 2026, Session 5

#### Stage 4, first step: the Functions bundling probe

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to answer: whether a Sanity Function can import
`@cellar/core`, a workspace-linked local package, in an npm plus TypeScript
monorepo. The documentation covers pnpm plus TypeScript and npm without
TypeScript, and says nothing about this combination. Open since Stage 2.
Outcome: Outcome A. Native workspace import works, first attempt, no escape
hatch. The deployed Function returned the predetermined result exactly.
Elapsed: 3:29 to about 3:51 pm, roughly 22 minutes.

The last unverified technical risk in the project, closed on contest day 5.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 3:29 to 3:37 pm | Prompt 1: verify the docs, design the probe, state the expected result, stop | 5m 10s |
| 3:38 to 3:59 pm | Prompt 2: approved with three conditions; deploy, invoke, tear down | 12m 4s |

#### The result

```
expected  CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}
actual    CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}
```

No `transpile: false`, no prebuilt directory, no bundler alias, no copy of
the module, no package manager change. `git diff --stat` on
`packages/cellar-core` was empty.

#### Why the probe was designed this way

The snapshot was six hardcoded documents, arranged so that the two rules most
likely to be broken by a bad bundle each have a distinct wrong answer:

| Rule | If it were broken | Resulting state |
| --- | --- | --- |
| Authority beats recency (ADR 0006) | A critic claim two years newer wins | HOLD, window 2030 to 2035 |
| Only accepted assessments resolve (ADR 0011) | The newest personal claim, still proposed, wins | HOLD, window 2040 to 2045 |
| Correct behaviour | Personal accepted claim from 2023 wins | DRINKING, window 2024 to 2027 |

Both failure modes read HOLD. A bundler shipping a shimmed, stale, or
partially tree-shaken module could not accidentally produce the expected line.

#### The finding: the documented model of bundling is wrong

The docs describe two project-wide strategies:

> For TypeScript Functions in a pnpm workspace, the CLI bundles inline using
> Vite.

> For npm or yarn projects that doesn't use TypeScript, the CLI externalizes
> dependencies and ships them as a node_modules folder alongside the source.

Both sentences describe what the CLI does to a project. In fact it decides per
dependency, and this repo got both at once:

- `@cellar/core` was inlined and tree-shaken into the uploaded asset, split
  across numbered chunks. `buildCellar` landed in `index3.js`,
  `resolvedWindow` in `index5.js`, the state machine in `index6.js`. There is
  no `@cellar/core` directory anywhere in the bundle.
- `@sanity/functions` was externalised into a real shipped `node_modules`,
  with its `@aws-lite` and `aws4` transitives.

The reason it works, in one sentence: a private workspace package never has to
be installable, only resolvable at build time. The CLI's generated install
manifest requests `@sanity/functions` and nothing else, so `@cellar/core` is
never looked up in a registry and never gets the chance to 404. On Windows,
npm links workspace members as junctions rather than POSIX symlinks, and the
bundler followed the junction without complaint.

This is more useful than a documentation gap. The gap suggests a missing
paragraph; the reality is that the published model of the tool does not match
how it behaves.

- *Would have helped:* describing bundling as a per-dependency decision, with
  the rule stated (workspace-local packages inline, registry dependencies
  externalise), rather than as two mutually exclusive project modes.

#### Two separate findings

**A Function that does nothing still gets an editor token.** The probe
constructs no client, runs no queries, and writes nothing. Deployment still
provisioned a robot token labelled `Function: cellar-core-probe`, role
editor, no expiry. It was removed cleanly by `blueprints destroy`, but Stage 4
will create one per Function. A default that grants editor to code that never
touches the dataset is worth auditing, and it has nothing to do with bundling.

**The manifest inside the built asset is misleading.** The `package.json`
copied into the bundle still lists `@cellar/core`, even though nothing
installs it there and nothing imports it at runtime. Anyone debugging a bundle
by reading that file gets a wrong answer about what shipped.

#### Where the model's judgement beat mine

I asked it to consider scoping the trigger at `production` with a filter on a
`_type` that does not exist in the content model, to avoid creating and
deleting a scratch dataset.

It declined, with the right reason: scoping is safe, invoking is not. A
deployed document Function can only be invoked by writing a document that
matches its filter, so pointing at production would have meant creating a
probe document there and deleting it afterwards, leaving both mutations in
that dataset's history permanently. A scratch dataset deletes whole.

That is the correct call and I had missed it. It said so plainly rather than
complying.

#### Teardown, verified rather than assumed

| Check | Result |
| --- | --- |
| `blueprints stacks` | No stacks found, 0 of 3 used |
| `tokens list` | No API tokens found |
| `datasets list` | production only |
| Function logs | deleted before the stack was destroyed |
| `npm test` | 390 pass, 0 fail after adding `functions/*` to the workspace |

Note for Stage 4: `.sanity/` had its `stackId` removed by the destroy, so the
real blueprint starts from a fresh `blueprints init`.

#### Spec-first, so far

- **This was not a spec question, it was an empirical one.** No amount of
  reading would have settled it; the docs are wrong, not merely silent. The
  only way to know was to deploy something small and look.
- **The prompt design mattered more than the specs here.** Requiring a
  predetermined expected result, forbidding every route to a false pass
  (aliases, copies, dependency edits, package manager changes), and asking for
  exact error text on failure meant the answer could only be honest. A probe
  that merely deployed and logged something would have proved considerably
  less.
- **Failure would have been a better story.** The prompt said so explicitly. A
  precise reproduction of a documented gap is what a developer advocate files.
  Getting Outcome A instead produced a finding about the documentation's model
  being wrong, which is arguably better again.

#### Transcripts

Full prompts and outputs, unedited.

##### Prompt 1: design the probe and state the expected result (3:29 to 3:37 pm)

```text
Stage 4, first step: settle whether Sanity Functions can import `@cellar/core`.

This is the mitigation named in the Stage 2 proposal and it is the last
unverified technical risk in the project. The question: this repo is npm plus
TypeScript, and the Functions bundling docs describe pnpm plus TypeScript and
npm without TypeScript. Whether a workspace-linked local package survives
bundling is documented nowhere.

Read `CLAUDE.md`, ADR 0010, the Stage 4 section of `docs/build-plan.md`, and the
Stage 2 proposal's discussion of Functions bundling. Verify the current
Blueprints and Functions documentation through the MCP server rather than
relying on training data.

Do not write the real Stage 4 Functions. Build the smallest thing that answers
the question.

1. A blueprint manifest and lockfile at the repo root, per the Blueprints
   documentation.

2. One trivial Function that imports something real from `@cellar/core`, for
   example `resolvedWindow` or `bottleState`, and calls it against a minimal
   hardcoded snapshot. No document trigger side effects, no writes, and nothing
   that touches the production dataset.

3. The probe must have one deterministic expected result. Choose a minimal
   hardcoded snapshot that exercises real `@cellar/core` domain logic and state
   the expected output before deployment. A successful invocation means both:

   - the Function deployed with `@cellar/core` in its bundle, and
   - the runtime returned the expected domain result.

   Import success alone does not pass the gate.

   State the expected output in your proposal, before I approve deployment. I
   will hold you to that exact value. If the invocation returns something else,
   report what it returned rather than reinterpreting what the probe was
   testing.

4. Deploy it, invoke it, and report what actually happened.

Propose steps 1 through 3 and stop for my approval before deploying anything.

Deployment changes things outside the repo, so before deployment tell me
exactly what will exist in the Sanity project afterwards and exactly how to
remove it.

The first deployment attempt must test the repository as it exists now. Do not
add bundler aliases, copy `@cellar/core` into the Function, change the workspace
dependency declaration, change the package manager, or otherwise modify the
architecture to make the first attempt succeed. Otherwise we have not answered
the original question.

Report which of these three outcomes you hit:

### A. Native workspace import works

It bundles, deploys, invokes, and returns the predetermined expected result.

Record exactly how it worked in the ADR, including the relevant package,
Blueprint, and Function configuration. This closes the Functions bundling risk.

### B. Native import fails, but the documented escape hatch works

Capture the exact error from the first deployment attempt before changing
anything.

Then test the documented `transpile: false` escape hatch with a prebuilt
directory. If that deploys and the Function returns the predetermined expected
result, record both the workaround and its cost in the ADR.

Do not silently normalize this into the architecture. I want the additional
build steps, duplicated artifacts, configuration, or maintenance burden made
explicit.

### C. Neither approach works without changing package managers

Capture the exact errors from both attempts.

If the remaining path appears to require switching the workspace to pnpm, stop
and report before changing the package manager. Do not perform the migration.

If any attempt fails, preserve the actual error text. A precise error message
here is worth more to the friction log than a working deploy, since this is a
documented gap and that is the reportable finding.

Do not modify `@cellar/core` to make bundling easier. If the module itself would
need to change, say exactly what would need to change and why, and stop.

Do not turn the probe into production code. Its purpose is to answer one
architectural question. Once the result is recorded, the real Stage 4 Functions
will be designed separately.

Keep `@cellar/core` pure. Nothing in this experiment should add Sanity client
dependencies, environment access, network access, or clock reads to the shared
module.

This must run on Windows under PowerShell.
```

##### Prompt 1 output

```text
PowerShell(cd C:\Users\kenal\Cellar; npx sanity blueprints init --help 2>&1 | Select-Object -First 40; Write-Output "=== ADD ==="; npx sanity functions add --help 2>&1 | S…)
  ⎿  Error: Exit code 255
     node.exe : npm notice run cellar-monorepo@1.0.0 npx
     At line:1 char:1
     + & "C:\Program Files\nodejs/node.exe" "C:\Users\kenal\AppData\Roaming\ ...
     + ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
         + CategoryInfo          : NotSpecified: (npm notice run cellar-monorepo@1.0.0 npx:String) [], RemoteException
         + FullyQualifiedErrorId : NativeCommandError
      
     npm notice run sanity blueprints init --help
     Initialize a Blueprint and create a remote Stack
     … +74 lines (ctrl+o to expand)

● I have everything I need. Here is the proposal — nothing has been deployed, and no repo files have been changed yet.

  What I verified first

  The gap is still real, today, in the current docs. docs/blueprints/project-layout-and-monorepos (fetched via MCP, not training data) still states exactly two bundling cases:
  
  ▎ "For TypeScript Functions in a pnpm workspace, the CLI bundles inline using Vite."
  ▎ "For npm or yarn projects that doesn't use TypeScript, the CLI externalizes dependencies and ships them as a node_modules folder alongside the source."

  This repo is npm and TypeScript. Neither sentence covers it. The friction-log entry at friction-log.md:1344 is accurate as written.

  Other facts established:
  - Project aos9nze5, one dataset (production). No blueprint stacks exist yet (blueprints stacks → "No stacks found").
  - package-lock.json is already at the repo root, so the lockfile half of the co-location rule is satisfied. Only the manifest is missing.
  - sanity CLI 6.16.0 is installed; sanity functions exists locally with add, dev, logs, test.
  - sanity functions test is documented as "Invoke a local Sanity Function" — it runs local source and proves nothing about the deployed bundle. It cannot satisfy this gate.
  - @sanity/functions is not installed anywhere in the repo. Latest is 1.8.0. @sanity/blueprints 0.24.0 is present transitively; latest is 0.27.0.
  - The documented escape hatch is confirmed to exist: transpile: false with src: './functions/<name>/dist', plus autoResolveDeps: false.

  ---
  Step 1 — Blueprint manifest at the root

  sanity.blueprint.ts (new, repo root, beside the existing package-lock.json):

  import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

  export default defineBlueprint({
    resources: [
      defineDocumentFunction({
        name: 'cellar-core-probe',
        src: './functions/cellar-core-probe',
        event: {
          on: ['create'],
          filter: '_type == "bundleProbe"',
          resource: {type: 'dataset', id: 'aos9nze5.probe'},
        },
      }),
    ],
  })

  Created via npx sanity blueprints init . --blueprint-type ts --project-id aos9nze5 --stack-name probe, then the resource block written by hand.

  Three independent guards keep production untouched: the event is scoped by resource to a scratch dataset, the filter matches a _type that does not exist in the content model, and the handler performs no writes of any kind.

  Step 2 — The function

  functions/cellar-core-probe/index.ts:

  import {documentEventHandler} from '@sanity/functions'
  import {buildCellar, bottleState, type CellarSnapshot} from '@cellar/core'

  const SNAPSHOT: CellarSnapshot = { /* the 6 documents below */ }

  export const handler = documentEventHandler(async () => {
    const cellar = buildCellar(SNAPSHOT)
    const r = bottleState(cellar, 'bottle-probe', '2026-09-18')
    console.log('CELLAR_PROBE ' + JSON.stringify({
      state: r.state,
      sourceType: r.window?.sourceType ?? null,
      assessmentId: r.window?.assessmentId ?? null,
      drinkFrom: r.window?.drinkFrom ?? null,
      drinkUntil: r.window?.drinkUntil ?? null,
      visibleCount: r.window?.visibleCount ?? null,
    }))
  })

  No @sanity/client, no createClient, no env access, no network, no clock read, no patch. @cellar/core is imported and called, not touched.

  The snapshot — six hardcoded records chosen so the answer can only be right for the right reasons:

  ┌─────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │                 Doc                 │                                 Values                                  │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ wine wine-probe                     │ —                                                                       │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ bottle bottle-probe                 │ → wine-probe                                                            │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ acquisition acq-probe               │ acquiredAt 2020-01-01                                                   │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ assessment assess-critic            │ critic, assessed 2024-01-01, window 2030-01-01 → 2035-12-31, accepted   │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ assessment assess-personal          │ personal, assessed 2023-01-01, window 2024-01-01 → 2027-12-31, accepted │
  ├─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ assessment assess-personal-proposed │ personal, assessed 2026-01-01, window 2040-01-01 → 2045-12-31, proposed │
  └─────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘

  No consumptions. Evaluated at asOf = 2026-09-18, the Stage 2 oracle's now.

  This exercises three load-bearing rules at once, and each has a distinct wrong answer:

  - Authority beats recency (design rule 3 / ADR 0006) — the critic claim is two years newer than the personal one. If recency were checked first, the window would be 2030-01-01 → 2035-12-31 and the state would read HOLD.
  - Only accepted assessments resolve (design rule 4 / ADR 0011) — the proposed personal claim is the newest thing in the snapshot and the highest tier. If reviewState were ignored, the window would be 2040-01-01 → 2045-12-31 and the state would again read HOLD, with visibleCount of 3.
  - The state machine — 2026-09-18 falls inside 2024-01-01 → 2027-12-31, so DRINKING.

  Step 3 — The expected result, stated before deployment

  Hand-derived from the ADRs, then confirmed by running the built dist/ locally against the same snapshot. Both agree. The deployed function must log exactly:

  CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}

  Anything else is a failure, including a successful import that returns different values. If the log line differs, I will report the line verbatim rather than re-explaining what the probe was testing.

  Verification is npx sanity functions logs cellar-core-probe after creating one bundleProbe document in the scratch dataset.

  ---
  One judgment call I need to flag

  The first attempt requires adding functions/* to the root workspaces array, alongside the existing packages/*, app, studio, web.

  This is not me tilting the experiment. Without workspace membership, "@cellar/core": "*" in the function's package.json resolves against the public npm registry, where the package does not exist — a 404 during install, before the Functions bundler is ever reached. That would test npm, not the thing we are
  asking about. Workspace membership is also what studio/ and app/ already have, and it is what the Sanity monorepo doc recommends ("declare them in the workspace member that owns the Function code").

  The function declares its dependency in exactly the form the repo already uses:

  {"dependencies": {"@cellar/core": "*", "@sanity/functions": "^1.8.0"}}

  Everything on your prohibited list stays untouched: no bundler alias, no copy of @cellar/core into the function, no change to how @cellar/core declares or builds itself, npm stays npm, and the manifest carries no transpile or autoResolveDeps override on the first attempt.

  Repo changes: sanity.blueprint.ts, functions/cellar-core-probe/{index.ts,package.json}, functions/* added to root workspaces, @sanity/blueprints@^0.27.0 as a root devDependency for manifest types, a refreshed package-lock.json, and a .gitignore that blueprints init may append to. All revertible with git.

  ---
  What will exist in Sanity afterwards, and how to remove it

  ┌────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
  │                             Thing                              │                        Where                        │                                         Removal                                          │
  ├────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Blueprint Stack named probe, project-scoped                    │ Project aos9nze5 — counts against the 3-stack limit │ npx sanity blueprints destroy --force from repo root                                     │
  ├────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Function cellar-core-probe + its uploaded bundle asset         │ Same stack                                          │ destroyed with the stack                                                                 │
  ├────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ A robot token for the function, if the platform provisions one │ Robots in Sanity Manage                             │ destroyed with the stack; I will check Manage and report if one is left behind           │
  ├────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Dataset probe (private), holding one bundleProbe document      │ Project aos9nze5                                    │ npx sanity datasets delete probe                                                         │
  ├────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Function logs for the invocations                              │ Sanity's log retention                              │ npx sanity functions logs cellar-core-probe --delete after I have read and recorded them │
  └────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

  production is not read, written, queried, or referenced at any point. The one dataset-scoped trigger points at aos9nze5.probe.

  ---
  Approve and I will create the files, deploy, invoke, and report — including which of A, B, or C we landed on, with exact error text preserved if anything fails.

✻ Brewed for 5m 10s
```

##### Prompt 2: approval with three conditions (3:38 pm)

```text
Approved, with three conditions.

1. Do not commit or run any git command that changes the repo. This is now a
   standing rule; add it to CLAUDE.md under "How to work in this repo": no
   add, commit, rm, checkout, restore, reset, or push. Read-only git is
   fine. Write the commit message and tell me what to stage; I run it.

2. Before creating the probe dataset, check whether the trigger can be scoped
   to production with the non-existent _type filter instead. Three guards are
   already in place and the filter alone would prevent any invocation. If
   that works, skip the dataset entirely. If you are not confident it is
   safe, create the scratch dataset as proposed and say why.

3. After the probe, destroy the stack and report the stack count remaining,
   so Stage 4's real blueprint is not blocked by the limit. Check Manage for
   a leftover robot token as you offered.

The expected log line is recorded. I will hold you to it exactly:

CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}

Proceed.
```

##### Prompt 2 output

```text
Bash(cd C:/Users/kenal/Cellar && git status --short && echo "=== CORE UNTOUCHED? ===" && git diff --stat -- packages/cellar-core && echo "(empty above = unmodified)")
  ⎿   M .gitignore
      M CLAUDE.md
      M docs/ADRs/0010-time-machine-as-sanity-app.md
     … +8 lines (ctrl+o to expand)

● @cellar/core is unmodified — confirmed by git diff --stat. Let me verify the workspace change broke nothing.

● PowerShell(cd C:\Users\kenal\Cellar; npm test 2>&1 | Select-Object -Last 15)
  ⎿  ▶ display bucket and wine names
       ✔ DRINK_SOON is a bucket over DRINKING, not a state (0.5472ms)
       ✔ a HOLD bottle is never drink-soon (0.2823ms)
     … +12 lines (ctrl+o to expand)
  ⎿  (timeout 10m)

● Outcome A — native workspace import works
  
  The deployed Function returned the predetermined line, exact match:

  expected  CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}
  actual    CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}                                                                              

  First attempt, no escape hatch. No transpile: false, no prebuilt directory, no bundler alias, no copy of the module, no package manager change. git diff --stat -- packages/cellar-core is empty; the module was not touched.

  How it worked — and it is neither documented case

  The two documented sentences describe project-wide strategies. The CLI actually decides per dependency, and this repo got both at once:

  - @cellar/core was inlined and tree-shaken into the uploaded asset. The build emitted index.js plus five numbered chunks — buildCellar in index3.js, resolvedWindow in index5.js, the state machine in index6.js. There is no @cellar/core directory anywhere in the bundle.
  - @sanity/functions was externalised into a real shipped node_modules, with its @aws-lite and aws4 transitives.

  That split is the whole answer. A private workspace package never has to be installable, only resolvable at build time. The CLI's generated install manifest requests @sanity/functions and nothing else, so @cellar/core is never looked up in a registry and never gets the chance to 404. On Windows npm links
  workspace members as junctions, not POSIX symlinks, and the bundler followed the junction without complaint.

  One trap: the package.json copied into the built asset still lists "@cellar/core": "*", though nothing installs it there and nothing imports it at runtime. Inspecting that manifest to debug a bundle will mislead you.

  The configuration that worked is recorded in ADR 0010 under "Functions bundling, settled 2026-09-22" — package fields, workspace layout, function-level dependency declaration, and blueprint resource.

  Your three conditions

  1. Git. Already satisfied — CLAUDE.md:107-111 carries that rule verbatim, covering all seven commands plus read-only inspection. I made no edit and ran no write commands. CLAUDE.md shows as modified in git status because of your own edit.

  2. Production scoping — I did not take it. Scoping is safe; invoking is not. There is no way to invoke a deployed document function except by writing a document that matches its filter, so pointing at production would have meant creating a bundleProbe document in production, and deleting it afterwards
  leaves both mutations in the dataset's history permanently. A scratch dataset deletes whole. Created probe, used it, deleted it.

  3. Teardown, verified rather than assumed:

  ┌───────────────────┬─────────────────────────────────────────────────────┐
  │       Check       │                       Result                        │
  ├───────────────────┼─────────────────────────────────────────────────────┤
  │ blueprints stacks │ No stacks found — 0 of 3 used. Stage 4 is unblocked │
  ├───────────────────┼─────────────────────────────────────────────────────┤
  │ tokens list       │ No API tokens found                                 │
  ├───────────────────┼─────────────────────────────────────────────────────┤
  │ datasets list     │ production only                                     │
  ├───────────────────┼─────────────────────────────────────────────────────┤
  │ Function logs     │ deleted before the stack was destroyed              │
  └───────────────────┴─────────────────────────────────────────────────────┘

  On the robot token you asked me to check: one was created — labelled Function: cellar-core-probe, role editor, no expiry — even though the handler never constructs a client. It was removed cleanly by blueprints destroy. Stage 4 will get one per Function; worth auditing. Logged.

  Also verified: npm test → 390 pass, 0 fail. The functions/* workspace addition broke nothing.

  Files changed, and what to stage

  Recorded in docs/ADRs/0010-*.md and docs/friction-logs/friction-log.md (three new entries, plus the Session 2 open item now marked settled). No CHANGELOG.md update — Stage 4 has only had its first step, not completed.

  M  .gitignore                                  blueprints init appended Functions ignores
  M  docs/ADRs/0010-time-machine-as-sanity-app.md
  M  docs/friction-logs/friction-log.md
  M  package.json                                functions/* workspace, @sanity/blueprints devDep
  M  package-lock.json
  ?? sanity.blueprint.ts                          Stage 4 needs this at root — keep
  ?? functions/cellar-core-probe/                 probe only — see below

  CLAUDE.md and docs/friction-logs/session5.md are yours; I left both alone. .sanity/ is gitignored — note its stackId was removed by destroy, so Stage 4 starts with a fresh blueprints init.

  On the probe files: I left functions/cellar-core-probe/ on disk rather than deleting it, so you can inspect the evidence yourself — including the gitignored .build/ output that shows the chunk split. Nothing in it is production code and nothing imports it. My recommendation is to commit the docs and
  config, delete the probe directory once you have looked, and keep sanity.blueprint.ts, replacing its single resource when the real Stage 4 functions are designed. Deleting it is permanent for untracked files, which is why I have not done it.

  Suggested commit message:

  Settle Functions bundling for npm + TypeScript workspaces

  Deploy a throwaway probe Function importing @cellar/core and verify it
  returns a predetermined domain result. Native workspace import works with
  no escape hatch: the CLI inlines and tree-shakes the local package while
  externalising @sanity/functions, which is a hybrid of the two documented
  bundling cases and not either one.

  Add the blueprint manifest at the repo root beside the lockfile, add
  functions/* to the workspace, and record the result in ADR 0010 and the
  friction log. Closes the last unverified technical risk before Stage 4.

✻ Sautéed for 12m 4s
```