### 22 September 2026, Session 3

#### Stage 3: the App SDK gate

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to build: a Sanity App, built on the App SDK, rendering
Cellar Health from live production data through `@cellar/core`.
Outcome: gate passed at 10:53 am. Every count matched the Stage 2 oracle.
ADR 0010 resolved in favour of the App SDK; the Next.js fallback is not taken.
Elapsed: 10:11 to about 11:00 am, roughly 50 minutes.

The gate was deliberately written so the model could not declare it passed.
It has no browser, so the pass condition was six numbers rendered on screen,
confirmed by me. Screenshot: `docs/screen_shots/gate1.png`.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 10:11 to 10:17 am | Prompt 1: verify the App SDK against current docs, report conflicts, propose, stop | 4m 56s |
| 10:23 to 10:55 am | Prompt 2: approved decisions; scaffold the App and build Cellar Health | 24m 11s |
| 10:53 am | Gate confirmed by me in the browser | |
| 10:57 to 11:02 am | Prompt 3: switch `now` to the real date; record the gate outcome | 2m 42s |

#### The gate result

```
Cellar health
as of 2026-09-18

542 bottles

Not yet owned      0
Hold              45
Drinking         166
Past window       33
Unassessed         4
Consumed         294
Sum of states    542
No dataset health violations.
```

Every number matches `check.py`, which was written three days earlier, in a
different language, by a different method. Nothing was adjusted to make them
agree. The path proven end to end: production Content Lake, App SDK,
`CELLAR_QUERY`, `toCellarSnapshot`, `bottleState()`, rendered view.

#### Stale vendor guidance: three findings in one stage

This is the theme of the stage, and it is a pattern rather than three
separate complaints.

1. **Sanity's own bundled agent rule gives a command the CLI rejects.**
   Fetched through `get_sanity_rules`, the App SDK rule supplies a scaffold
   command with `--skip-mcp`. The installed CLI (8.12.0) has no such flag; it
   wants `--mcp` / `--no-mcp`. The command fails as written. The same rule
   also shows v2-era config patterns the v3 migration guide has since
   changed.
2. **The template it names is not listed as valid.** The `init` CLI reference
   enumerates exactly three templates, `clean`, `moviedb`, `page-builder`,
   and mentions no app template, while the App SDK quickstart instructs you
   to pass `--template app-quickstart`. Resolved by probing into a throwaway
   directory rather than guessing.
3. **The quickstart template pins the SDK a major version behind.** It
   installed `@sanity/sdk-react` 2.20.2; current is 3.4.0, and the reference
   documentation describes v3. Staying on v2 would have meant coding against
   docs for a version not installed, so the SDK was upgraded as a disclosed
   deviation.

A fourth, smaller one: the v3 config shape is ambiguous between the
quickstart and the v2-to-v3 migration guide, and had to be settled by reading
the installed `.d.ts`.

- *Would have helped:* version-stamping the agent rule file and the quickstart
  against the CLI and SDK versions they were written for, and a CI check that
  the commands in agent rules still parse.

#### The near-miss

Mid-build, the model concluded that the installed `QueryOptions` type had no
`perspective` option and that this contradicted the reference documentation.
It nearly reported a platform bug. The docs were right: `perspective` is
inherited through `QueryOptions` extends `DatasetHandle` extends
`PerspectiveHandle`, and the reference flattens inherited members while the
`.d.ts` does not.

It caught this itself and logged the near-miss rather than the non-bug. That
is the more useful finding, and it is a warning about this whole document: a
developer advocate who files bugs that turn out to be their own misreading
loses credibility quickly. Every platform finding here should survive the
question "did I read the whole type chain?"

#### Other platform friction

**Every documented path steers away from the one query the architecture was
built around.** `useQuery` appears only in the API reference, not in the
prose docs on React hooks or fetching content, and the bundled agent rule
says to ask before using it with raw GROQ. The recommended alternative,
`useDocuments` plus `useDocumentProjection`, would mean roughly 1,500 hook
instances and 1,500 round trips to produce six numbers. Approved `useQuery`
explicitly.

**Dashboard-mode auth is not obvious.** Opening `localhost:3333` directly
does not authenticate; the token arrives in the iframe URL hash from the
Dashboard, so the app must be opened through the Dashboard `?dev=` URL. Also
Chrome or Firefox only, since Safari's mixed-content handling breaks the dev
iframe.

**Port collision.** `sanity dev` and the App dev server both default to 3333,
so the Studio has to be stopped before the App runs, or the App moved and a
second CORS origin added.

#### Model behaviour

- **Verified rather than assumed, throughout.** It checked the CLI's actual
  flags with `--help`, read installed type definitions, confirmed peer
  dependency ranges against what the workspace resolves, and ran
  `CELLAR_QUERY`'s shape against the real dataset before writing any view.
- **It proved the module was really in the bundle,** grepping the built
  output for `PAST_WINDOW` and `_type == "assessment"` rather than trusting
  that the workspace symlink resolved.
- **Two disclosed deviations.** The SDK v2 to v3 upgrade, and adding
  `"types": []` to the core build config after a sibling workspace's
  `@types/react-dom` hoisted to the root and broke it. The second incidentally
  enforces design rule 6 at compile time: the pure module can no longer reach
  a DOM or Node global.
- **It did not claim the gate.** Asked to confirm something it could not
  observe, it gave the command, the URL, and the expected numbers, and
  stopped.

#### My errors

- **Ran `npm run build:core` from `studio/`.** Both commands run from the repo
  root. This is the second time this stage of mistake has cost time; the
  first was the NDJSON import path in Session 1. In both cases the
  instructions named the directory in prose rather than putting it in the
  command.

#### Spec-first, so far

- **Did the specs help here?** Differently than before. Stage 3 had no
  detailed spec to check against, only ADR 0010 and a build-plan line. What
  carried the stage was the Stage 2 boundary: because `@cellar/core` was pure
  and shipped its own query, the App was a thin consumer rather than a
  rewrite.
- **What the gate design bought.** Naming the full path, forbidding proxy
  verification, and putting the confirmation in my hands meant there was no
  way to report a pass that was not one. Worth repeating for later gates.
- **A caveat.** The date switch produced identical counts, because no state
  boundary falls between 18 and 22 September. The only visible evidence the
  switch took effect is the "as of" line. Had that line not been on screen,
  neither of us could have told a stale build from a working one.

#### Transcripts

Full prompts and outputs, unedited.

##### Prompt 1: verify and propose (10:11 to 10:17 am)

```text
Stage 3: the App SDK gate.

Read CLAUDE.md, ADR 0010, the Stage 3 section of docs/build-plan.md, and
packages/cellar-core, including its exported CELLAR_QUERY and
toCellarSnapshot.

Do not write code yet.

The App SDK is newer than most training data. Verify every API, hook,
configuration option, and CLI command you intend to use against the current
Sanity documentation through the MCP server. Do not rely on memory. Where the
docs are silent or ambiguous, say so rather than guessing.

First, identify any conflicts between the docs, this repo's structure, and
what this stage needs. Then propose the following and stop for my approval:

1. How the App is scaffolded, where it lives in the workspace (the Stage 2
   proposal named app/), and how it imports @cellar/core.
2. How it fetches data: which App SDK mechanism runs CELLAR_QUERY, how the
   published perspective is set, and whether results update live.
3. How it runs locally, and what deploying it would involve later. Deployment
   is not part of this stage.
4. The one view to build first: Cellar Health, showing bottle counts by state
   from bottleState() for every bottle.

The gate: that single view rendering real data from the production dataset,
inside Sanity. Nothing else in Stage 3 starts until it passes.

The view must display the date it is evaluating as of, and the total bottle
count, alongside the state counts.

Verification: with now fixed to 2026-09-18, the counts rendered by the
Cellar Health view from data fetched through the App SDK must match check.py
exactly:

- HOLD 45
- DRINKING 166
- PAST_WINDOW 33
- UNASSESSED 4
- CONSUMED 294
- 542 bottles total

Do not satisfy this gate by calling @cellar/core separately from the App,
querying the dataset through another tool, or relying only on the existing
test suite. The purpose of the gate is to prove the complete path:

Production Content Lake -> App SDK -> CELLAR_QUERY -> toCellarSnapshot ->
bottleState() -> rendered Cellar Health view

Existing tests and direct queries may be used to diagnose a mismatch, but they
do not constitute passing the gate.

You cannot see the rendered view, so do not report the gate as passed. When
you believe it is ready, give me the command to run, the URL to open, and
exactly what I should see. I will confirm the rendered counts myself.

Only after I confirm the rendered counts match does now switch to the real
date.

The module stays pure. The App passes now in; nothing in @cellar/core reads
the clock.

If you hit something the documentation does not cover, or an API that does
not behave as documented, stop and report it rather than working around it
silently. Workarounds are fine, but I want to know about each one.

This must run on Windows under PowerShell.
```

##### Prompt 1 output

```text
PowerShell(Set-Location 'C:\Users\kenal\Cellar'
            Write-Output '--- latest published versions ---'…)
  ⎿  --- latest published versions ---
     3.4.0
     3.4.0
     … +12 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

  Called Sanity 2 times (ctrl+o to expand)

● I've verified what I can and found several things worth your attention before I write anything.

  Conflicts and uncertainties

  Documentation that contradicts itself

  1. The bundled app-sdk rule file is out of date against SDK v3. Sanity's own agent rule (fetched via get_sanity_rules) gives this scaffold command:                                                                                                   

  npx sanity@latest init --template app-quickstart --organization <id> --output-path . --typescript --skip-mcp

  --skip-mcp does not exist. I ran sanity init --help against the installed CLI (8.12.0): the flag is --mcp / --no-mcp. The rule's command fails as written. The same rule also shows v2-era config patterns that the v3 migration guide has since changed.

  2. app-quickstart is not listed as a valid template. The init CLI reference enumerates exactly three templates — clean, moviedb, page-builder — and does not mention any app template. The App SDK quickstart tells you to pass --template app-quickstart. --help doesn't enumerate slugs, so I cannot settle this
  without running it. Plan: run it into a throwaway temp directory outside the repo first, confirm the slug resolves and see exactly what it generates, then integrate. I'll report what actually happens.

  3. The v3 config shape is ambiguous. The quickstart still shows const config: SanityConfig[] = [{projectId, dataset}]. The v2→v3 migration guide says the sources option is gone in favour of resources, the sanityConfigs prop became config, and "the singular resource option on SanityConfig now works as the
  instance's default." Whether {projectId, dataset} is still canonical or now wants {resource: {…}} is not stated anywhere I can find. Plan: read the installed .d.ts for SanityConfig after scaffolding and report which form the types require.

  4. useQuery is absent from the prose documentation. Neither "React Hooks" nor "Fetching and handling content" mentions it; both steer toward useDocuments + useDocumentProjection. It exists only in the API reference, and the app-sdk rule says "Ask first: before using useQuery with raw GROQ." So I'm asking
  — see §2.

  5. I could not pin down the default query perspective. Searched; found only tangential Content Releases material. I'll set perspective: 'published' explicitly rather than depend on a default I can't cite.

  Repo and platform

  6. Port collision. sanity dev (Studio) and the App dev server both default to 3333. The project has exactly one CORS origin — http://localhost:3333, credentials allowed — which the App can reuse as-is. But Studio and App cannot both run on defaults; the second needs -- --port 3334 and its own CORS origin
  if it touches the API.

  7. Schedule. ADR 0010 times this gate at end of day 4 and build-plan puts Stage 3 at days 5–8. The brief landed 2026-09-18. That gate is now.

  Verified good

  - Organization: opyntsvcl ("Ken W. Alger"), the only one.
  - @sanity/sdk-react and @sanity/sdk are both at 3.4.0, peer-requiring react ^19.2.0. The workspace resolves React 19.3.0 (studio) and 19.2.8 (web) — both satisfy it.
  - useQuery signature confirmed from the reference: takes query, params, projectId, dataset, resource, returns {data, isPending}, and "subscribes to changes, providing real-time updates."
  - QueryOptions.perspective exists, typed ReleasePerspective | ClientPerspective.
  - CELLAR_QUERY's projections are valid against the production dataset. I ran its shape through the API: 98 wines, 542 bottles, 542 acquisitions, 294 consumptions, 161 assessments; producer->name dereferences correctly; wines return title: null as designed.
  - Dashboard-mode auth: the Dashboard injects a token into the app's iframe via #token=…. This dictates how you open it — see §3.

  ---
  1. Scaffold, location, imports

  app/ at the workspace root, as Stage 2 proposed, alongside studio/, web/, and packages/.

  Scaffold in two steps, because the CLI wants to create its own node_modules, lockfile and possibly a git repo — none of which belong inside an existing npm workspace:

  npx sanity@latest init --template app-quickstart --organization opyntsvcl `
    --typescript --no-mcp --output-path $env:TEMP\cellar-app-probe -y

  Inspect what it generated, then move the source into app/, delete any nested package-lock.json and node_modules, add "app" to the root workspaces array, and run one npm install from the root. If --template app-quickstart is rejected, I stop and report rather than hand-rolling a scaffold.

  Importing @cellar/core: "@cellar/core": "*" in app/package.json, then import {CELLAR_QUERY, toCellarSnapshot, buildCellar, bottleState} from '@cellar/core'. This is the same workspace-symlink resolution already proven working in the Studio build, where I confirmed wineDisplayName was bundled into dist/.
  @cellar/core must be built first (npm run build:core) since the app imports dist/.

  2. Data fetching

  One useQuery call running CELLAR_QUERY, with perspective: 'published' passed explicitly.

  const {data} = useQuery<RawCellarResult>({
    query: CELLAR_QUERY,
    projectId: 'aos9nze5',
    dataset: 'production',
    perspective: 'published',
  })

  Then toCellarSnapshot(data) → buildCellar(…) → bottleState(cellar, id, NOW) per bottle, with buildCellar wrapped in useMemo keyed on the query result so 542 state computations don't rerun on every render.

  Why useQuery rather than the recommended hooks, since the rule says ask: computing these counts needs every bottle, every acquisition, every consumption and every accepted assessment. useDocuments + useDocumentProjection would mean roughly 1,500 hook instances and 1,500 round trips to produce six numbers,
  versus one query. Stage 2's entire data boundary — CELLAR_QUERY plus toCellarSnapshot — was designed around a single query string precisely so the App, Functions and the Next.js fallback could share it. Your call; I'd like it explicitly.

  Live updates: yes, useQuery subscribes, so publishing an assessment in the Studio re-runs the query and the counts move. Good for the demo, and it means the gate numbers will hold only while the dataset is unchanged.

  Purity: const NOW = '2026-09-18' is a constant in the App, passed into bottleState. Nothing in @cellar/core reads the clock — that stays true.

  3. Running locally, and deploying later

  npm run build:core                 # from the repo root
  npm run dev --workspace app        # starts on http://localhost:3333

  Open the Dashboard URL, not localhost. https://sanity.io/@opyntsvcl?dev=http://localhost:3333, then find the app in the sidebar. Opening http://localhost:3333 directly will not authenticate — in Dashboard mode the token arrives in the iframe's URL hash from the Dashboard, so the app has no session on its
  own. Chrome or Firefox, not Safari: the docs warn Safari's mixed-content handling breaks the dev iframe.

  CORS already permits http://localhost:3333 with credentials, so nothing to add. The Studio must not be running on 3333 at the same time.

  Deployment, not part of this stage: npx sanity deploy from app/, using the app.organizationId in sanity.cli.ts, with optional app.visibility of default or unlisted (never disabled — that makes the app unreachable).

  4. Cellar Health

  One view, no routing, no styling beyond legibility. It renders:

  - As of 2026-09-18 — stated on screen, since the whole argument is that state is evaluated at a date
  - 542 bottles total
  - Counts for all six states in state-machine order

  I'll display NOT_YET_OWNED too, expected 0, and a sum-of-states line. Showing a state the gate doesn't list — and showing that the parts total the whole — is what makes it evident nothing is being quietly filtered. 45 + 166 + 33 + 4 + 294 = 542, so NOT_YET_OWNED must be 0; if it isn't, something is wrong
  and I'd rather it be visible than hidden.

  ---
  The gate

  Once built, I'll give you the exact command, the URL, and the six numbers to check. I cannot see the rendered view, so I will not report this as passed — you confirm the rendered counts.

  To be explicit about what I won't do: I won't call @cellar/core from a script, query the dataset through the MCP server, or point at the test suite and call it done. The path being proven is Content Lake → App SDK → CELLAR_QUERY → toCellarSnapshot → bottleState() → rendered view, end to end. If the
  rendered numbers disagree, I'll use tests and direct queries to diagnose, and report rather than paper over it.

  Decisions I need: approval of useQuery (§2, the rule says ask), the two-step scaffold with a temp-directory probe (§1), and whether showing NOT_YET_OWNED and a sum line is wanted or noise (§4).

  I'll log the two stale-documentation findings — the rule file's --skip-mcp and the missing app-quickstart template — to docs/friction-logs/friction-log.md as part of the build, not now.

✻ Sautéed for 4m 56s
```

##### Prompt 2: decisions (10:23 to 10:55 am)

```text
Approved on all three.

§2 useQuery: yes, explicitly. Your reasoning is right and it is the reason
Stage 2 put CELLAR_QUERY and toCellarSnapshot in the module. Roughly 1,500
hook instances to produce six numbers is not a real alternative. Note in the
log that the documented path steers away from the one query the architecture
was designed around.

§1 Two-step scaffold with the temp-directory probe: yes. If
--template app-quickstart is rejected, stop and report rather than
hand-rolling.

§4 Show NOT_YET_OWNED and the sum line: yes. The sum proving the parts equal
542 is exactly what makes the gate checkable by eye.

Port: run the App on 3333 and keep the Studio down while gating, rather than
moving the App to 3334. Fewer moving parts, and CORS already allows 3333.

Log both stale-documentation findings during the build, and add the
SanityConfig shape question (#3) once you read the installed .d.ts. A rule
file shipped for agents that gives a command the CLI rejects is the single
most reportable thing in this stage.

One clarification on live updates: since useQuery subscribes, do not publish
or edit anything in the dataset while I am confirming the gate. The oracle
counts only hold against the dataset as imported.
```

##### Prompt 2 output

```text
PowerShell(Remove-Item -Recurse -Force (Join-Path $env:TEMP 'cellar-app-probe') -ErrorAction SilentlyContinue
            Write-Output "probe removed: $(-not (Test-Path (Join-Path $en…)
  ⎿  probe removed: True
     port 3333 in use: True

● PowerShell($c = Get-NetTCPConnection -LocalPort 3333 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($c) { $p = Get-Process -Id $c.OwningProcess -…)
  ⎿  PID 60072 : node : C:\Program Files\nodejs\node.exe
     
● Built and verified as far as I can without a browser. I'm not reporting the gate as passed — that's yours to confirm.

  Run it

  Port 3333 is currently occupied by a node process (PID 60072) — almost certainly your Studio dev server. Stop it first, then:
  
  cd C:\Users\kenal\Cellar
  npm run build:core
  npm run dev --workspace cellar-app

  The CLI prints a Dashboard URL. Open that, not localhost:3333 — in Dashboard mode the auth token arrives via the iframe's URL hash, so the app has no session on its own. It will look like:

  https://www.sanity.io/@opyntsvcl?dev=http%3A%2F%2Flocalhost%3A3333

  Chrome or Firefox, not Safari — the docs warn its mixed-content handling breaks the dev iframe. Find "cellar-app" in the Dashboard sidebar.

  What you should see

  Cellar health
  as of 2026-09-18

  542 bottles

  Not yet owned      0
  Hold              45
  Drinking         166
  Past window       33
  Unassessed         4
  Consumed         294
  ─────────────────────
  Sum of states    542      ← green when it equals 542, red otherwise
  No dataset health violations.

  Five gate numbers, plus NOT_YET_OWNED at 0 and the sum proving the parts equal the whole. Nothing is precomputed: each count is bottleState() evaluated per bottle against the event log, from one useQuery(CELLAR_QUERY) on the published perspective.

  One correction

  Mid-investigation I told you the installed QueryOptions had no perspective and that this contradicted the reference docs. That was wrong. perspective is inherited — QueryOptions extends DatasetHandle extends PerspectiveHandle — and the reference flattens inherited members while the .d.ts doesn't. The docs
  are correct; my read was incomplete. I nearly reported a platform bug that doesn't exist, and I've logged that near-miss because it's the more useful finding.

  Two deviations you should know about

  1. I moved the SDK from ^2 to ^3. The app-quickstart template pins ^2 and installed 2.20.2; latest is 3.4.0. The reference docs I verified everything against describe v3, so staying on v2 would have meant coding against docs for a version I wasn't running. Nothing in this app touches v3's removed APIs, so
  it was the one-line upgrade the migration guide describes. Now on 3.4.0.

  2. I added "types": [] to packages/cellar-core/tsconfig.build.json. Adding @types/react-dom for the app hoisted it to the workspace root, where the core build auto-included it and failed on missing DOM globals. This was latent fragility — core's build depended on whatever @types/* a sibling workspace
  happened to install. The fix also enforces design rule 6 at compile time: the module can't reach for a DOM or Node global because neither is in scope.

  Friction log

  Five entries appended to docs/friction-logs/friction-log.md, including the two you named plus the SDK version gap, the perspective chase, and — as you asked — the finding that every documented path steers away from useQuery, the one query the architecture was built around.

  Verification so far

  @cellar/core builds; all 390 tests pass; app tsc, eslint and prettier clean; sanity build succeeds. I grepped the produced bundle and confirmed PAST_WINDOW, Cellar health, Sum of states and _type == "assessment" are all in it — so the module and the query really are compiled into the app rather than
  resolved some other way.

  I have made no writes to the dataset, and won't while you're confirming.

  If the numbers disagree, tell me what rendered and I'll diagnose against the tests and direct queries rather than adjusting anything to match.

✻ Sautéed for 24m 11s
```

##### Prompt 3: gate passed, switch to the real date (10:57 am)

Sent as the commit message text, to signal the pass.

```text
Stage 3 gate passed: Cellar Health rendering live data in a Sanity App

Full path proven: Content Lake -> App SDK -> CELLAR_QUERY ->
toCellarSnapshot -> bottleState() -> rendered view. Counts match the
Stage 2 oracle exactly at now = 2026-09-18.
```

##### Prompt 3 output

```text
PowerShell(Set-Location 'C:\Users\kenal\Cellar'
●           npm run build:core 2>&1 | Select-Object -Last 1; Write-Output "core=$LASTEXITCODE"…)
  ⎿  Running…
     npm notice run tsc -p tsconfig.build.json
✢ Swicore=0
     … +8 lines (ctrl+o to expand)
  ⎿  (timeout 10m)
     
● Done. now is switched and the gate outcome is recorded.

  The date switch

  AS_OF = '2026-09-18' is gone. src/sanity.ts now exports today(), returning the viewer's local calendar date — local rather than UTC for the same reason the Studio's validation is, so someone west of Greenwich doesn't see yesterday's cellar all afternoon. CellarHealth reads it once per mount via useMemo,
  so every count on screen belongs to the same date and a re-render can't shift the cellar under the reader.

  The clock is read in the app. @cellar/core still never reads it — asOf and now remain parameters, which is what keeps the oracle meaningful.                                                                                                          

  One caveat worth knowing: I computed the counts at both dates offline, and they're identical.

  as of 2026-09-18        as of 2026-09-22
    HOLD          45        HOLD          45
    DRINKING     166        DRINKING     166
    PAST_WINDOW   33        PAST_WINDOW   33
    UNASSESSED     4        UNASSESSED     4
    CONSUMED     294        CONSUMED     294

  No state boundary falls in that four-day window. So the numbers won't move — the only visible evidence the switch took effect is the "as of" line now reading today's date. If that line still says 2026-09-18, the build is stale.

  Recorded

  ADR 0010 — status is now "Accepted; gate resolved 2026-09-22 in favour of the App SDK", with a Gate outcome section stating the counts it passed on, the exact path proven, and that the Next.js fallback is not taken. web/ stays and the module stays framework-neutral, so the option survives, but the
  decision is settled rather than provisional. I also noted there what the gate cost in documentation friction, since ADR 0010 predicted that would be the most valuable friction-log material the project produced and it turned out to be right.

  Changelog — a "Stage 3 (in progress)" entry above Stage 2. Not marked complete: Drink Soon, the asOf control, and Missed Opportunities are still ahead.

  build:core, 390 tests, app tsc, eslint, prettier and sanity build all clean.

  What's next

  Three views remain in Stage 3, and docs/build-plan.md is explicit that Missed Opportunities goes last. The asOf control is the natural next one — the today() seam is already shaped to become its starting value rather than its only value, and it's the feature the whole model exists for. Say the word and
  I'll propose it.

✻ Churned for 2m 42s
```