### 25 September 2026, Session 11

#### Deploying the App, and finding out a public dataset is not a public page

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected.
What I was trying to do: deploy the Sanity App, then build a version of it
that a judge with no Sanity account can open.
Outcome: the App is deployed. The public build is written and verified, and
it uncovered an access-control mechanism that invalidates how three earlier
sessions verified the dataset was readable. One CORS entry added, one real
defect found in the Studio, and a check that had been passing for the wrong
reason.
Elapsed: 09:25 am onward, with a pause from 09:40 to 09:47.

#### The deploy

Two dry runs. The first refused: no title, with an error naming the three
ways to supply one. The second, after setting `app.title` in
`app/sanity.cli.ts`, printed the whole file manifest, 15 files and 0.76 MB,
before creating anything.

Worth noting in the platform's favour, given how much of this project has
been spent on silent failures: the deployment was completely legible in
advance. A dry run that lists every file it would upload is the opposite of
the pattern Stage 4 kept running into.

The app is at
`https://www.sanity.io/@opyntsvcl/application/gcxu5htdwn5n9lc15m64sfpp`.

#### The finding: a public dataset is exempt from authentication, not from CORS

This is the important one, and it reaches backward through three sessions.

Asked whether an unauthenticated read from a `github.io` origin needs a CORS
entry, the answer was measured rather than guessed:

```
Origin: https://kenwalger.github.io  →  403  {"error":"Forbidden","message":"CORS Origin not allowed"}
Origin: http://localhost:3333        →  200  Access-Control-Allow-Origin: http://localhost:3333
no Origin header                     →  200
```

The third row explains why this was never visible. **Every anonymous query
this project has run went through curl, and curl sends no `Origin` header**,
so no CORS check ever applied. Session 9's exposure audit and session 10's
probe A both returned 200, both were true, and both tested a client that
structurally cannot fail this way. A browser always sends `Origin`, and a
browser is the only client that matters for a public demo.

So "the dataset is public" and "a web page can read the dataset" are
different claims, and the first was verified with a tool that cannot test the
second. The public/private setting governs *who* may read; the CORS allowlist
governs *from where*. The dataset was world-readable and simultaneously
unreadable from every origin on the internet except `localhost:3333`.

This is the third distinct access-control mechanism this project has had to
distinguish: dataset ACL, organization membership for Dashboard apps, and now
origin allowlisting. None of the three is discoverable from the surface the
other two are configured on.

The shape of the failure is worth recording too. It would not have appeared
until the page was live, because localhost is already allowlisted. **The
development environment is the one place this bug is invisible.**

The entry was added with `--no-credentials`, deliberately: a public read does
not need them, and an origin that cannot send credentials cannot be used to
ride a logged-in session. One consequence stated rather than buried: the
origin carries no path, so it permits any page under `kenwalger.github.io` to
read the dataset, not only this project's. It widens who may perform the
read, not what can be read, and it grants nothing curl could already do.

#### A check that cries wolf is worse than no check

The public-build walkthrough specified a grep of the built bundle for
credentials, `sk[A-Za-z0-9]{20,}`, on the reasoning that it costs five
seconds and the failure it catches is unrecoverable.

It fires on every clean build. The pattern matches
`skipCrossDatasetReferenceValidation` from `@sanity/client`.

A check that always fails gets waved through, and certifies exactly as little
as a check that can never fail. This is session 8's vacuous test finding from
the opposite direction, and it is the sharper version, because a false
positive does not look broken. It looks diligent. Tightened to `{40,}`, and
found by running the check rather than by shipping it.

#### A plan describes work that was scheduled, not work that is left

The Stage 5 polish list was drafted from `docs/build-plan.md`. Checking it
against the code found three of its twelve items already done: all six
document types declare icons and previews, and the assessment preview already
renders the `extracted` marker required by ADR 0012.

That is spec-first's own failure mode, and worth recording as one. A
specification is a claim about intent, and reading it as a claim about state
produces confident, wrong work lists.

#### The defect the check turned up

Asked to verify whether `wine.title` being empty on all 98 wines meant the
wine list rendered as "Untitled", the answer was no: `wine.ts` already calls
`wineDisplayName` in its `prepare`, with `title` as an optional override.

The bottle list is the actual defect. `bottle.ts` composes its own label
instead of using the shared function, falling back to vintage plus cuvée when
the wine has no title, which it never does. So all 542 bottle rows drop the
producer, and 98 wines collapse to 70 distinct labels. "2023 Pinot Noir" is
three different producers.

Smaller than feared, on a different list than expected, and real. It is also
the list a judge browsing the dataset lands on. Fifteen minutes, now marked
not cuttable.

#### Vite 8 refuses JSX that tsconfig calls "preserve"

The public build needs plain Vite, and the first attempt failed for a reason
unrelated to the config name: Vite 8 bundles through rolldown and oxc, reads
`jsx: "preserve"` from tsconfig, and refuses JSX outright.

The first fix, `esbuild: {jsx: 'automatic'}`, does not typecheck against Vite
8, because `ESBuildOptions` no longer carries a `jsx` key. esbuild is not
what transforms anymore. Fixed at the source by setting `"jsx": "react-jsx"`,
which is what the app actually is, then re-running `sanity build` to confirm
the other surface was unaffected.

#### The structure that keeps one implementation

The constraint on the public build was that it must not fork the views. Only
two files import the App SDK, so the split lands cleanly: the context moves to
its own file that imports nothing from Sanity, a shell holds the masthead,
`asOf` state, Suspense and the three views, and each entry passes a different
provider into it.

`CellarHealth`, `DrinkSoon`, `MissedOpportunities`, `AsOfControl` and their
helpers are untouched. They cannot drift because there is one copy.

What is lost is live updates: `useQuery` subscribes, a plain fetch is a
snapshot at page load. It does not matter here, and for a specific reason.
The interactive part of the demo is the `asOf` control, which is pure
client-side computation over an already-fetched ledger. Every number a judge
makes move, they move without a network request.

#### Verification

A live test issues a raw fetch carrying the published origin, asserts the 200
and the absence of an allow-credentials header, then runs the same
`fetchCellar()` the provider uses and checks the counts at all five
verification dates against the committed oracle.

The Origin assertion is the interesting half. Node does not enforce CORS and
`@sanity/client` sends no Origin from Node, so nothing else in the repository
can see that failure mode. It is kept out of `npm test` by filename so the
offline suite stays deterministic.

State: 407 core tests, 119 app tests, 9 live tests, all green. The public
bundle is 367 kB with no App SDK auth code in it.

#### Consequences for the submission

A line in the submission draft is now wrong. It said the data was always
publicly readable and the SDK refused. That is accurate for curl and not for
browsers.

The corrected version is better: three separate access-control mechanisms had
to be distinguished to get one page working, and none of them is discoverable
from the surface the others are configured on.

#### Build findings

### Findings

#### A public dataset is exempt from authentication, not from CORS

The question was whether an unauthenticated read from a `github.io` origin
needs a CORS entry. It does, and the measurement is unambiguous:

| Request | Result |
| --- | --- |
| `Origin: https://kenwalger.github.io` | **403** `{"error":"Forbidden","message":"CORS Origin not allowed"}` |
| `Origin: http://localhost:3333` | 200, `Access-Control-Allow-Origin: http://localhost:3333` |
| no `Origin` header | 200 |

Both the API host and `apicdn` behave identically.

The third row is the one that explains why this was not obvious sooner. Every
anonymous query this project has run, the exposure audit in session 9, probe A
in session 10, went through curl, and **curl sends no `Origin` header**, so no
CORS check ever applied. Every one of those requests returned 200 and each was
read as evidence that the dataset answers anonymous readers. It does. But a
browser always sends `Origin`, and a browser is the only client that matters
for a public demo.

So "the dataset is public" and "a web page can read the dataset" are different
claims, and the first was verified with a tool that structurally cannot test
the second. The public/private setting governs *who* may read; the CORS
allowlist governs *from where*. A dataset can be world-readable and
simultaneously unreadable from every origin on the internet, which is the
current state of this one.

This is the third distinct access-control mechanism the project has had to
distinguish, dataset ACL, organization membership for Dashboard apps, and now
origin allowlisting, and none of the three is discoverable from the surface
that the other two are configured on.

The practical shape of the failure is also worth recording: it would not have
appeared until the page was live on Pages, because localhost is already
allowlisted. The development environment is the one place the bug is invisible.

#### The deploy asks for an app icon and a title, and only one of them was a blocker

`sanity deploy --dry-run` refused the first attempt for a missing title, with
an error that named the three ways to supply one. The same run printed
`Manifest creation skipped: no icon or title found in app configuration`, a
notice rather than a failure, and after the title was set the manifest was
extracted with the icon still absent.

Worth noting in the app's favour: `--dry-run` reported the complete file
manifest, 15 files and 0.76 MB, before anything was created. The whole
deployment was legible in advance, which is unusual and is the opposite of the
silent-failure pattern this project logged repeatedly in Stage 4.

Both items are now in `docs/stage-5-polish.md`, along with the `deployment.appId`
the CLI asked to have saved, which is not polish but will be lost if it is not
written down, since without it a later deploy risks creating a second
application instead of updating the first.

#### The CORS origin, added, and what it actually grants

`npx sanity cors add https://kenwalger.github.io --no-credentials`, run and
verified: the request that returned 403 now returns 200 with
`Access-Control-Allow-Origin: https://kenwalger.github.io` and no
`Access-Control-Allow-Credentials`.

The honest framing of what was granted: **the origin has no path**, so this
permits any page published under `kenwalger.github.io` to read the dataset,
not only this repository's. It is a broader grant than the command makes it
look, and it should be understood as a decision rather than as a side effect.

It also grants nothing that curl could not already do. `production` has been
world-readable since 18 September; an anonymous HTTP client could always read
all 1,645 documents, and this changes only whether a *browser* is permitted to
do the same thing. The entry widens who can perform the read, not what can be
read.

`--no-credentials` is the part that does narrow it. The existing
`localhost:3333` entry allows credentials because the Studio needs them; this
one cannot send a cookie or token, so a page under that origin cannot use a
signed-in visitor's session to reach anything the anonymous reader could not.

#### Vite 8 reads `jsx: "preserve"` and refuses to build

The public build failed on its first run with:

```
public-entry/main.tsx:15:30
Help: JSX syntax is disabled and should be enabled via the parser options
```

`app/tsconfig.json` set `"jsx": "preserve"`, with a comment explaining the
choice: tsc is only a checker here, `noEmit` is set, and `sanity build` owns
the transform. That reasoning was correct and is now incomplete. Vite 8 bundles
through **rolldown/oxc** rather than esbuild, and oxc takes its JSX handling
from tsconfig, so `preserve` is not a statement about tsc alone, it is a
statement to every tool that reads the file, and one of them treats it as
"reject this syntax".

The first attempt at a fix was to override it in the Vite config with
`esbuild: {jsx: 'automatic'}`. That is the answer for Vite 5–6 and it does not
typecheck against Vite 8: `ESBuildOptions` no longer carries a `jsx` key,
because esbuild is no longer what does the transforming. The published guidance
for "set JSX mode in Vite" is a version behind the installed package, which is
the same drift pattern this project has now logged across six Sanity packages
and one bundler.

Resolved by setting `"jsx": "react-jsx"` in tsconfig, which is what the app
actually is, and re-running `sanity build` to confirm the other surface is
unaffected. It is.

#### Three Stage 5 items were already done, and the list said otherwise

`docs/stage-5-polish.md` was drafted from what `build-plan.md` says Stage 5
will contain. Checking the schema files afterwards found that three of its
twelve items were finished: all six document types already declare an `icon`,
all six declare a `preview`, and `assessment`'s preview already renders the
`extracted` marker exactly as ADR 0012 specifies.

The general shape, which is worth more than the three rows: a todo list written
from a plan describes the work that was *scheduled*, not the work that is
*left*, and those diverge silently as things get done ahead of schedule. The
plan is not a record of state and reading it as one produces a list that is
confidently wrong in the direction of more work.

What it did find, by checking rather than assuming: `bottle.ts` composes its own
preview label instead of calling `wineDisplayName`, so with `wine.title` empty
on all 98 wines every bottle row falls back to vintage-plus-cuvée and drops the
producer. 98 wines collapse to 70 distinct labels; "2023 Pinot Noir" is three
different producers. A real defect, found only because the list was checked
against the code.

#### A secret scan that cries wolf is worse than no secret scan

The public bundle is permanently readable once published, so
`docs/public-build.md` specified a grep for token-shaped strings before
deploying. Its pattern, `sk[A-Za-z0-9]{20,}`, reports a hit on every clean
build: `skipCrossDatasetReferenceValidation`, an identifier inside
`@sanity/client`.

Caught by running the check rather than by shipping it. Tightened to `{40,}`,
which excludes the 35-character identifier and still matches a real token.

The failure mode is the interesting part and it is the same one session 8 found
in the vacuous tests, pointing the other way. A test that cannot fail certifies
nothing; a check that always fails gets waved through, and then certifies
nothing either. Both look like diligence in the diff.

#### Transcripts

Full prompts and outputs, unedited.

##### Deploy dry run, first attempt

```text
Cellar\app on  main via  v26.3.0
❯ npx sanity deploy --dry-run
npm notice run cellar-monorepo@1.0.0 npx
npm notice run sanity deploy --dry-run
✔ Clean output folder (34ms)
✔ Build Sanity application (1224ms)
✔ Verifying local content...
ℹ Manifest creation skipped: no icon or title found in app configuration

Dry run, no changes made.

✔ Using @sanity/sdk-react 3.4.0
✔ Organization: opyntsvcl
✔ App built

This application can't be deployed.

Problems to fix:
✖ No application to deploy to, creating one needs a title: Pass `--title "<name>"` or set `app.title` in sanity.cli.ts to create one, or set `deployment.appId` to deploy to an existing app
»   Error: Deploy blocked by failing checks.
```

##### Deploy dry run, after setting a title

```text
Cellar\app on  main [!] via  v26.3.0 
❯ npx sanity deploy --dry-run
npm notice run cellar-monorepo@1.0.0 npx
npm notice run sanity deploy --dry-run
✔ Clean output folder (44ms)
✔ Build Sanity application (2357ms)
✔ Verifying local content...
✔ Extracted manifest

Dry run, no changes made.

  ✔ Using @sanity/sdk-react 3.4.0
  ✔ Organization: opyntsvcl
  ✔ Would create a new application "The Cellar"
  ✔ App built

This application can be deployed.

Files to deploy (15 files, 0.76 MB):
  dist/favicon.ico (0.00 MB)
  dist/index.html (0.01 MB)
  dist/static/apple-touch-icon.png (0.00 MB)
  dist/static/browserUpload-BTQyjHMj-DXn-_hPS.js (0.00 MB)
  dist/static/favicon-192.png (0.00 MB)
  dist/static/favicon-512.png (0.01 MB)
  dist/static/favicon-96.png (0.00 MB)
  dist/static/favicon.ico (0.00 MB)
  dist/static/favicon.svg (0.00 MB)
  dist/static/isRecord-Kfmt-nk--BGze3w87.js (0.00 MB)
  dist/static/manifest.webmanifest (0.00 MB)
  dist/static/request-CYLhJzOA-B1VtVp4a.js (0.03 MB)
  dist/static/sanity-36R7kUkj.js (0.69 MB)
  dist/static/sanity-ob4li9iK.css (0.01 MB)
  dist/static/stegaEncodeSourceMap-Dj29aWKG-DrrksP-g.js (0.00 MB)
```

##### The deploy

```text
Cellar\app on  main [!+] via  v26.3.0 
❯ npx sanity deploy
npm notice run cellar-monorepo@1.0.0 npx
npm notice run sanity deploy
ℹ No application ID configured
✔ Creating application
✔ Clean output folder (7ms)
✔ Build Sanity application (1481ms)
✔ Verifying local content...
✔ Extracted manifest
✔ Deploying...

Success! Application deployed to https://www.sanity.io/@opyntsvcl/application/gcxu5htdwn5n9lc15m64sfpp, "The Cellar"
Created a new application.

════ Next step: ════

Save `deployment.appId` to update this application on later deploys.

Add the deployment.appId to your sanity.cli.js or sanity.cli.ts file:

app: {
  // your application config here…
},
deployment: {
  appId: 'gcxu5htdwn5n9lc15m64sfpp',
}


Cellar\app on  main [!+] via  v26.3.0 took 11s
```

##### Prompt 1: public build proposal, polish list, Pages walkthrough

```text
Three tasks. Do not write code for task 1 until I approve the plan.

1. A public build of the App, for GitHub Pages.

   Session 9 established that the App SDK has no anonymous-read mode:
   AuthBoundary redirects a logged-out visitor before any query is issued,
   and every typed auth route resolves to a user token. Session 10 confirmed
   it by observation, and also confirmed that the production dataset answers
   unauthenticated queries (1,645 documents, HTTP 200, no token).

   So the four views need to run without the App SDK. Everything downstream
   of CellarProvider takes a Cellar object and knows nothing about Sanity, so
   I expect this to touch one file plus an entry point.

   Propose, then stop:

   a. Where the public build lives. It must not fork the views. If
      CellarHealth, DrinkSoon, MissedOpportunities, AsOfControl and their
      helpers get copied rather than shared, the two surfaces drift and I
      would rather not have it at all. Say how you would structure it so
      there is exactly one implementation of each view.
   b. How it fetches. A plain @sanity/client read of CELLAR_QUERY against
      the public dataset, published perspective, no token, no credentials in
      the bundle. Confirm useCellar's contract can be satisfied this way
      without the views knowing which surface they are on.
   c. What is lost. The App SDK version has live updates through useQuery's
      subscription. Say what the public build does instead and whether that
      matters for a read-only demo.
   d. The base path. GitHub Pages serves from a subpath unless a custom
      domain is used. Say what Vite needs and what breaks if it is wrong.
   e. CORS. Say whether an unauthenticated read from a github.io origin
      needs a CORS entry for the project. That is a project-config write and
      I have not authorized one. Tell me before you need it.
   f. How I verify it, given you cannot see a browser. The counts must match
      the App exactly at the five verification dates.

2. docs/stage-5-polish.md, a todo list, not the work.

   The challenge brief asks how deep the submission got into Sanity's
   features and whether the interface was customized, so this is judged
   rather than cosmetic. Record each item with what it is, why it earns its
   place, and a rough cost. Include at least: counts beside the review queue
   lists (Awaiting review, Accepted, Rejected), an app icon for the Dashboard
   entry, the drinking-window bar input on assessment, a past-window badge on
   bottles, and structure organized by state. Add anything else you think
   belongs. Mark which are cuttable.

3. A GitHub Pages walkthrough, written to docs/public-build.md: the exact
   steps to turn Pages on for kenwalger/Cellar, what to commit, whether to
   use a branch or an action, and how to confirm it is live.

Standing rules: no git commands that change the repo, no writes to any
dataset or project config without telling me first, write the commit message
and tell me what to stage. Friction log entries go to
docs/friction-logs/session11.md.
```

##### Prompt 1 output

```text
● Tasks 2 and 3 are written. Task 1 is a proposal only, no code.

  First, a blocker you asked to hear about early

  (e) CORS: yes, you need an entry, and I measured it rather than guessed.
  
  Origin: https://kenwalger.github.io  →  403  "CORS Origin not allowed"
  Origin: http://localhost:3333        →  200  Access-Control-Allow-Origin: http://localhost:3333
  no Origin header                     →  200

  Same on api and apicdn. A public dataset is exempt from authentication, not from origin checking.

  The third row is why this hasn't bitten before: every anonymous query this project has run went through curl, and curl sends no Origin header, so no CORS check ever applied. Those 200s in session 9's exposure audit and session 10's probe A were real, but they tested a client that structurally cannot fail
  this way. A browser always sends Origin. The dataset is world-readable and currently unreadable from every origin on the internet except localhost:3333.

  It would also have stayed invisible right up until the page went live, because localhost is already allowlisted.

  The write I'd need, not run:

  npx sanity cors add https://kenwalger.github.io --no-credentials

  --no-credentials deliberately, a public read doesn't need them, and an origin that can't send credentials can't ride a logged-in session. One caveat: the origin has no path, so this permits any page under kenwalger.github.io to read the dataset, not just this repo. It grants nothing curl couldn't already
  do, but it's broader than it looks.

  (a) Structure, one implementation, guaranteed

  Only two files import the App SDK: App.tsx and CellarProvider.tsx. The three views import useCellar from CellarProvider, which is the one thing forcing the SDK into their dependency graph. So:

  ┌──────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │             File             │                             Change                              │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ src/cellarContext.ts         │ new, CellarContext + useCellar, imports nothing from Sanity    │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ src/CellarProvider.tsx       │ keeps useQuery, now imports the context                         │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ src/PublicCellarProvider.tsx │ new, @sanity/client fetch                                      │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ src/CellarShell.tsx          │ new, masthead, asOf state, Suspense, the three views           │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ src/App.tsx                  │ <SanityApp><CellarShell Provider={CellarProvider}/></SanityApp> │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ src/PublicApp.tsx            │ new, <CellarShell Provider={PublicCellarProvider}/>            │
  └──────────────────────────────┴─────────────────────────────────────────────────────────────────┘

  CellarHealth, DrinkSoon, MissedOpportunities, AsOfControl, drinkSoonRows, missedRows, dates are not touched at all. They can't drift because there's only one copy, in one directory, imported by both entries. The shell means the masthead and the Suspense placement don't fork either, the only thing that
  differs between surfaces is which provider is passed in.

  One tooling risk I want to flag rather than paper over: the public build needs plain Vite, and I don't know whether a vite.config.ts in app/ would be picked up by sanity build. Mitigation is to name it vite.public.config.ts and pass -c, so it can't be auto-discovered, but that's a thing to verify, not
  assume. Vite 8.3.0 is already present transitively; @vitejs/plugin-react isn't, and may not be needed for a build-only pipeline since esbuild handles TSX from tsconfig.

  (b) Fetching, contract satisfied

  useCellar returns a Cellar or throws. Nothing in that signature mentions Sanity. The public provider runs the identical pipeline, CELLAR_QUERY → toCellarSnapshot → buildCellar, so the views receive a byte-identical object.

  createClient({projectId, dataset: 'production', apiVersion, useCdn: true, perspective: 'published'}), no token, no withCredentials. Nothing secret exists to leak: the project ID is already in three committed files.

  React 19.2 is installed, so the provider can use() a module-scope promise and genuinely suspend, which means the shell's Suspense boundary stays meaningful and both surfaces behave the same way while loading, rather than one suspending and the other rendering a spinner.

  (c) What's lost

  Live updates. useQuery subscribes; a plain fetch is a snapshot at page load.

  It doesn't matter here, for a specific reason: the interactive part of the demo is the asOf control, and that is pure client-side computation over an already-fetched ledger. CellarProvider's own comment says asOf is deliberately absent from the query options because there's nothing date-shaped to
  invalidate. Every number a judge makes move, they move without a network request. The seed data is also static, nothing is writing to production during judging.

  I'd rather state that plainly in the writeup than add polling to simulate a liveness nobody will observe.

  (d) Base path

  base: '/Cellar/' in the Vite config. Pages serves https://kenwalger.github.io/Cellar/, and Vite's default base: '/' emits <script src="/assets/…">, which resolves to kenwalger.github.io/assets/…, wrong host root, 404, blank page with no error on screen. The failure is silent in the page and loud only in
  the console, which is the worst combination. A .nojekyll file is cheap insurance too.

  (f) Verification without a browser

  The strongest check doesn't need one. Both surfaces run the same three functions over the same query, so I'd add a test that fetches live via @sanity/client, the public path's exact transport, and asserts the counts at all five verification dates (1999-06-01, 2019-12-31, 2023-03-15, 2025-06-01,
  2026-09-18) against the committed oracle. If that passes, the only untested thing is whether the browser renders it, which your eyes confirm in one pass.

  Plus the bundle check in docs/public-build.md: grep the built assets for sk[A-Za-z0-9]{20,}, expect nothing. Five seconds, catches the one unrecoverable mistake.

  ---
  Two documents written: docs/stage-5-polish.md (twelve items with cost and cut markers, review-queue counts first, since session 10 supplied the evidence; window-bar input marked first to cut) and docs/public-build.md (Actions over a gh-pages branch, since the repo already gitignores dist).

  Two things surfaced from your deploy log that I put in the polish doc: the missing app icon the dry run warned about, and deployment.appId: 'gcxu5htdwn5n9lc15m64sfpp', without saving that to app/sanity.cli.ts, a later deploy risks creating a second application rather than updating the first, and undeploy
  can't find it at all.

  To stage: docs/public-build.md, docs/stage-5-polish.md, docs/friction-logs/session11.md. Commit message in commit-message.txt.

  Awaiting approval on task 1, and separately on the CORS write.

✻ Crunched for 5m 12s
```

##### Prompt 2: approval, plus the CORS write

```text
Approved: task 1 as proposed, and the CORS write.

Run: npx sanity cors add https://kenwalger.github.io --no-credentials

I accept that this permits any page under kenwalger.github.io, and that it
grants nothing curl could not already do. Say so in the friction log with
that framing, since it is the honest version.

On task 1, three notes:

1. Name it vite.public.config.ts and pass -c as you propose, and verify
   rather than assume that sanity build does not pick it up. If it does,
   stop and tell me before working around it.

2. The live-fetch test at all five verification dates is the right check.
   Make it explicit that it uses the same transport as the public build,
   including the Origin behaviour if that is testable from Node.

3. Item 8 in the polish doc says wine.title is populated on zero of 98
   documents and the wine list may be rendering as "Untitled". Check that
   now, before anything else. If it is true, it is a defect rather than
   polish and it moves to the top, because it is the list a judge browsing
   the dataset lands on.

Do not start Stage 5 items. Task 1 only.
```

##### Prompt 2 output

```text
Done. Task 1 built and verified.

  Note 3 first, as asked, and it's half right

  The wine list is fine. wine.ts already calls wineDisplayName in its prepare, with title as an optional override, so a wine with no title renders "2023 Farm on Golden Hill Pinot Noir". My polish item was wrong.
  
  The bottle list is the actual defect. bottle.ts composes its own label instead:

  const wine = wineTitle || [vintageYear, cuvee].filter(Boolean).join(' ')

  With wine.title empty on all 98 wines, every one of 542 bottle rows takes the second branch, no producer. Measured: 98 wines collapse to 70 distinct labels. "2023 Pinot Noir" is three different wines (Farm on Golden Hill, Paradis Vineyards, St. Josef's).

  Smaller than feared and on a different list than expected, but real. 15-minute fix, now marked not-cuttable.

  While checking, three polish items turned out to be already done, all six types declare an icon and a preview, and the assessment preview already renders the extracted marker per ADR 0012. I'd drafted that list from build-plan.md rather than from the code, and a plan describes work that was scheduled,
  not work that is left. Both the correction and the reason are in the doc.

  CORS: added and verified

  403 → 200, Access-Control-Allow-Origin: https://kenwalger.github.io, no allow-credentials header. Your framing is in the friction log verbatim: the origin has no path so it covers any page under that host, and it grants nothing curl could not already do, it widens who may perform the read, not what can
  be read.

  Note 1: verified, not assumed

  sanity build ran clean with vite.public.config.ts present, it does not pick it up. Vite only auto-discovers vite.config.*, and the entry lives in public-entry/ so there's no index.html at the package root either.

  One thing did break, and it wasn't the config name. Vite 8 bundles through rolldown/oxc, which reads tsconfig's jsx: "preserve" and refuses JSX outright. My first fix, esbuild: {jsx: 'automatic'}, doesn't typecheck against Vite 8, because ESBuildOptions no longer has a jsx key; esbuild isn't what
  transforms anymore. Fixed at the source by setting "jsx": "react-jsx", which is what the app actually is, then re-running sanity build to confirm the other surface is unaffected.

  Note 2: same transport, Origin included

  publicClient.ts holds the client and fetchCellar(). The provider and the test both import that function, so the test exercises what ships rather than something equivalent.

  The Origin behaviour is testable from Node, but only by hand, and that's what makes it worth having. Node doesn't enforce CORS and @sanity/client sends no Origin from Node, so the test issues a raw fetch with the published origin and asserts the 200 and the absence of an allow-credentials header. It's
  the one failure mode no other test in the repo can see, and it fails loudly with the re-add command in the message if the allowlist entry ever disappears.

  ✔ serves https://kenwalger.github.io, the origin the build is published from
  ✔ does not allow credentials from that origin
  ✔ fetched the whole ledger
  ✔ reports 0 of 4 drinking at 1999-06-01
  ✔ reports 0 of 39 drinking at 2019-12-31
  ✔ reports 0 of 122 drinking at 2023-03-15
  ✔ reports 10 of 147 drinking at 2025-06-01
  ✔ reports 23 of 166 drinking at 2026-09-18
  ✔ accounts for every in-cellar bottle in exactly one state

  It's test:live, not in npm test, the filename ends .live.mts, which the default glob doesn't match, so the offline suite stays deterministic.

  One more thing the scan caught

  The secret grep I'd specified in public-build.md, sk[A-Za-z0-9]{20,}, fires on every clean build, it matches skipCrossDatasetReferenceValidation from @sanity/client. Found by running it rather than by shipping it. Tightened to {40,}. Same shape as session 8's vacuous tests from the other direction: a
  test that can't fail certifies nothing, and a check that always fails gets waved through and certifies nothing either.

  State

  407 core tests, 119 app tests, 9 live tests, all green. Both builds clean, lint and format clean. Public bundle is 367 kB with no App SDK auth code in it.

  Not done, as instructed: no Stage 5 items, and the Pages workflow file isn't written yet, docs/public-build.md has its contents, but turning Pages on needs the repo setting changed in the browser.

  Stage list is at the bottom of commit-message.txt, 17 app files and 3 docs. app/dist-public/ is build output and already covered by .gitignore.

✻ Brewed for 9m 46s
```