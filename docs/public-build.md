# The public build on GitHub Pages

Date: 2026-09-25
Status: walkthrough. Nothing here has been run.

Turns `kenwalger/Cellar` into a public demo at
**`https://kenwalger.github.io/Cellar/`** — the one link a judge can open with
no Sanity account, since a deployed App SDK app cannot be shown outside the
organization.

This document is the deployment half. The build it deploys is proposed
separately and is not yet approved or written.

---

## Prerequisite — done, 25 September 2026

**The project needed a CORS entry for `https://kenwalger.github.io`, and it now
has one.** `npx sanity cors add https://kenwalger.github.io --no-credentials`
was run and verified: the same request that returned 403 now returns 200 with
`Access-Control-Allow-Origin: https://kenwalger.github.io` and no
`Access-Control-Allow-Credentials` header.

`app/test/publicTransport.live.mts` asserts both, so the entry cannot be
removed without a test going red.

The original measurement, kept because it is the finding:

```
Origin: https://kenwalger.github.io  →  403  {"error":"Forbidden","message":"CORS Origin not allowed"}
Origin: http://localhost:3333        →  200  Access-Control-Allow-Origin: http://localhost:3333
no Origin header                     →  200
```

A public dataset is exempt from **authentication**, not from **origin
checking**. The shell queries in earlier sessions succeeded because curl sends
no `Origin` header; a browser always does. Without the entry, the page loads,
issues its query, and every view shows an error.

`--no-credentials` is deliberate. The existing `localhost:3333` entry allows
credentials because the Studio needs them; a public read does not, and an
origin that cannot send credentials cannot be used to ride a logged-in user's
session. Use the narrower setting for the public one.

One consequence worth stating: the origin is `https://kenwalger.github.io`,
without a path. GitHub Pages serves every repository of a user from that single
origin, so this entry permits **any** page under `kenwalger.github.io` to read
the dataset, not only this project's. Given the dataset is already world
readable to anything that can make an HTTP request, this grants nothing new —
but it is a broader grant than it looks, and it should be a deliberate choice
rather than a side effect.

## Branch or Action?

**Use GitHub Actions.** Three reasons:

1. No build output in the repository. The alternative is committing `dist/` to
   a `gh-pages` branch, and this repository's `.gitignore` already excludes
   `dist` — working around that to publish a build artifact is the wrong
   direction for a project judged on its build process.
2. The build stays reproducible. The published page is whatever `main`
   produces, not whatever was last copied by hand.
3. Rebuilding after a content change is a push, not a ritual.

The branch approach is only better when there is no build step. There is one.

## 1. Add the workflow

Create `.github/workflows/pages.yml`:

```yaml
name: Public build

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build --workspace @cellar/core
      - run: npm run build:public --workspace cellar-app
      - uses: actions/upload-pages-artifact@v3
        with:
          path: app/dist-public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Notes on the parts that are easy to get wrong:

- **`@cellar/core` must be built first.** It is consumed as compiled ESM from
  `dist/`, which is gitignored, so a fresh checkout has no `dist` until the
  build runs. Confirm the exact script name in `packages/cellar-core/package.json`
  before relying on `npm run build`.
- **`permissions` and the two-job split are required**, not stylistic.
  `deploy-pages` needs `id-token: write` and a `github-pages` environment, and
  it will fail with a permissions error if either is missing.
- **`workflow_dispatch`** lets the page be rebuilt without a commit, which
  matters if the dataset changes and the build is a static snapshot.
- `npm ci` needs `package-lock.json` at the root, which exists.

## 2. Turn Pages on

In the browser, once — this cannot be done from the CLI:

1. `https://github.com/kenwalger/Cellar` → **Settings** → **Pages**
2. **Build and deployment → Source**: select **GitHub Actions**.

   Not "Deploy from a branch". Choosing the branch option here is the single
   most common way this ends up serving a README instead of the app.
3. Nothing else needs setting. No custom domain, no `CNAME`.

The repository is public, so Pages is available at no cost and the site is
public too. There is no private-Pages option on a free plan, which is the point
— the entire purpose is a URL that needs no account.

## 3. Commit and push

The build now exists. To stage:

```
.github/workflows/pages.yml
app/vite.public.config.ts
app/public-entry/index.html
app/public-entry/main.tsx
app/src/PublicApp.tsx
app/src/PublicCellarProvider.tsx
app/src/publicClient.ts
app/src/cellarContext.ts
app/src/CellarProvider.tsx
app/src/CellarShell.tsx
app/src/App.tsx
app/src/CellarHealth.tsx
app/src/DrinkSoon.tsx
app/src/MissedOpportunities.tsx
app/src/sanity.ts
app/test/publicTransport.live.mts
app/tsconfig.json
app/package.json
```

**Correction, 26 September.** An earlier version of this line said
`app/dist-public/` was "already covered by the `dist` entries in
`.gitignore`". It was not. Those rules match a directory named exactly `dist`;
this one is `dist-public`, and six built files were committed as a result.
`.gitignore` now names it explicitly, and the tracked copies have to be removed
from the index once:

```powershell
git rm -r --cached app/dist-public
```

The files stay on disk; only the tracking stops. This matters beyond tidiness:
the stated reason for choosing Actions over a `gh-pages` branch was to keep
build output out of the repository, and the repository had build output in it.

Pushing to `main` triggers the workflow. The first run also creates the
`github-pages` environment.

## 4. Confirm it is live

In order, because each check rules out a different failure:

1. **The workflow.** `https://github.com/kenwalger/Cellar/actions` → both jobs
   green. `deploy` prints the page URL in its summary.
2. **The page loads.** Open `https://kenwalger.github.io/Cellar/`.
   A blank page with 404s for `/assets/…` in the console means the Vite `base`
   is wrong — see below.
3. **The query succeeded.** DevTools → Network → a request to
   `aos9nze5.apicdn.sanity.io` returning **200**. A **403 "CORS Origin not
   allowed"** means the prerequisite above was skipped.
4. **The numbers are right.** Cellar Health at today's date:
   HOLD 45 · DRINKING 166 · PAST_WINDOW 33 · UNASSESSED 4 · CONSUMED 294,
   248 in cellar, 542 total. Drink Soon 23 / 12. Missed Opportunities 11 / 5.

   These must match the App SDK version exactly. If they do not, the two
   surfaces are not sharing the pipeline they are supposed to share, and that
   is a build problem rather than a deployment one.
5. **The control works.** Move `asOf` to each of the five verification dates
   and confirm the counts against `docs/` — that is the actual demo, and it is
   pure client-side computation, so it is also the check that the resolution
   module made it into the bundle intact.
6. **No credentials shipped.** Search the built bundle for `sk` tokens:

   ```powershell
   Select-String -Path app\dist-public\assets\*.js -Pattern "sk[A-Za-z0-9]{40,}"
   ```

   Expect no matches. The build is public and permanently readable; this check
   costs five seconds and the failure it catches is unrecoverable.

   **`{40,}`, not `{20,}`.** The looser pattern reports a hit on every build:
   `skipCrossDatasetReferenceValidation`, an identifier inside
   `@sanity/client`. A scan that cries wolf on a clean bundle is worse than no
   scan, because the one time it matters it will be waved through.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Blank page, 404s on `/assets/…` | Vite `base` is `/` and Pages serves from `/Cellar/`. Set `base: '/Cellar/'` |
| 404 on the page itself | Pages source is still "Deploy from a branch" |
| `403 CORS Origin not allowed` | The CORS entry was not added |
| `deploy` job fails on permissions | `id-token: write` or the `github-pages` environment is missing |
| Page serves the README | Same as the 404 case — wrong Pages source |
| Counts differ from the App | The two surfaces are not sharing the view code |

## What this does not do

- **It does not update itself when the dataset changes.** The build fetches at
  page load, so the data is live at load time — but if the *code* needs
  rebuilding, that is a push or a `workflow_dispatch`.
- **It does not replace the deployed App.** That one still exists at
  `https://www.sanity.io/@opyntsvcl/application/gcxu5htdwn5n9lc15m64sfpp` and
  is still the surface the App SDK bonus is claimed on. This is the copy a
  judge can open.
- **It does not make the dataset any more public than it already is.** The
  dataset has been world-readable since 18 September. This only permits a
  browser origin to do what curl could already do.
