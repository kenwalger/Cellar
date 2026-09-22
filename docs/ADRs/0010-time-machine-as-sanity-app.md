# ADR 0010: The temporal view is a Sanity App, not a separate frontend

Date: 2026-09-18
Status: Accepted; gate resolved 2026-09-22 in favour of the App SDK
Supersedes: ADR 0007

## Context

ADR 0007 split the project across two surfaces on the grounds that Studio has
no native global date control, so the asOf experience had to live in a
separate frontend. That reasoning was sound for Studio.

The published brief names the App SDK as a bonus, described as building a
custom app on top of your content, with real-time data and your own interface,
instead of another read-only frontend. That is precisely the thing ADR 0007
concluded was impossible, offered as a first-class surface and rewarded
explicitly.

A separate Next.js frontend would now be the least differentiated choice
available, since it is what most of the field will submit.

## Decision

Build the temporal view as a Sanity App using the App SDK: cellar health,
Drink Soon, the asOf control, and Missed Opportunities, running inside Sanity
with its own interface rather than beside it.

This is timeboxed. If the App SDK is not rendering real data by end of day 4,
fall back to the Next.js frontend described in ADR 0007 and treat the attempt
as friction log material rather than as lost time.

## Consequences

- The split described in ADR 0007 collapses. Authoring, governance, and the
  temporal view all live in one place, which is a better demo and a simpler
  story.
- The temporal resolution module must be framework-neutral and importable by
  the app and by Functions. This was already required and is now load-bearing.
- The App SDK is a newer surface with thinner documentation than Studio. That
  is a build risk and simultaneously the most valuable friction log material
  the project will produce, since few entrants will have pushed on it.
- Screenshots and the demo video are all inside Sanity, which reads better
  against a criterion about how deep you got into the platform.
- The fallback must stay genuinely available. Do not let App SDK work leak
  into the resolution module in ways that make a Next.js fallback expensive.
- The fallback is no longer free. The scaffold installed Next 16.3.5, and the
  generated `web/AGENTS.md` warns that this version's APIs, conventions, and
  file structure may differ from model training data, directing agents to the
  bundled guides in `node_modules/next/dist/docs/` before writing code. When
  this ADR was written the fallback was costed as cheap because Next is well
  represented in training data. At 16.3.5 that assumption is weaker: falling
  back would mean working against a version the model is likely to get wrong,
  on a deadline. This does not change the decision, and it does raise the
  value of the day-four gate being honest rather than hopeful.

## Gate outcome, 2026-09-22

The gate passed. Cellar Health renders live data from the production dataset
inside a Sanity App, and its counts match the Stage 2 oracle exactly at
`now = 2026-09-18`: 45 HOLD, 166 DRINKING, 33 PAST_WINDOW, 4 UNASSESSED,
294 CONSUMED, 542 bottles.

The path proven is Content Lake to App SDK to `CELLAR_QUERY` to
`toCellarSnapshot` to `bottleState()` to rendered view, with no step skipped
and nothing precomputed. The gate was deliberately specified so that it could
not be satisfied by calling the module from a script, querying the dataset
through another tool, or pointing at the test suite.

**The Next.js fallback is not taken.** `web/` stays in the repository, and the
resolution module stays framework-neutral, so the option survives — but this
decision is now settled rather than provisional, and the remaining Stage 3
views are built on the App SDK.

What the gate cost, for the writeup: the App SDK is a newer surface and its
documentation shows it. The agent rule served over MCP gives a scaffold
command the CLI rejects, the `app-quickstart` template is absent from the CLI
reference that enumerates templates, that template pins the SDK a major
version behind current, and `perspective` is documented in three places with
three different answers. None of that was fatal and all of it was findable by
reading the installed types. It is recorded in `docs/friction-logs/friction-log.md`,
where it is worth more than it cost.

## Functions bundling, settled 2026-09-22

The second half of the consequence above — importable by Functions — was the
last unverified technical risk in the project. It is now closed by test deploy.

**Outcome: the native workspace import works.** No escape hatch, no build step,
no package manager change. A probe Function deployed from this repository
exactly as it stands imported `@cellar/core`, ran `buildCellar` and
`bottleState` against a hardcoded snapshot, and returned the value predicted
before deployment:

```
CELLAR_PROBE {"state":"DRINKING","sourceType":"personal","assessmentId":"assess-personal","drinkFrom":"2024-01-01","drinkUntil":"2027-12-31","visibleCount":2}
```

The snapshot was built so that resolving by recency before authority, or
counting a `proposed` assessment, each produce `HOLD` rather than `DRINKING`.
A stale or shimmed module could not have produced that line.

### The configuration that worked

- **Package.** `@cellar/core` unchanged: private, `"type": "module"`, `main`
  and `exports` pointing at built ESM in `dist/`, no `sanity` dependency.
  It was consumed as the compiled `dist/`, not as raw TypeScript.
- **Workspace.** `functions/*` added to the root `workspaces` array. npm links
  the package as a **junction** at `node_modules/@cellar/core` on Windows, and
  the bundler follows it. Everything hoists to the root `node_modules`; the
  function directory gets none of its own.
- **Function-level dependencies.** `functions/<name>/package.json` declaring
  `"@cellar/core": "*"` — the same form `studio/` and `app/` already use —
  alongside `"@sanity/functions": "^1.8.0"`. Because the function directory
  carries its own manifest, the root `package.json` is invisible to it, which
  is the documented rule and is the behaviour observed.
- **Blueprint.** Manifest at the repo root beside `package-lock.json`, with
  `src: './functions/<name>'`. No `transpile` or `autoResolveDeps` override.

### What the CLI actually does, which is neither documented case

The docs describe two bundling paths: inline via Vite for TypeScript in a pnpm
workspace, and externalised `node_modules` for npm or yarn without TypeScript.
npm with TypeScript gets **both at once**, split by package:

- `@cellar/core` is **inlined and tree-shaken** into the uploaded asset. The
  built output is `index.js` plus five numbered chunks; `buildCellar` lands in
  `index3.js`, `resolvedWindow` in `index5.js`, the state machine in
  `index6.js`. No `@cellar/core` directory exists anywhere in the bundle.
- `@sanity/functions` is **externalised** into a real `node_modules` folder
  shipped alongside, together with its `@aws-lite` and `aws4` transitives.

This split is why the workspace link is not a problem: the local package never
has to be installable, only resolvable at build time. The CLI's generated
install manifest requests `@sanity/functions` only. `@cellar/core` is never
fetched from a registry, and a registry lookup would have 404'd if it were.

One latent trap worth knowing: the `package.json` copied into the built asset
still lists `"@cellar/core": "*"` as a dependency, even though nothing installs
it and nothing imports it at runtime. The declaration is inert in the shipped
artifact. Do not read its presence as evidence the module is installed there.

### Consequences for Stage 4

- Functions may import the resolution module directly. Projections recomputed
  on publish of `consumption`, `acquisition`, and assessment acceptance run the
  same code as the App SDK app and the test suite, with no second
  implementation and no duplicated artifact to keep in sync.
- Design rule 6 is now load-bearing in a second place. `@cellar/core` must stay
  free of Sanity client, environment, network, and clock dependencies, because
  the Function inlines whatever it imports.
- Tree-shaking means a Function's bundle contains only the module surface it
  actually calls, so importing the module is cheap even where a Function needs
  one predicate.
- Deployed Functions are auto-provisioned a project API token labelled
  `Function: <name>`, with the **editor** role and no expiry. The probe's
  handler never constructed a client and one was created anyway. It was removed
  when the stack was destroyed, verified by `sanity tokens list` returning none.
  Stage 4 should expect one such token per Function and audit them.
