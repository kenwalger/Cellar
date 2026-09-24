# Submission readiness

Date: 2026-09-24
Status: audit only. Nothing in this document has been done.

The DEV Challenge Path Two submission template has six sections. Five are
content, one is infrastructure, and the infrastructure one is the only item
that cannot be produced by writing. This records, for each: what exists today,
what is missing, and what work would produce it.

Deadline: 4 October 2026. Ten days from this audit.

## Summary

| Template item | State | Blocking work |
| --- | --- | --- |
| What I Built | Material exists, not assembled | Prose, from documents already written |
| Demo — deployed link | **Unmet, and unachievable** — a deployed app is gated on organization membership | None. Deploying is the wrong move; use the fallback |
| Demo — video or screenshots | Screenshots exist but all predate 4a; no video | Now load-bearing: record and capture during the staging run |
| Code — repository link | **Met** | None |
| My Build Process | Material exists in quantity | Selection and prose |
| Sanity Project Details | **Met, and already public** | None, but see the exposure note |
| Agent Session transcript (optional) | **Retrievable, unbroken, ~9 MB** | Copy out of the cache; format unverified |

Two items were expected to be unmet. Neither turned out to be what it looked
like.

The public dataset URL is **already satisfied**, and the finding is the reverse
of the assumption: `production` has been world-readable since it was created,
and querying it anonymously shows that the fields which would have made that
uncomfortable — price, currency, occasion, country — were never populated,
because the source ledger has no columns for them.

Deployment is **unmet and unachievable**, which is a different answer from
"not done yet". A deployed App SDK app lives in the organization dashboard and
is gated on organization membership, so the link would show a judge a
request-access screen. The work that item needs is a video, not a deploy.

---

## 1. What I Built

**Exists.** The argument is written down in more places than the section needs:

- `README.md` — the project in one page.
- `docs/content-model.md`, `docs/temporal-resolution.md` — the design, written
  before the code.
- `docs/ADRs/0001` through `0012` — twelve decisions, several recording an
  option considered and rejected.
- `CHANGELOG.md` — stage-level milestones.
- `write-up/contest-submission/Submission_Draft_v1.md` — a draft exists.

**Missing.** The section itself, in DEV's format, at DEV's length.

**Note.** `write-up/` is gitignored (`.gitignore:259`). The submission drafts
are therefore not in the public repository. That is probably deliberate, and it
is worth confirming rather than discovering after the fact — the git status at
the head of this session shows deleted files under
`write-up/contest-submission/` that git still has tracked entries for, so that
directory is in a half-ignored state.

**Work to produce it.** Writing only. No blockers.

## 2. Demo

### 2a. Screenshots — mostly met

Eight exist in `docs/screen_shots/`:

```
2026-09-22_11-26-37.png   2026-09-22_11-27-30.png
DrinkSoon.png             future-date.png
gate1.png                 missed-opportunities.png
missed-opportunities2.png missed-opportunities3.png
```

All predate Stage 4a. None of them show the review queue, the Accept action,
the derived-field panel, or the dataset badge — which is to say none show the
thing the Workflows bonus is claimed on. The staging run about to happen is the
natural moment to capture the missing ones, and the three-observation sequence
in that run is already exactly a storyboard: baseline, proposal present and
nothing moved, accepted and five bottles moved.

**Work to produce it.** Capture during the staging run. Free, if done then;
a second full setup if not.

### 2b. Video — absent

Nothing exists. The template accepts "video **or** screenshots", so this is
optional. It is also the single most persuasive artifact available to this
project, because the claim being demonstrated is a state change over time and a
still frame cannot show a number moving.

**Work to produce it.** A screen recording of the staging sequence, which is
the same sequence being run anyway.

### 2c. Deployed link — unmet

This is the real gap.

**What ADR 0010 actually says.** The ADR does not mention deployment, in favour
or against. Neither does `docs/build-plan.md` — a search of the whole `docs/`
tree for "deploy" returns the Functions/schema/blueprint senses of the word and
nothing about hosting a public URL. So deployment was never deferred by a
decision; it was never on the plan at all. That is a different and slightly
worse position than a recorded deferral, because there is no reasoning on file
to revisit.

**What `sanity deploy` from `app/` creates.** `app/package.json` already has
`"deploy": "sanity deploy"`. Per the App SDK deployment docs, App SDK apps use
the same command as Studio, but the destination is different: an App SDK app
deploys to the **organization dashboard**, not to a `*.sanity.studio` hostname.
The app becomes an entry in the dashboard for organization `opyntsvcl`
(`app/sanity.cli.ts:4`), reachable at a `https://www.sanity.io/@<org>/…` URL
rather than at a domain of its own.

First deploy specifics:

- The CLI prompts for an app title, then writes `deployment.appId` into
  `sanity.cli.ts`. `app/sanity.cli.ts` currently has no `deployment` block, so
  this is a first deploy and the file **will be modified by the command**.
- `--create --title "…" --yes --json` does it unattended.
- `--dry-run` reports what would be deployed **without creating or uploading
  anything**. This is the correct first move: it answers the cost and
  permission questions without committing to anything.
- `sanity undeploy` removes it, and needs the `appId` in `sanity.cli.ts` to
  work — so do not lose that file between deploy and undeploy.

**What it costs.** Not stated anywhere in the deployment documentation. The
only limit the docs name is a 2 GB per-deployment size cap, which this app is
nowhere near. Whether a deployed SDK app consumes a quota on the current plan
is the same unanswerable-from-docs question session 8 hit with the dataset
slot, and it has the same cheap resolution: `npx sanity deploy --create --title
"Cellar" --dry-run --json` from `app/`, and Manage → organization → Apps.

**Permission required.** Organization admin or Developer role on `opyntsvcl`.
Not a project role — this is the one place App deployment differs from Studio
deployment, which uses project-level tokens.

**Does the deployed App read production without further configuration?**

Two halves, and only one is certain.

*The dataset target: yes.* `app/src/sanity.ts` holds `PROJECT_ID` and `DATASET`
as literals, and `App.tsx` passes them to `SanityApp`. They compile into the
bundle. Nothing about deployment changes them — which is the upside of the
hand-edited literal that session 8 arrived at for a different reason. **The
corollary is a hazard:** if the App is deployed while `DATASET` is still set to
`'staging'` for the rehearsal, the deployed App reads staging permanently and
says so only in a small masthead badge. Reset the literal to `'production'`
before deploying, and confirm the badge is absent.

*Authentication and CORS: unverified.* In Dashboard mode the App SDK takes its
token from the Dashboard iframe, so no token needs configuring. But the viewer
must be a logged-in Sanity user — the docs are explicit that if no session
exists the Dashboard redirects to `sanity.io/login`. And the project currently
has exactly **one** CORS origin registered:

```
http://localhost:3333  (allowCredentials: true)
```

Whether deploying an app auto-registers the dashboard origin the way deploying
a Studio auto-registers its `.sanity.studio` hostname is not documented either
way. If the deployed app renders its shell and shows no data, that is the first
thing to check.

**Can judges open it? No — settled, and settled against deploying.**

The reference pages do not answer this. The `app.visibility` option takes
`default` (listed in the dashboard sidebar) or `unlisted` (hidden from it), and
the warning attached to `unlisted` — "Anyone with the link can still open it" —
reads, on that page alone, as though link access were ungated. It is not. That
sentence scopes to sidebar listing, and the pages that scope to **organization
membership** are elsewhere.

Three statements settle it, none of them on the deployment page:

1. The Dashboard introduction: "Your dashboard is centered around your
   organization, and gives access to deployed studios and apps **within the
   organization**."
2. Dashboard changelog v2025-10-27: "Users can now **request access** directly
   from the Dashboard when they try to open a studio or organization **they
   don't have access to**."
3. The same entry, under Notable Fixes: "Fixed an issue where users could see
   studios within an organization that they didn't have access to."

The third is the decisive one. Cross-organization visibility is not merely
absent; it was a **bug**, and it was fixed. A deployed App SDK app is gated on
membership of organization `opyntsvcl`, and a judge opening the URL gets a
request-access screen, not the cellar.

So `app.visibility` is not the control it appears to be. `default` and
`unlisted` both mean "org members only"; the choice is only whether org members
find it in a sidebar.

**What this changes.** Deploying does not satisfy the template's demo link. It
produces a URL that shows judges a permission wall, which is worse than no URL
because it looks like a broken submission rather than a considered one.

**Confidence.** High, from documentation rather than from a test. Confirming it
empirically needs a second Sanity account that is not a member of the
organization — a signed-out browser only reaches the login page, so it cannot
distinguish "not logged in" from "not permitted". Given the changelog is
explicit and treats the alternative as a defect, a second account is not worth
setting up to re-confirm.

### 2c-probe. Does the App work anonymously against a public dataset?

Written **before** the probe runs, so the expected result cannot be adjusted to
match the outcome. Same discipline as the Functions bundling probe in ADR 0010.

**The question.** If `useQuery` works without a Dashboard-injected token when
the dataset is public, a plain static host gives judges a real demo and the
deployment finding stops being decisive. If it does not, the fallback stands.

**Prediction: no — and not for the reason it looks like.**

Two layers have to agree, and they disagree.

*The transport layer would allow it.* In `@sanity/sdk` 3.4.0,
`clientStore-CD-USpIU.js` builds the client with
`token: authMethod === "cookie" ? void 0 : tokenFromState ?? void 0`, and then:

```js
effectiveOptions.token === null || effectiveOptions.token === void 0
  ? (delete effectiveOptions.token, …)
  : delete effectiveOptions.withCredentials
```

With no token the key is **deleted**, not sent empty. The underlying client
issues a genuinely unauthenticated request, which a public dataset answers.

*The React layer never gets there.* `SanityApp` unconditionally wraps its
children in `AuthBoundary` (`@sanity/sdk-react/dist/index.js`, the `jsx(AuthBoundary,
{...props, projectIds, children})` call), and `AuthBoundary` contains:

```js
isLoggedOut && !isInIframe() && !isStudio && !isDashboardEnvironment() &&
  (window.location.href = loginUrl)
```

A statically hosted page is precisely *logged out, not in an iframe, not
Studio, not a dashboard environment* — all four conditions at once. The
predicted behaviour is that the browser **navigates away to `sanity.io/login`**
before any cellar number renders.

So the predicted failure is a client-side redirect, not an API refusal. That
distinction is the whole point of the probe: "it didn't work" is worth very
little, and "it didn't work, and here is the layer that refused" is worth
recording.

**The probe. Three checks, run after step 30 of the staging sequence**, when
`app/src/sanity.ts` is back to `'production'` — the public dataset, which is
the only one the anonymous question applies to.

| | Check | Expected |
| --- | --- | --- |
| **A** | In a browser console, `fetch` the production query endpoint with no token | `{result: 1645}` |
| **B** | Same, against `staging` | 401/403 |
| **C** | Open `http://localhost:3333` **directly** in a private window — not via the `sanity.io/@org?dev=…` wrapper | fallback flashes, then redirect to `sanity.io/login`; no counts ever render |

A and B are a control pair, and B is why A means something. A alone is
satisfied by an API that never checks anything; B establishes that the same
anonymous request is refused when the dataset is private, so A is evidence of
`public` doing work rather than of authentication being absent.

C is the question. A private window removes any Sanity session cookie or
`localStorage` token, and opening the origin directly removes the Dashboard
parent that would otherwise inject one.

**Falsification.** If C renders the cellar with live counts —
45 / 166 / 33 / 4 / 294 against production — the prediction is wrong, the
answer is yes, and a static host becomes the demo.

**This needs no CORS write.** `http://localhost:3333` is already the project's
one registered origin, and it is the origin the probe runs on. A CORS entry
would only be needed to repeat C on a real hosted origin, which is worth doing
*only* if C comes back yes — and that is a project-config write to ask for at
the time, not now.

**Out of bounds, because they would make it pass without answering it.**
Passing a hardcoded token into `SanityConfig.auth` tests a credentialled app
and ships a secret. Wrapping the page in an iframe trips `!isInIframe()` and
exploits a condition rather than answering the question. Replacing `SanityApp`
with a bare `@sanity/client` call answers "can a static page read this
dataset", which is already known — this document's exposure section did exactly
that from a shell — and not "does the App SDK app work anonymously". If the
answer is no, building a plain frontend is the `web/` Next.js path, which is a
different project rather than a fix.

### 2c-probe-1b. Is there a supported anonymous-read configuration?

Asked and answered from the installed types before the probe runs, because if
one existed the probe would have a second arm and the fallback would not be
settled.

**There is not. The App SDK has no anonymous-read mode.**

`AuthBoundary` gates `children` on being authenticated — the prop is documented
as "Protected content to render when authenticated". Reaching the app therefore
requires `authState` to leave `LOGGED_OUT`, and every typed route to that is a
route to a user token. The full surface, enumerated rather than sampled:

| Option | What it is | Why it is not the path |
| --- | --- | --- |
| `auth.token` | "A static authentication token to use instead of handling the OAuth flow" | A hardcoded credential, excluded, and shipping one in a static bundle publishes it |
| `auth.providers` | Alternative login providers | Changes *how* a user logs in, not *whether* |
| `auth.oauth` | OAuth `clientId` / `redirectUri` / `organizationId` | Still an interactive login producing a user token |
| `auth.clientFactory` | Factory for the `SanityClient` | Can build an anonymous client, but never touches `authState`, so the redirect fires anyway |
| `auth.storageArea`, `callbackUrl`, `apiHost`, `initialLocationHref` | Where the token is kept, where the flow returns | Mechanics of a flow that still needs a user |
| `LoginComponent` / `CallbackComponent` / `LoginErrorComponent` | Custom screens | Replaces the login screen with your own login screen. Does not render `children` |
| `verifyOrganization: false` | Skips checking the project belongs to the dashboard's organization | Disables *organization* verification, not *authentication* — `isLoggedOut` is untouched. Carries its own warning: "NOT RECOMMENDED… should never be disabled in production environments" |
| `SanityApp`'s own props | `config`, `resources`, `children`, `fallback`, `inferMediaLibraryAndCanvas` | Nothing auth-related |

The documentation agrees with the types. The authentication page states the
SDK "determines the initial state based on the environment the application is
running in — that is, **one of**: a Sanity Dashboard iframe, Sanity Studio."
Two environments are enumerated and there is no third. A static host is not an
environment the SDK models.

**The one near-miss, recorded because it is typed and someone will find it.**
`SanityConfig.studio` is a real, documented, typed option, and
`StudioConfig.authenticated` is documented as: "Whether the Studio has already
determined the user is authenticated. When `true` and the token source emits
`null`, the SDK infers cookie-based auth is in use rather than transitioning to
logged-out."

That is the only field in the API that suppresses the logged-out transition
without a token, and it would also set `isStudio` — `AuthBoundary` computes
`isStudio = isStudioConfig(instance.config)`, so the presence of `config.studio`
alone disables the redirect branch. On paper, `config.studio = {authenticated:
true}` makes the app render.

It is still not a supported anonymous path, for three reasons that are all on
the same page as the field:

1. **It asserts something false.** The field means "the Studio has already
   determined the user is authenticated". On a static host there is no Studio
   and no user. `SanityConfig.studio` is documented as "Studio configuration
   provided by a Sanity Studio workspace… typically set automatically by
   `SanityApp` when it detects an `SDKStudioContext` provider."
2. **It selects cookie auth**, so the client is built with
   `withCredentials: true`. A cross-origin credentialed request needs a
   registered CORS origin *and* a cookie the anonymous visitor does not have.
3. **Studio mode has a documented ceiling:** "only project-level endpoints will
   work. Any calls made to global endpoints will fail." Today this app only
   makes project-scoped queries, so it would happen to survive — which is
   exactly the kind of accidental fit that breaks later.

Claiming to be a Studio in order to be allowed to read a public dataset is a
workaround, not a supported configuration, and this project's own rules say to
report that rather than build on it. It is recorded here so the writeup can
say the surface was searched exhaustively, not so it can be used.

**The finding, stated plainly for the writeup:**

> The Sanity App SDK has no anonymous-read mode. `AuthBoundary` renders
> children only when authenticated, every typed auth option resolves to a user
> token, and the SDK recognises exactly two environments — a Dashboard iframe
> and a Studio. A custom app therefore cannot be shown to anyone outside the
> organization: not by deploying it, because the Dashboard gates on
> organization membership, and not by hosting it statically, because the SDK
> redirects an anonymous visitor to a login page before a single query is
> issued. The dataset can be public and the app still cannot be public. The
> platform's newest surface, and the one its own challenge brief names as a
> bonus, has no path to a public demo.

That holds independently of probe C. Probe C tests whether the redirect fires
as predicted; this answers whether anything in the API could have prevented it.
**The fallback is therefore decided now rather than on deadline:** video,
screenshots, the public dataset endpoint, and the project ID.

### 2c-probe-2. What does a signed-in non-member see?

**Nothing short of a second Sanity account can confirm this, so it is not being
spent.**

The test requires being authenticated and a non-member simultaneously, which is
the definition of a second account. A signed-out browser reaches
`sanity.io/login` and therefore cannot distinguish "not logged in" from "not
permitted". The Applications API reference was searched for a view-side access
model and exposes only deploy-side permissions —
`sanity.sdk.applications.deploy`, scoped to the organization — which describes
who may install an app, not who may open one.

The changelog evidence in the section above stands on its own and is
documentary rather than tested. It is treated as settled.

**This question is moot in every branch but one.** If the anonymous probe
answers yes, the demo comes from a static host and the dashboard path is
irrelevant. If it answers no and the fallback is accepted, nothing is deployed.
It matters only if the probe answers no *and* a deployment is made anyway to
give the Sanity team an in-platform look — in which case the second account
becomes worth the setup, because the submission would then carry a link whose
behaviour for its audience is unverified.

### 2d. The fallback that satisfies the template without a link

The template asks for a demo with a deployed link **plus** video or
screenshots. Two of those three are achievable and the third is not, for a
structural reason worth stating in the writeup rather than hiding:

- **Video walkthrough** of the staging sequence — baseline, both proposals
  inert, Reject, Accept, counts moving. This carries the demo.
- **Screenshots**, captured in the same run, covering the Stage 4a surfaces the
  existing eight do not.
- **In place of a link**, the two things a judge *can* open with no account at
  all: the public dataset endpoint, which returns live data in a browser
  address bar, and the public repository, which runs locally.

Say plainly why there is no link: a Sanity App SDK app deploys into an
organization dashboard and is gated on organization membership, so a custom app
built on the platform's newest surface cannot be handed to an anonymous
visitor. That is a real finding about the platform, it is on-topic for the
first judging criterion, and it reads far better than a dead link.

**The only route to a genuinely public URL** would be reviving the Next.js
fallback in `web/` as a read-only frontend against the public dataset — no auth
needed, since the dataset is public. ADR 0010 deliberately kept that option
alive. It is not recommended here: it reopens a settled decision with ten days
left, against Next 16.3.5, which ADR 0010 already records as a version the
model is likely to get wrong. The App SDK app is also the more interesting
submission, and it is the one the bonus criterion rewards.

**Work to produce it.** Recording and capture during the staging run, plus a
paragraph. `sanity deploy` is no longer on the list.

## 3. Code — met

`git@github.com:kenwalger/Cellar.git`, **public**, last pushed 2026-09-23.
22 commits. No work required.

Two things a judge cloning it will hit, neither fatal:

- `sample_data/cellar.ndjson` is gitignored as generated output
  (`.gitignore:246`). The inputs are tracked — `ledger.csv`, `wines.csv`,
  `generate.py`, `check.py` and the three `expected-*.csv` oracles are all in
  the repository — so `studio/scripts/build-ndjson.mts` regenerates it. The
  test suite reads the generated file, so a fresh clone cannot run
  `packages/cellar-core` tests until that script has been run once. Worth one
  line in the README if it is not already there.
- `web/` is the unused Next.js fallback scaffold that ADR 0010 deliberately
  kept. It will read as dead code to anyone who has not read the ADR.

## 4. My Build Process

This is the section the entry is judged on first, and it is the one with a
surplus rather than a gap.

**Exists.**

- `docs/friction-logs/friction-log.md` — the curated log, sessions 0 through 2
  plus thirteen dated Stage 3 and Stage 4 entries.
- `docs/friction-logs/session3.md` through `session9.md` — seven per-session
  logs, several containing full unedited prompt-and-output transcripts.
- `docs/ADRs/` — twelve records, including ADR 0012, which records two of the
  pre-written specs as **errors** rather than refinements.
- `docs/build-plan.md` — the stage ladder, cut list and gates, written in
  advance, with the gates recorded as passed or not.

**Missing.** Selection. There is far more material than the section can hold,
and the honest version has to include the failures: Agent Actions unable to
fill five of eleven fields, the env-var asymmetry that would have had the
Studio writing to one dataset while the App reported another, the two vacuous
tests, and the two occasions the model ran a prohibited git command to undo its
own work.

**The open question CLAUDE.md sets.** Whether spec-first prompting helped is
supposed to be answered honestly, and there is now evidence on both sides:
ADR 0012 records two spec errors that only appeared once code existed, which is
an argument against; and the Stage 2 oracle table, written before the code and
never adjusted to match it, is an argument for. Both belong in the section.

**Work to produce it.** Writing and cutting. No blockers.

## 5. Sanity Project Details — met, and already public

**Project ID: `aos9nze5`.**

**The finding that inverts the question.** `production` was created
2026-09-18T16:18:50Z with `aclMode: public`, and has been public ever since. It
is the only dataset in the project. So the choice between "project ID" and
"public dataset URL" is not a choice about what to expose — it has already been
exposed for six days. It is only a choice about which string to paste.

**Which is better here.** Give the **project ID**. Reasons:

1. It is what the template asks for first and what a judge can act on. With a
   public dataset, the project ID is sufficient to query everything:
   `https://aos9nze5.api.sanity.io/v2024-01-01/data/query/production?query=*[_type=="wine"][0..5]`
   works from a browser address bar with no token.
2. A project ID invites the judge into the Studio and the App, which is where
   the argument lives. A raw dataset URL invites them into a JSON dump, which
   is the least interesting view of an event-sourced model — a flat list of
   1,645 documents with the derivation stripped out.
3. Nothing is protected by choosing one over the other, because both reach the
   same public data.

**What is actually exposed, measured rather than reasoned.** The following
comes from unauthenticated HTTP queries against
`https://aos9nze5.api.sanity.io/v2024-01-01/data/query/production` — no token,
no cookie, no session. Every one succeeded, which is itself the first finding.

Shape: **1,645 documents, 0 drafts**, six types — `wine` 98, `producer` 8,
`bottle` 542, `acquisition` 542, `consumption` 294, `assessment` 161. No system
or schema documents, because no schema has been deployed.

**Fields that are populated at all:**

| Type | Populated | Empty on every document |
| --- | --- | --- |
| `acquisition` | `acquiredAt` 542, `source` 542, `sourceType` 542 | **`price` 0, `currency` 0** |
| `consumption` | `consumedAt` 294, `tastingNote` 240 | **`occasion` 0** |
| `producer` | `name` 8, `region` 6 | **`country` 0**, `website` 0, `notes` 0 |
| `wine` | `cuvee` 98, `vintageYear` 98, `varietals` 98, `color` 98, `appellation` 82 | `title` 0, `notes` 0, `derived` 0 |
| `bottle` | `format` 542 | `location` 0, `closure` 0, `notes` 0, `derived` 0 |
| `assessment` | `sourceName` 161, `notes` 161, `derivedFrom` 38 | `confidence` 0, `sourceMethod` 0 |

**The four fields named in the prompt are confirmed empty**, and the reason is
the one given: `sample_data/README.md` lists the ledger columns as
`date | type | wine | bottle | sourceType | sourceName | drinkFrom | drinkUntil | note`.
There is no column for a price, a currency, an occasion or a country, so the
transform had nothing to carry. Nothing was redacted; nothing was ever
collected.

**`acquisition.source` was not on the list and is populated 542 times, so it
needs checking — and it is a category, not a merchant.** All 542 draw from four
values: `gift`, `grocery store`, `retail, delayed release`, `winery club`.
`sourceType` is `gift`, `retail`, `winery`. No shop is named anywhere.

**`tastingNote` is templated, not written.** 240 notes drawn from **38 distinct
strings**, reused verbatim across bottles — "Structured. Could have waited
another two years." appears many times over. These are generated descriptors,
not a person's prose.

**So what is left that is drawn from real life:**

1. **The producer list.** Six named wineries — Brooks, Chateau Mouton
   Rothschild, Farm on Golden Hill, Paradis Vineyards, St. Josef's, Vitis
   Ridge — plus two placeholders, `California (assorted)` and
   `Lodi (assorted)`. Five of the six are Willamette Valley. These are public
   commercial entities.
2. **The buying pattern and its scale.** `sample_data/README.md` states it in
   the open: two clubs at six bottles a quarter for five years, Brooks
   quarterly 2014–2022, ~540 acquisitions, ~250 on hand. That README is already
   in the public repository.
3. **The date span.** Acquisitions 1996-05-18 to 2026-09-14; consumptions
   1996-11-09 to 2026-09-17. Everything except the Mouton starts in 2014.
4. The assessment `sourceName` values, which are `me` plus the six producers
   plus four apparent publications — `Cascadia Wine Review`,
   `Northwest Cellar Notes`, `Pacific Vintage Quarterly`,
   `The Vintner's Ledger`. Those four do not correspond to publications I can
   identify and read as invented; worth a glance to confirm they are.

**Assessment.** The inference available to a stranger is roughly: someone in or
near Oregon has been buying Willamette Valley Pinot since the mid-2010s, owns
one old Bordeaux, and belongs to a couple of wine clubs. No name, no address,
no merchant, no amount of money, no sentence anyone actually wrote. The
"drinking diary" concern the earlier draft of this document raised does not
survive contact with the data.

Two structural facts to keep in view anyway, since they are properties of
`public` rather than of this dataset:

- **Drafts would be exposed too.** There are zero today, but a public dataset
  has no draft/published read boundary, so anything left unpublished in the
  Studio later becomes anonymously readable at its `drafts.` ID.
- **The whole dataset can be exported**, not merely queried, and `public`
  governs read only — mutations still require a token.

The one thing not to do is flip the dataset to private. It is the only artifact
a judge can open without an account, which matters more now that the deployment
route is closed, and the data has been public for six days regardless.

## 6. Agent Session transcript (optional) — retrievable

**They can still be exported, and coverage is unbroken.** Six transcript files,
approximately 9.0 MB of JSONL, spanning from the first session to this one with
no gap:

| File | Span (UTC) | Size |
| --- | --- | --- |
| `C--Users-kenal/ff9f73be-…jsonl` | 2026-09-18 17:31 → 2026-09-22 18:00 | 3.5 MB |
| `C--Users-kenal/2372496b-…jsonl` | 2026-09-22 18:09 → 18:43 | 912 KB |
| `C--Users-kenal/57f73c22-…jsonl` | 2026-09-22 22:29 → 22:53 | 932 KB |
| `C--Users-kenal-Cellar/d55f14e3-…jsonl` | 2026-09-23 14:18 → 14:42 | 900 KB |
| `C--Users-kenal-Cellar/f74ba281-…jsonl` | 2026-09-23 15:01 → 20:43 | 3.2 MB |
| `C--Users-kenal-Cellar/b27a7742-…jsonl` | 2026-09-23 21:26 → current | 628 KB |

The earliest timestamp, 2026-09-18T17:31Z, matches Session 0 in the friction
log. Nothing from the ten logged sessions is missing.

**Why they are in two directories.** Sessions through 22 September ran with the
working directory at `C:\Users\kenal`; from 23 September onwards at
`C:\Users\kenal\Cellar`. Claude Code keys its transcript cache by working
directory, so half the project's history is filed under the home directory and
would be easy to miss if only the Cellar folder were checked. A single session
file also spans several logged sessions when `/clear` was used rather than a
restart, which is why six files cover ten sessions.

**The retention risk, and why it is not urgent.** Transcripts are cached under
`~/.claude/projects/<slug>/` and cleaned up on an age policy.
`~/.claude/settings.json` sets only `autoUpdatesChannel` and `theme`, so
whatever the default retention is, it is in force. Circumstantial evidence that
it is 30 days: an unrelated 25 August session file is still present today,
exactly 30 days later, and is the oldest surviving file anywhere in the cache.
On that reading the oldest Cellar transcript survives until roughly 18 October,
two weeks past the deadline.

**Do it anyway.** Copying nine megabytes out of a cache with an eviction policy
costs nothing, and the cost of being wrong about the policy is the loss of the
primary evidence for the section the entry is judged on first.

```powershell
# Read-only. Copies, does not move.
$dest = "C:\Users\kenal\Cellar-transcripts"
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item "$env:USERPROFILE\.claude\projects\C--Users-kenal\*.jsonl" $dest
Copy-Item "$env:USERPROFILE\.claude\projects\C--Users-kenal-Cellar\*.jsonl" $dest
```

Destination deliberately **outside** the repository: these files contain full
prompt and output history, and `write-up/` is the only ignored directory that
would otherwise suit.

**Unverified.** What format DEV's Agent Session upload accepts — raw JSONL, a
rendered transcript, or a link — has not been checked against the actual
submission form and is not something to guess at. Check the form before
converting anything. If a readable rendering is wanted, the per-session
friction logs already contain unedited prompt-and-output transcripts for
sessions 3 onward and are a better artifact for a human reader than 9 MB of
JSONL.

---

## What is actually on the critical path

Nothing is blocked. Both of the items that looked like unknowns are now
answered, and neither answer requires infrastructure work.

The critical path is the **staging run**, because it is the only source of the
one artifact the submission genuinely lacks: moving pictures of the review
workflow. That run is happening anyway. Recording it costs nothing extra and
capturing stills from it costs nothing extra, and if it is run without a
recorder going, producing the demo later means setting the whole thing up a
second time.

Recommended order:

1. **Start a screen recorder before the staging run**, not after. Everything
   below depends on this one.
2. Run the staging sequence. Capture stills at each of the four observations.
3. Copy the transcripts out of the cache.
4. Write the five prose sections, with the deployment finding as part of the
   build-process narrative rather than as an apology in the demo section.

Explicitly **not** on the list: `sanity deploy`, and any change to dataset
visibility.
