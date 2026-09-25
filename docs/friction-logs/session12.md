### 25 September 2026, Session 12

#### The GitHub Pages workflow

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell.
What I was trying to do: write the Actions workflow that publishes the public
build, and get the Pages setting right the first time.
Outcome: workflow written, both build steps verified locally, and a committed
build directory found and untracked before it could be published from.
Elapsed: 10:38 to 10:48 am, about ten minutes.

One prompt. The session is short and the finding is bigger than the task.

#### The finding: an ignore rule that did not mean what the previous session said it meant

Session 11's stage list ended with `app/dist-public/` being "build output and
already covered by the `dist` entries in `.gitignore`."

It was not. `.gitignore` carries `dist`, `dist/` and `packages/*/dist`. A bare
`dist` pattern matches a file or directory named exactly `dist`. The public
build writes to `dist-public`, which none of those rules match and none was
ever going to. Six files were tracked:

```
app/dist-public/assets/browserUpload-BTQyjHMj-D827TAdK.js
app/dist-public/assets/index-CR7Sq4Om.css
app/dist-public/assets/index-DNVjRcm9.js
app/dist-public/assets/isRecord-Kfmt-nk--BGze3w87.js
app/dist-public/assets/stegaEncodeSourceMap-Dj29aWKG-CQqJJMUn.js
app/dist-public/index.html
```

The claim was asserted rather than checked, in a sentence whose only job was
to say what not to stage. `git check-ignore -v app/dist-public/index.html`
answers it in under a second and was never run.

Two things make it worth more than an embarrassing line.

**It contradicts the decision it was attached to.** The same document argues
for GitHub Actions over a `gh-pages` branch on the grounds that build output
does not belong in the repository. The repository then acquired build output,
in the commit that made the argument.

**The directory name is what caused it.** `dist-public` was chosen precisely
so the public build could not collide with `dist/`, which `sanity build` owns
and empties. Avoiding the collision also walked out from under the ignore rule
covering the colliding name. A name picked to be distinct from `dist` is, by
construction, a name that `dist` does not match. The same reasoning that makes
the choice correct makes the ignore rule fail, which is why the error felt
safe while it was being written.

Fixed by naming `app/dist-public/` explicitly rather than loosening the rule
to `dist*`, which would swallow anything else beginning with those letters and
trade one silent over-reach for another.

Untracking was mine to run, since ignoring does not untrack:

```powershell
git rm -r --cached app/dist-public
git ls-files | Select-String -Pattern "dist|node_modules|\.env"
```

Six files removed from tracking, nothing else caught by the sweep.

#### What checking the hedged parts changed

The workflow in `docs/public-build.md` was drafted before the scripts it calls
existed, and said so. Four things were confirmed and two changed.

| Checked | Result |
| --- | --- |
| `@cellar/core` build script | `build` exists; the root also declares `build:core`, which forwards to it. Changed to the root script |
| `cellar-app` public build | `build:public` exists, workspace name `cellar-app`. Unchanged |
| Output path | `app/dist-public/` with `index.html` and `assets/`, rebuilt from scratch to confirm |
| Node version | Changed from a guess to a measurement |

The Node version is the one worth recording. The draft said 22 with no reason.
The installed toolchain states a floor: `vite` 8.3.0 and `rolldown` 1.2.9
declare `^20.19.0 || >=22.12.0`, and `@sanity/client` 8.6.2 declares
`>=22.12.0`. Local is 26.3.0. So 22 is right, but now because it is the oldest
version every dependency agrees to, and the gap between the floor and the
development version is a known quantity rather than an unexamined one.

Same pattern as every version question in this project: the answer was in the
installed packages, and the documentation the workflow was drafted from did
not have it.

#### Two checks moved into CI

Both are properties of the artifact and can be known before it is published,
so both went into the workflow rather than into a checklist a person performs
from memory.

**The base path check** is the valuable one. If Vite's `base` is wrong, the
build succeeds, the bundle is valid, the page loads, and it renders nothing.
The only symptom is a 404 in the browser console. Grepping `index.html` for
`/Cellar/assets/` turns that into a red workflow with a named error.

**The credential scan** is session 11's, carried forward with its `{40,}`
bound intact after the original `{20,}` was found to match
`skipCrossDatasetReferenceValidation` on every clean build. It now lives
somewhere it will actually run.

That is the pair of findings from the last two days closing: a check that
always fails is worthless, and a check nobody runs is worth the same.

#### Build findings

#### The built bundle was committed, because a gitignore rule did not mean what I said it meant

Session 11's stage list ended with: "`app/dist-public/` is build output and is
already covered by the `dist` entries in `.gitignore`." It is not.

`.gitignore` carries `dist` and `dist/` at lines 173–174, plus
`packages/*/dist`. A bare `dist` pattern matches a file or directory named
exactly `dist`. The public build's output directory is `dist-public`, which
those rules do not match and were never going to. `git ls-files` finds six
tracked files:

```
app/dist-public/assets/browserUpload-BTQyjHMj-D827TAdK.js
app/dist-public/assets/index-CR7Sq4Om.css
app/dist-public/assets/index-DNVjRcm9.js
app/dist-public/assets/isRecord-Kfmt-nk--BGze3w87.js
app/dist-public/assets/stegaEncodeSourceMap-Dj29aWKG-CQqJJMUn.js
app/dist-public/index.html
```

The claim was asserted rather than checked, in a sentence whose whole job was
to tell someone what not to stage. `git check-ignore -v app/dist-public/index.html`
answers it in under a second and was not run.

Two things make it worth more than an embarrassing line.

**It contradicts the decision it was attached to.** The same document argues
for GitHub Actions over a `gh-pages` branch on the grounds that build output
does not belong in the repository. The repository then acquired build output,
in the commit that made the argument.

**The directory name is what did it.** `dist-public` was chosen so the public
build could not collide with `dist/`, which `sanity build` owns and empties.
Avoiding the collision also walked out from under the ignore rule that covered
the colliding name. A name picked to be distinct from `dist` is, by
construction, a name `dist` does not match, and the same reasoning that makes
the choice correct makes the ignore rule fail, which is why the error felt safe
while being written.

Fixed by naming `app/dist-public/` explicitly rather than by loosening the
existing rule to `dist*`, which would also swallow anything else beginning
`dist` and trade one silent over-reach for another.

#### What the doc hedged on, and what checking it changed

The workflow in `docs/public-build.md` was written before the scripts it calls
existed, and said so: "Confirm the exact script name in
`packages/cellar-core/package.json` before relying on `npm run build`." Four
things were checked and two changed.

| Checked | Result |
| --- | --- |
| `@cellar/core` build script | `build` exists (`tsc -p tsconfig.build.json`). The root also declares `build:core`, which forwards to it, **changed** to use the root script |
| `cellar-app` public build script | `build:public` exists, workspace name is `cellar-app`. Unchanged |
| Output path | `app/dist-public/` confirmed, containing `index.html` and `assets/`. Unchanged |
| Node version | **changed** from a guess to a measurement |

The Node version is the one worth recording. The draft said 22 without a
reason. The installed toolchain states a floor: `vite` 8.3.0 and `rolldown`
1.2.9 both declare `^20.19.0 || >=22.12.0`, and `@sanity/client` 8.6.2 declares
`>=22.12.0`. Local development runs Node 26.3.0. So 22 happens to be right, and
it is right for a reason that can be stated and re-checked rather than because
it looked like a safe number, and the gap between the floor (22.12) and the
development version (26) is now a known quantity instead of an unexamined one.

Same pattern as every other version question in this project: the answer was in
the installed packages, and the documentation this workflow was drafted from
did not have it.

#### A CI step that checks the two things the build cannot

Both added to the workflow rather than left to the post-deploy checklist,
because both are properties of the artifact and can be known before it is
published.

The base path is the valuable one. If Vite's `base` is wrong the build
succeeds, the bundle is valid, the page loads, and it renders nothing, the
only symptom is a 404 in the browser console. Grepping `index.html` for
`/Cellar/assets/` turns that into a red workflow with a named error.

The credential scan is session 11's, carried forward with its `{40,}` bound
intact. Worth noting that it now lives somewhere it will actually run, rather
than in a checklist step a person performs from memory.

#### Transcripts

Full prompt and output, unedited.

##### Prompt 1: write the workflow, say what to click, give me a verification list

```text
Session 12: get the public build live on GitHub Pages.

Read docs/public-build.md, which you wrote in session 11 and which contains
the workflow contents and the walkthrough. Verify it against the repo as it
now stands rather than trusting what you wrote yesterday.

Task 1: write .github/workflows/pages.yml.

Before writing it, confirm rather than assume:

- the exact script names in packages/cellar-core/package.json and
  app/package.json that the workflow calls, since the doc hedged on this
- that app/dist-public is the real output path of the public build
- the Node version the repo needs, against what is installed locally
- whether npm ci at the root installs all workspaces, given the public build
  needs @cellar/core built first

Say what you changed from the version in the doc, and why.

Task 2: tell me exactly what to click. I turn Pages on in the browser; you
cannot. Give me the setting, the value, and what the wrong value looks like
afterwards so I can recognize it.

Task 3: a verification list for after the first run, in order, each check
ruling out a different failure. Include the counts I should see and what a
403 CORS error or a blank page each mean. You cannot see the page, so these
are for me to confirm and report.

Do not turn on Pages, do not push, and do not run any git command that
changes the repo. Write the commit message and tell me what to stage.

Friction log entries go to docs/friction-logs/session12.md.
```

##### Prompt 1 output

```text
orkflow written and both of its build steps verified locally.

  Before anything else: the bundle is committed

  Session 11's stage list said app/dist-public/ was "already covered by the dist entries in .gitignore". It isn't. A bare dist pattern matches a directory named exactly dist; this one is dist-public. git ls-files finds six tracked files.
  
  I asserted that instead of checking it, in the one sentence whose job was to say what not to stage, git check-ignore -v answers it in a second. It also contradicts the decision it was attached to: the same doc argues for Actions over a gh-pages branch because build output doesn't belong in the repo.

  .gitignore now names app/dist-public/ explicitly. Ignoring doesn't untrack, so one command is yours to run:

  git rm -r --cached app/dist-public

  Files stay on disk; only tracking stops.

  Task 1, what I changed from the doc, and why

  ┌───────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
  │          Checked          │                                              Result                                              │
  ├───────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ @cellar/core build script │ build exists (tsc -p tsconfig.build.json). Root also has build:core → changed to the root script │
  ├───────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ cellar-app public build   │ build:public exists, workspace name cellar-app, unchanged                                       │
  ├───────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Output path               │ app/dist-public/ with index.html + assets/, confirmed, rebuilt from scratch to be sure          │
  ├───────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Node version              │ changed from a guess to a measurement                                                            │
  └───────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘

  Node. The draft said 22 with no reason. The installed toolchain states a floor: vite 8.3.0 and rolldown 1.2.9 declare ^20.19.0 || >=22.12.0, @sanity/client 8.6.2 declares >=22.12.0. Local is 26.3.0. So 22 is right, but now because it's the oldest version every dependency agrees to, and the gap to your
  dev version is a known quantity.

  npm ci at root: yes, installs all workspaces and links @cellar/core. But dist/ is gitignored, so nothing resolves @cellar/core until build:core runs, the ordering in the doc was correct. I left the install unscoped: it's what package-lock.json is verified against, and --workspace scoping trades a minute
  for a weaker guarantee.

  Added: a verify step checking two things the build can't tell you. A wrong Vite base produces a successful build, a valid bundle, and a page that renders nothing, the only symptom is a console 404. Grepping index.html for /Cellar/assets/ makes that a named CI failure. Session 11's credential scan moves
  here too (keeping {40,}), so it actually runs instead of being remembered.

  Verified locally: build:core exits 0, a from-scratch build:public produces the right tree, and both grep checks pass.

  Task 2, exactly what to click

  1. https://github.com/kenwalger/Cellar → Settings (top bar, right end)
  2. Left sidebar → Pages (under "Code and automation")
  3. Build and deployment → Source → set to GitHub Actions

  That's the only setting. No branch, no folder, no custom domain.

  What the wrong value looks like afterwards: if Source is left on "Deploy from a branch", the panel will show a second dropdown pair (Branch + / (root)), typically reading main / / (root). With that, Pages serves the repository root, so https://kenwalger.github.io/Cellar/ renders your README.md as a
  styled HTML page, not the app. A README rendering where the cellar should be means exactly this setting and nothing else.

  Correct afterwards: the Source dropdown reads GitHub Actions, the branch dropdowns are gone, and once the first run finishes a green banner appears reading "Your site is live at https://kenwalger.github.io/Cellar/".

  Note the first push creates the github-pages environment automatically, you don't create it.

  Task 3, verification, in order

  Each rules out a different failure. Stop at the first that fails.

  1. Workflow ran. Actions tab → "Public build" → both build and deploy green. Red deploy with a permissions error → the permissions: block didn't apply; check the file is on main.
  2. The verify step passed. Expand "Verify the built bundle" → base path and credential scan both clean. If it failed here, nothing was published, which is the point.
  3. Page responds. Open https://kenwalger.github.io/Cellar/. 404 from GitHub → Pages source is still "Deploy from a branch" (Task 2). Your README → same cause.
  4. Page is not blank. You should see the masthead "The Cellar" and the date control before any data arrives. Blank page = the base path is wrong and assets 404'd, but step 2 should have caught that, so a blank page after a green verify means something else: check the console for a module error.
  5. Query succeeded. DevTools → Network → request to aos9nze5.apicdn.sanity.io returning 200. 403 CORS Origin not allowed means the origin isn't on the allowlist, re-add with npx sanity cors add https://kenwalger.github.io --no-credentials. It shouldn't happen; test:live asserts it and passed yesterday.
  6. Counts, at today's date:

  6. HOLD 45 · DRINKING 166 · PAST_WINDOW 33 · UNASSESSED 4 · CONSUMED 294 · 248 in cellar · 542 total
  Drink Soon 23 bottles / 12 wines · Missed Opportunities 11 / 5

  6. These must match the Dashboard app exactly. If they differ, the surfaces aren't sharing the pipeline, a build problem, not a deployment one.
  7. The control works. Drag asOf to 2025-06-01 → Drink Soon 10 / 4, DRINKING 147, in cellar 226. Then 2023-03-15 → Drink Soon 0 / 0, DRINKING 122, in cellar 198. This is the actual demo, and it's pure client-side computation, no network request, which also proves the resolution module made it into the
  bundle intact.
  8. No masthead dataset badge. If you see dataset: staging, the published page is a permanent public demo of the wrong cellar. Fix app/src/sanity.ts and re-push.

  To stage: .github/workflows/pages.yml, .gitignore, docs/public-build.md, docs/friction-logs/session12.md, plus the git rm -r --cached above, which stages itself. Commit message in commit-message.txt.

  I have not turned on Pages, pushed, or run any repo-changing git command.

✻ Brewed for 3m 10s
```