### 24 September 2026, Session 9

#### Stage 4: staging plan, submission readiness, and the deployment question

IDE / tool: WebStorm + Claude Code v2.1.229, Opus 5 (1M context), Windows /
PowerShell. Sanity MCP server connected. A fresh Claude Code session with no
memory of the previous day's plan.
What I was trying to do: confirm the staging verification plan before running
it, and audit what the DEV submission actually requires against what exists.
Outcome: no code written, no dataset touched. Six corrections to the plan, a
settled answer on deployment that changes the submission, and eight friction
findings.
Elapsed: 08:06 to 09:03 am, about 57 minutes.

This was a research session. Nothing was built, and it produced the most
consequential finding of the project so far.

#### Timeline

| Time | Step | Model time |
| --- | --- | --- |
| 08:06 to 08:23 am | Prompt 1: reconstruct the staging plan cold, audit submission readiness | 7m 58s |
| 08:25 to 08:42 am | Prompt 2: six adjustments approved, exposure question, deployment question | 7m 11s |
| 08:44 to 08:49 am | Prompt 3: probe the App SDK's anonymous-read behaviour | 2m 25s |
| 08:51 to 08:55 am | Prompt 4: is there a supported configuration at all? | 2m 5s |
| 08:56 to 09:03 am | Prompt 5: write the sequence to a file | |

#### Reading a plan cold is worth something

The session opened by handing a fresh model the previous day's plan and
asking it to reconstruct the sequence from the repo, then say what it would
do differently. It found six things, two of them real:

- **The working directory in my own recap was wrong.** I had written
  `cd C:\Users\kenal\Cellar` for commands that need `studio/`. There is no
  `sanity.cli.ts` at the repo root, so the CLI has no project to act on.
- **`--dataset staging` has to be explicit on every CLI write.**
  `studio/sanity.cli.ts` pins `api.dataset: 'production'`. The Studio
  application follows `SANITY_STUDIO_DATASET`; the CLI does not. Same
  directory, same session, two different cellars, and omitting the flag
  writes to production.
- The tarball landed at the repo root and was not gitignored.
- `npx sanity@latest` would fetch an unpinned fifth CLI version into the one
  sequence that writes data.
- The port collision between the two dev servers is real, with one registered
  CORS origin.
- Accept is one-way, so the plan demonstrated half the workflow.

The last one produced a better demo. A second stand-in was added so Reject
could be shown too, chosen on the rule that a rejection proves nothing unless
accepting the same claim would visibly have changed something. The claim it
picked would have moved five bottles from PAST_WINDOW to HOLD and emptied a
whole wine out of Missed Opportunities.

#### The positive control

The plan asked me to observe that a proposed claim moves no count. The model
pointed out that this proves nothing on its own: a document in the wrong
dataset, saved as a draft, or with a mistyped `_type` would also leave the
counts unchanged, for the wrong reason.

So a required step was added before that observation: query the dataset and
confirm the proposed claims are actually there. This is session 8's vacuous
test finding transplanted from the test suite onto the screen. An assertion
that something has no effect is worthless until you have separately shown the
something was present.

#### The production dataset has been world-readable since day one

Not a decision waiting to be made. `production` has carried
`aclMode: public` since it was created on 18 September, which means every
document has been readable unauthenticated for the entire project.

I asked for the exposure to be established by querying the dataset rather
than reasoning from the schema. That reversed the answer. The schema declares
`price`, `currency`, `occasion`, and `producer.country`; the transform never
filled any of them, because `ledger.csv` has no columns for them. Also empty:
`website`, `wine.title`, `wine.notes`, `bottle.location`, `bottle.closure`,
`assessment.confidence`. Zero drafts.

It also found a field I had not listed. `acquisition.source` is populated 542
times, holding five category values (gift, grocery store, retail, delayed
release, winery club). A category, not a merchant. No shop is named.

What actually remains drawn from real life: six named producers, the buying
cadence (already stated openly in the public repo), and the date span. The
inference available to a stranger is roughly that someone near Oregon has
bought Willamette Pinot since the mid-2010s and owns one old Bordeaux.

The drinking-diary concern did not survive contact with the data. Both of us
had been reasoning from a schema that declares five fields the transform
never populated.

#### The finding: the App SDK has no path to a public demo

The DEV submission template requires a link to a deployed project. This took
four prompts to settle and the answer is no, in two independent ways.

**Deploying it does not help.** The Dashboard gives access to apps "within
the organization". A changelog entry from 2025-10-27 lists, under Notable
Fixes, that users could previously see studios in an organization they did
not have access to. Cross-organization visibility was not an unspecified edge
case; it was a bug that got fixed. So `app.visibility: unlisted` never meant
what its warning implies, and a judge outside the organization gets a
request-access screen.

**Hosting it statically does not help either.** The two layers disagree, and
that disagreement is the finding. The transport layer would allow an
anonymous read: with no token the SDK deletes the key rather than sending it
empty, and a public dataset answers happily. The React layer never gets
there. `AuthBoundary` redirects to a login page when the visitor is logged
out, not in an iframe, not a Studio, and not in a Dashboard environment,
which a statically hosted page is all four of at once.

Asked whether any supported configuration satisfies that boundary without a
user token, it enumerated the entire typed surface rather than sampling it:
`auth.token`, `auth.providers`, `auth.oauth`, `auth.clientFactory`,
`auth.storageArea`, `callbackUrl`, `apiHost`, `LoginComponent`,
`verifyOrganization`, and `SanityApp`'s own props. Every route resolves to a
user token. The documentation agrees with the types: the SDK determines auth
state from the environment, "that is, one of: a Sanity Dashboard iframe,
Sanity Studio." Two environments. A static host is not something the SDK
models.

> The Sanity App SDK has no anonymous-read mode. A custom app cannot be shown
> to anyone outside the organization: not by deploying it, because the
> Dashboard gates on organization membership, and not by hosting it
> statically, because the SDK redirects an anonymous visitor to a login page
> before a single query is issued. The dataset can be public and the app
> still cannot be. The platform's newest surface, and the one its own
> challenge brief names as a bonus, has no path to a public demo.

Worth noting where the documentation sits on this. The Studio docs have an
entire section on self-hosting a Studio at a public URL without
authentication. The App SDK docs describe Dashboard-mode development and say
nothing about hosting an app yourself. That asymmetry is why this needed an
experiment rather than a lookup.

#### The near-miss it recorded rather than recommended

There is exactly one typed field that would suppress the logged-out
transition without a token. `SanityConfig.studio` is real and documented, and
`StudioConfig.authenticated` says that when true and the token source emits
null, the SDK infers cookie-based auth rather than transitioning to logged
out. Merely having `config.studio` present also flips `isStudio` and disables
the redirect branch. On paper, `config.studio = {authenticated: true}` makes
a static page render.

It declined to recommend it, for three reasons drawn from the same
documentation: the field asserts something false, since there is no Studio
and no user; it selects cookie auth, building a credentialed cross-origin
request needing a cookie the anonymous visitor does not have; and Studio mode
has a documented ceiling where only project-level endpoints work, which this
app would survive by accident because it happens to make only project-scoped
queries.

Claiming to be a Studio in order to read a public dataset is a workaround,
not a supported configuration. Recording the near-miss rather than building
on it is the same instinct as the `perspective` type near-miss in session 3,
and it is worth more than the shortcut would have been.

#### Consequences for the submission

The fallback is now decided rather than discovered on deadline: a video
walkthrough, screenshots, the public dataset endpoint, and the project ID,
with the reason for the missing link stated plainly. That reads better than a
dead URL, and it is on topic for the first judging criterion.

It also makes the staging run the critical path for a new reason. It is the
only source of the one artifact the submission lacks, so the screen recorder
starts before step one.

The remaining route to a real demo is porting the four views off the App SDK
onto a plain `@sanity/client` fetch against the public dataset, which touches
one file, since everything downstream takes a `Cellar` object and knows
nothing about Sanity. That is an afternoon after 4b, not a rebuild, and it
sharpens the finding rather than dodging it: the data was always publicly
readable, and it was the SDK that refused.

#### Transcripts are retrievable

Six JSONL files, about 9 MB, earliest timestamp 18 September, covering all
sessions. They appeared to be missing at first because Claude Code keys its
cache by working directory and the project moved from `C:\Users\kenal` to
`C:\Users\kenal\Cellar` on the 23rd, so half the history is filed under an
unrelated folder. Retention looks like 30 days, which clears the deadline by
two weeks. Copying them out anyway.

#### Build findings

#### 1. The staging plan's own recap disagrees with itself about the working directory, and only one version works

Session 8 wrote the sequence out twice. Prompt 2's version opens with
`cd C:\Users\kenal\Cellar\studio`; prompt 4's closing recap opens with
`cd C:\Users\kenal\Cellar`. The commands underneath are identical.

Only the first works. There is no `sanity.cli.ts` at the repository root ,
the root holds `sanity.blueprint.ts`, which is a different file for a
different tool. The Sanity CLI takes `projectId` from `sanity.cli.ts` in the
current directory, so `sanity dataset create staging` from the root has no
project to create a dataset in. It prompts or fails rather than doing
something wrong, so this costs a minute, not a mistake.

What makes it worth recording is the shape: a monorepo where the CLI's notion
of "the project" is per-directory and two of the four package directories
have no `sanity.cli.ts` at all. Nothing in the layout signals which
directories are CLI-capable. `cd` is load-bearing configuration.

#### 2. One package, two dataset settings, pointing at different datasets, governing different surfaces

`studio/sanity.config.ts:17` reads `process.env.SANITY_STUDIO_DATASET ||
'production'`. `studio/sanity.cli.ts` hardcodes `api: {dataset: 'production'}`.
Both are current, both are correct, and they govern different things: the
config drives the Studio application, the CLI config drives every `sanity`
command run from that directory.

So during the staging rehearsal, with `SANITY_STUDIO_DATASET=staging`
exported, the Studio in the browser reads staging while any CLI command run
from the same directory without an explicit `--dataset` reads and writes
**production**. `sanity documents create`, `sanity dataset export`,
`sanity graphql deploy`, all of them default to the CLI config, and the
export the plan runs (`dataset export production`) names its dataset
explicitly only because someone thought to.

This is the same class of defect session 8 found in the App's env-var
handling, from the opposite direction. There, one mechanism silently didn't
apply. Here, two mechanisms both apply, to different surfaces, and the
environment variable that repoints one of them has no effect on the other and
says nothing. In both cases the failure is a correct-looking command aimed at
the wrong cellar.

#### 3. Both dev servers default to port 3333, and exactly one origin is registered for CORS

The App SDK dev server defaults to `localhost:3333`. So does `sanity dev` for
the Studio. The project has one CORS origin configured:

```
http://localhost:3333  (allowCredentials: true)
```

The staging sequence wants the App and the Studio open at once, watch the
counts in one, click Accept in the other. Whichever starts second gets 3334,
and 3334 is not an allowed origin. The failure is a CORS error at the API
layer, which will read as a broken app rather than as a missing config entry.

Neither surface warns that the port it just picked is not one the project
will accept requests from, and the two pieces of information live in
different places: the port is in the terminal, the origin list is in Manage.

#### 4. `sanity dataset` singular still resolves, which is worth knowing precisely because the reference only documents the plural

The CLI reference page is `datasets`, and `sanity --help` lists `datasets`
under TOPICS. Session 8's plan was written with `sanity dataset create`, the
singular. Asking the CLI directly, `sanity dataset --help` prints the
`datasets` help, so the singular is an accepted alias.

A small thing, but it is the fourth time this project has had to ask the
installed tool a question the documentation answers only for the current
spelling. The reference documents what a command *is* called, never what it
*also* answers to, so any older command in a script is unfalsifiable from the
docs alone.

#### 5. The production dataset has been world-readable since the day it was created, and nothing ever said so

`list_datasets` reports `production` with `aclMode: public`, created
2026-09-18T16:18:50Z. It was created by `sanity init` during setup and has
been public for six days.

Public means unauthenticated read of every document in the dataset over the
HTTP API, all 1,645 of them, drafts included, since a draft is just a
document with a prefixed ID and there is no draft/published boundary in read
permissions. The whole thing can be exported by a stranger with the project
ID, which appears in `app/src/sanity.ts`, `studio/sanity.cli.ts` and
`studio/sanity.config.ts`, all in a public GitHub repository.

None of that is wrong, and for a contest entry it is arguably ideal. What is
worth recording is that six days of work happened on top of it without the
fact surfacing anywhere: not in the Studio, not in the App, not in any CLI
output, not in `sanity.config.ts`. `sanity init` asks whether to use the
default dataset configuration; it does not say that the default is public.
The information is available, `sanity datasets visibility get production`
returns it, `list_datasets` returns it, but only to someone who already
suspects there is something to ask about.

The project has a masthead badge that shouts when the dataset is not
production, added precisely because "which cellar am I looking at" turned out
to be worth putting on screen. "Who else can read this cellar" is the same
kind of question and has no such answer anywhere.

#### 6. Whether a non-member can open a deployed App SDK app is answered, but not on any page about deploying apps

An App SDK app deploys to the organization dashboard rather than to a
`*.sanity.studio` hostname. The `app.visibility` option takes `default` or
`unlisted`, and the docs carry a clear warning that `unlisted` is not a
security boundary: "Anyone with the link can still open it."

Read on that page alone, the sentence says link access is ungated, and the
obvious inference is that `unlisted` is how you hand a work-in-progress app to
someone outside the organization. That inference is wrong, and the three
pages a developer would consult about deployment, deployment, configuration,
authentication, never correct it. The auth page gets closest and stops one
step short: Dashboard mode redirects to `sanity.io/login` when no session
exists, which establishes that a login is needed and says nothing about whose.

The answer is in the Dashboard section and in a changelog:

- Dashboard introduction: the dashboard "gives access to deployed studios and
  apps **within the organization**".
- Changelog v2025-10-27: "Users can now request access directly from the
  Dashboard when they try to open a studio or organization **they don't have
  access to**."
- Same entry, Notable Fixes: "Fixed an issue where users could see studios
  within an organization that they didn't have access to."

The third is decisive, and it is the one that could only have been found by
reading release notes. Cross-organization visibility was not an unspecified
edge case, it was a **bug, and it was fixed**. So `app.visibility` never had
the meaning the warning implies: `default` and `unlisted` both mean
organization members only, and the setting chooses between listed and
unlisted *within* that boundary.

Two things make this worth recording beyond the decision it drives.

The warning is accurate and still misleads. "Anyone with the link can still
open it" is true of the population it is scoped to and false of the population
a reader is thinking about, and nothing on the page names the scope. A
security note that understates the protection is an unusual defect, the
failure mode is not an unsafe deployment but an abandoned one, or worse, a
submission built around a link that does not work for its audience.

And the fact needed here is a *product access model*, which is the kind of
thing that belongs in reference documentation and was instead distributed
across an introduction and a bug-fix line in a ten-month-old release note.
This project has now resolved four questions by reading something other than
the documentation, the installed bundle twice, `node_modules` twice, and
this is the first resolved by reading a changelog.

Consequence for the submission: deploying is off the list. It would produce a
URL that shows a judge a request-access screen, which is worse than no URL.
`docs/submission-readiness.md` records the fallback.

#### 7. Claude Code files transcripts by working directory, so half this project's history is under a different folder

Checking that the session transcripts were still retrievable turned up only
three files for ten logged sessions, which looked like eviction. It was not.
Sessions through 22 September ran with the working directory at
`C:\Users\kenal`; from 23 September at `C:\Users\kenal\Cellar`. The cache is
keyed by working directory, so the project's history is split across two
folders that share no naming relationship to each other.

Coverage is actually complete: six files, about 9 MB, earliest timestamp
2026-09-18T17:31Z, which matches Session 0. Six files cover ten sessions
because `/clear` continues a session file rather than starting one.

The general form is worth keeping for the writeup, since the submission asks
for an agent transcript: the evidence that a build happened is stored
somewhere the build itself does not point at, filed under a key the person
running it never chose deliberately, and "I checked the project folder and
it's mostly missing" is the wrong conclusion reached correctly.

#### 8. The exposure question was answerable in three queries, and the answer was the opposite of the schema's

Deciding whether a public dataset was safe to advertise looked like a
judgement call about a cellar "loosely based on a real one". It was not a
judgement call, it was a measurement, and the measurement took three
unauthenticated HTTP requests.

Reasoning from the schema gives the alarming answer. `acquisition` declares
`price` and `currency`. `consumption` declares `occasion` alongside a
free-text `tastingNote`. `producer` declares `country` and `website`. Read the
schema and the dataset is a purchase history with amounts, a drinking diary,
and enough geography to place a household.

Querying it gives a different answer. `price` 0, `currency` 0, `occasion` 0,
`country` 0, `website` 0, populated on not one of 1,645 documents, because
`ledger.csv` has no columns for them and the transform had nothing to carry.
`tastingNote` is 240 values drawn from 38 distinct strings, reused verbatim;
generated descriptors, not prose. And the field that *is* populated 542 times
and was not on anybody's list, `acquisition.source`, turns out to hold four
category values, `gift`, `grocery store`, `retail, delayed release`,
`winery club`, and names no merchant at all.

The gap between the two answers is the finding. A schema is a statement about
what a document *may* carry, and it is the artifact everyone reaches for when
asking what is exposed, because it is the one that is legible without network
access. It systematically overstates. Here it overstated by five fields, in
the direction that produces unnecessary alarm, and a sixth field it describes
accurately, `source`, a string, would have been read as a merchant name by
anyone reasoning from the declaration rather than the values.

Worth generalising for the writeup: "what does this dataset expose" is not a
schema question, and answering it from the schema is fast, free, and wrong in
both directions. Three `count(*[defined(field)])` queries settle it, and the
queries are cheaper than the argument about the schema.

The second-order observation is that the whole audit ran unauthenticated from
a shell, with no token minted and nothing configured. That is exactly what
makes the dataset a usable submission artifact now that the deployment route
is closed, and the same property is why the question was worth asking.
 
---

#### Transcripts

Full prompts and outputs, unedited.

##### Prompt 1: reconstruct the plan cold, audit readiness (08:06 to 08:23 am)

```text
Session 9, part one: staging verification and a submission readiness audit.

Do not write code this turn. Read first.

Context: Stage 4a is committed. The review workflow, the derived-field schema,
and ADR 0012 are in place. No dataset has been written to and the schema is
not deployed. A staging plan was worked out in the previous session and I am
about to run it, but you are a fresh session and did not write it.

A. Reconstruct and confirm the staging plan.

   Read docs/friction-logs/session8.md, studio/scripts/seed-proposed-
   assessment.mts, docs/ADRs/0012-*, studio/actions/reviewActions.tsx,
   studio/structure/index.ts, app/src/sanity.ts, and
   packages/cellar-core/test/workflow.test.mts.

   Then tell me:

   1. The exact sequence, in order, with commands, and mark any step that
      writes to production. I believe part one has none. Say so explicitly if
      that is right, and if it is not, stop and tell me which step does.

   2. The baseline numbers the App must show against staging before the
      proposal is written, and what I should conclude if any differ.

   3. The three observations: baseline, after the proposal exists, after
      Accept. What to record at each. The middle one is the one proving
      proposed claims are inert in the real system rather than only in a unit
      test, and it is the easiest to skip on the way to clicking Accept.

   4. Anything in the plan you disagree with now that you are reading it
      cold. A fresh reading is worth something; say if you would do it
      differently.

B. A submission readiness audit.

   The DEV submission template requires: What I Built; Demo, with a link to
   the deployed project plus video or screenshots; Code, a repository link;
   My Build Process; Sanity Project Details, a project ID or public dataset
   URL; and optionally an Agent Session transcript.

   Produce docs/submission-readiness.md recording, for each item: what exists
   today, what is missing, and what work would produce it. Be specific about
   the two I know are unmet:

   1. Deployment. ADR 0010 deferred it as out of scope and the template
      requires it. Say what `sanity deploy` from app/ creates, what it costs,
      whether the deployed App reads the production dataset without further
      configuration, and what the visibility options mean for whether judges
      can open it.

   2. Project ID or public dataset URL. Say which is the better choice here,
      given the dataset is a cellar loosely based on a real one, and what
      making a dataset public actually exposes.

   Also record whether the Claude Code transcripts from earlier sessions can
   still be exported, since the Agent Session upload wants them and I have not
   checked they are retrievable.

   Record this work. Do not do it.

Then stop. I will run the staging sequence and report what I see.

Standing rules: no git commands that change the repo, no writes to any
dataset without telling me first, write the commit message and tell me what
to stage. Friction log entries go to docs/friction-logs/session9.md.
```

##### Prompt 1 output

```text
Read-only session. No code, no dataset writes, no schema deploy.

  A. The staging plan

  1. The sequence, and where production sits
  
  Part one writes nothing to production. That is correct as you believed, but two steps would if a detail slipped, and one of those details is wrong in the plan as written. Both are called out below.

  ┌─────┬────────────────────────────────────────────────────────────────────────────────┬────────────────────────────┐
  │  #  │                                    Command                                     │          Touches           │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 0   │ Confirm app/src/sanity.ts:23 reads 'production'                                │ nothing                    │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 1   │ cd C:\Users\kenal\Cellar\studio                                                │,                          │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 2   │ npx sanity dataset create staging --visibility private                         │ creates a dataset          │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 3   │ npx sanity dataset export production C:\Users\kenal\staging-seed.tar.gz        │ reads production           │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 4   │ npx sanity dataset import C:\Users\kenal\staging-seed.tar.gz staging           │ writes staging             │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 5   │ node scripts\seed-proposed-assessment.mts staging                              │ writes one local JSON file │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 6   │ Edit app/src/sanity.ts → DATASET = 'staging'                                   │ local edit                 │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 7   │ cd ..\app; npm run dev → observation 1                                         │ reads staging              │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 8   │ $env:SANITY_STUDIO_DATASET='staging'; cd ..\studio; npx sanity dev --port 3334 │ reads staging              │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 9   │ npx sanity documents create scripts\proposed-assessment.json --dataset staging │ writes staging             │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 10  │ observation 2                                                                  │ reads staging              │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 11  │ Studio → Review queue → Awaiting review → Accept                               │ writes staging             │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 12  │ observation 3                                                                  │ reads staging              │
  ├─────┼────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┤
  │ 13  │ Revert app/src/sanity.ts to 'production'                                       │ local edit                 │
  └─────┴────────────────────────────────────────────────────────────────────────────────┴────────────────────────────┘

  Step 3 names production explicitly and only reads it. Nothing else in the sequence addresses production at all.

  The two places a slip becomes a production write:

  - Step 9, if --dataset staging is omitted. studio/sanity.cli.ts pins api.dataset: 'production'. The Studio application follows SANITY_STUDIO_DATASET; every sanity CLI command run from that directory follows the CLI config, which is production regardless of the environment variable. Same directory, same
  session, two different cellars.
  - Step 11, if step 8's variable was not exported before the server started. Session 8 established that the substitution happens at build start. A Studio silently on production shows an empty Awaiting review, so there is nothing to click, the failure is self-limiting, and the empty queue is the tell.

  2. Baseline, and what a difference means

  Against staging, at today's date:

  ┌──────────────────────┬───────────────────────────────────────────────────────────────────────┐
  │                      │                                                                       │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Cellar Health        │ HOLD 45 · DRINKING 166 · PAST_WINDOW 33 · UNASSESSED 4 · CONSUMED 294 │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │                      │ 248 in cellar, 542 total                                              │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Drink Soon           │ 23 bottles / 12 wines                                                 │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Missed Opportunities │ 11 bottles / 5 wines                                                  │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Masthead             │ dataset: staging                                                      │
  ├──────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Studio review queue  │ Awaiting review 0 · Accepted 161 · Rejected 0                         │
  └──────────────────────┴───────────────────────────────────────────────────────────────────────┘

  These were computed for ORACLE_NOW = 2026-09-18 and today is the 24th, so I checked rather than assumed. No assessedAt, consumedAt, acquiredAt, drinkFrom or drinkUntil anywhere in the 1,645 seed documents falls in 2026-09-18 … 2026-09-29. Nothing can have moved in the intervening six days. The numbers
  stand unchanged today.

  Conclusions if they differ:

  - No badge → the App is on production. Stop; step 6 didn't take.
  - Total ≠ 542, or Accepted ≠ 161 → the import is incomplete. Re-run step 4; nothing after it means anything.
  - Total = 542 but a count differs → given the check above, this cannot be drift. Either the asOf control is not at today, or the copy is not a copy. Stop.

  3. The three observations

  Observation 1, baseline. The table above, plus the Drink Soon row for 2024 Farm on Golden Hill Rose: present, 5 bottles, through 2026, provenance naming the personal claim of 2025-04-05. That row is the one that will move.

  Observation 2, the proposal exists, unaccepted. The one you flagged, and it needs more than "nothing changed":

  - All six Cellar Health numbers, read individually. Drink Soon 23 / 12. Missed 11 / 5.
  - The Farm on Golden Hill Rose row still present, still through 2026, and its provenance line still naming the 2025-04-05 claim. That line is what separates "fetched and discarded" from "unchanged for some other reason".
  - Studio: Awaiting review 1, Accepted 161.

  And a positive control, which the plan does not have. CellarProvider runs CELLAR_QUERY with perspective: 'published'. If the new document were a draft, or under a different _type, or in the wrong dataset, the counts would also be unchanged, and for the wrong reason. Before you read "nothing moved" as
  evidence, establish the claim actually arrived. In Vision against staging:

  groq
  count(*[_type == "assessment" && reviewState == "proposed"])

  Expect 1. This is session 8's own vacuous-test finding transplanted onto the screen: an assertion that something has no effect proves nothing until you separately show the something was present. Skip it and observation 2 is satisfied by a document that never existed.

  Observation 3, after Accept. DRINKING 166 → 161, PAST_WINDOW 33 → 38, Drink Soon 23 / 12 → 18 / 11, and the wine's row gone from Drink Soon entirely. Record the non-movements too, because they are the claim: HOLD 45, UNASSESSED 4, CONSUMED 294, in-cellar 248, and Missed Opportunities still 11 / 5, the
  new window closes 2024-12-31, before the trailing-twelve-month period opens. Studio: Awaiting review 0, Accepted 162, Accept and Reject gone from the action bar, reviewState showing accepted and greyed.

  4. What I'd change

  Six things, in rough order of how much they cost you.

  1. The working directory is wrong in session 8's final recap. It says cd C:\Users\kenal\Cellar; the earlier version says cd ...\studio. Only the second works, there is no sanity.cli.ts at the repository root, so the CLI has no project to act on. Fails loudly, costs a minute.
  2. Pass --dataset staging explicitly on step 9, per the CLI-config split above. Prove the CLI can see staging first: npx sanity documents query 'count(*)' --dataset staging → 1645.
  3. The port collision is real. Both dev servers default to 3333 and the project has exactly one CORS origin, http://localhost:3333. Whichever starts second takes 3334 and gets refused at the API layer, which will look like a broken app, not a config gap. Either run them one at a time, or start the Studio
  on 3334 and add that origin. Adding a CORS origin is a project-config write; I have not made it, and it needs your say-so.
  4. Put the tarball outside the repository. Both versions of the plan land it at the repo root, and it is not gitignored. It is a complete copy of a cellar whose ledger carries prices, merchants and tasting notes, sitting next to package-lock.json.
  5. Drop @latest. npx sanity@latest fetches an unpinned CLI, a fifth version alongside the installed sanity 6.16.0, the blueprint's runtimeCliVersion 17.14.0, and the 8.12.0 the MCP host runs. Session 8's own finding was that version drift here is unfalsifiable from the docs; adding an unpinned fetch to
  the only sequence that writes data argues against itself. npx sanity from studio/ resolves the workspace CLI.
  6. Accept is one-way, and the plan gets one transition out of one document. reviewActions.tsx:63 returns null off proposed, so once you Accept there is no path back, and the script's deterministic _id means re-running it collides rather than producing a second claim. Reject is half the workflow and the
  half that demonstrates nothing is destroyed. If you want to see it, decide before you click: either Reject first and then delete and re-create the document in staging, or point CONSUMPTION_ID at a second consumption for a second stand-in.

  One thing I'd leave exactly as it is: sourceMethod: 'extracted' on a hand-written stand-in. The reasoning in the script header is right, and it is the field most likely to be second-guessed at the moment of writing it.

  B. Submission readiness, recorded, not done

  docs/submission-readiness.md. The short version:

  Met: Code (kenwalger/Cellar, public, pushed 23 Sep). Sanity Project Details. Screenshots exist but all predate Stage 4a, none show the review queue.

  Deployment. ADR 0010 doesn't defer it, neither it nor the build plan mentions hosting at all, so there's no reasoning on file to revisit. sanity deploy from app/ puts an App SDK app on the organization dashboard, not a *.sanity.studio hostname; it modifies sanity.cli.ts on first run and needs an
  org-level role. Cost isn't stated anywhere in the docs, --dry-run answers it without creating anything. The dataset target needs no configuration because PROJECT_ID and DATASET are literals, which also means deploying while the staging edit is in place pins the deployed app to staging. The open question
  is access: the docs say unlisted is not private and "anyone with the link can open it", but never say whether "anyone" survives being outside the organization. That decides whether deploying gives judges a demo or a permission error, and only a second account can settle it.

  Project ID vs public dataset URL, the premise has already moved. production has carried aclMode: public since it was created on 18 September. Nothing is being decided about exposure; it has been world-readable for six days. Give the project ID: with a public dataset it reaches the same data, and it
  points judges at the Studio and the App rather than at a flat JSON dump of 1,645 documents. What public actually exposes, recorded as a disclosure: every document, unauthenticated, drafts included, and that includes acquisition prices, merchants, consumption dates and tasting notes. If any of the ledger
  is real rather than fictionalised, that is worth ten minutes with ledger.csv before the project ID goes into a submission designed to attract attention to it. Making it private now would be the wrong fix.

  Transcripts: retrievable, and nothing is missing. Six JSONL files, ~9 MB, earliest timestamp 2026-09-18T17:31Z, Session 0. They first looked mostly gone because Claude Code keys its cache by working directory and you moved from C:\Users\kenal to C:\Users\kenal\Cellar on the 23rd, so half the history is
  filed under an unrelated folder. Six files cover ten sessions because /clear continues a file. Retention looks like 30 days (an unrelated 25 August file is still present today, exactly 30 days on), which clears the deadline by two weeks, copy them out anyway; the doc has the command. What format DEV's
  upload accepts, I did not guess at.

  Seven friction findings appended to docs/friction-logs/session9.md.

  To stage:

  git add docs/submission-readiness.md docs/friction-logs/session9.md

  Commit message in commit-message.txt.

✻ Crunched for 7m 58s
```

##### Prompt 2: six adjustments, exposure, deployment (08:25 to 08:42 am)

```text
All six adjustments approved. Specifically:

1. Run CLI commands from studio/. My recap had that wrong.
2. Pass --dataset staging explicitly, and prove the CLI can see staging first
   with the count query.
3. Port collision: run the two servers one at a time. Do not add a CORS
   origin.
4. Tarball outside the repo, and I will delete it after the import.
5. Drop @latest; use the workspace CLI.
6. Second stand-in for Reject: point CONSUMPTION_ID at a second consumption
   so both transitions can be demonstrated. Tell me which consumption and
   what should move, or not move, when it is rejected.

The positive control goes in as a required step, not an optional one.

On the public dataset: correct me if wrong, but the transform never populated
price, currency, occasion or producer.country, because ledger.csv has no
columns for them. Confirm what is actually exposed today by querying the
dataset unauthenticated rather than reasoning from the schema, and list the
document types and the fields that carry anything drawn from real life. I
will decide on exposure from that list.

On deployment: settle the unlisted-access question before I commit to it,
since it decides whether judges get a demo or a permission error. If it can
only be answered with a second account, say so plainly and propose a
fallback, such as a video plus screenshots, that satisfies the template
without a link.

Then produce the final sequence as a single numbered list I can follow
without reconstructing anything, including the positive control and both
transitions.
```

##### Prompt 2 output

```text
All six adjustments are in, and two of your three questions came back with answers that change the plan.

  The Reject stand-in

  con-farm-on-golden-hill-pinot-noir-2023-d, 2023 Farm on Golden Hill Pinot Noir, note "Red cherry, forest floor, fine tannin. Still tight.", opened 2026-07-10. Window 2028–2036, assessedAt 2026-07-11.
  
  I picked it on the session 8 rule: a rejection that changes nothing proves nothing unless accepting the same claim would visibly have changed something. This one would move the most of any candidate, and in the opposite direction from the Accept demo:

  ┌────────────────────────┬──────────────────────┬─────────────┐
  │                        │       baseline       │ if accepted │
  ├────────────────────────┼──────────────────────┼─────────────┤
  │ PAST_WINDOW            │                   33 │          28 │
  ├────────────────────────┼──────────────────────┼─────────────┤
  │ HOLD                   │                   45 │          50 │
  ├────────────────────────┼──────────────────────┼─────────────┤
  │ Missed Opportunities   │ 11 bottles / 5 wines │       6 / 4 │
  ├────────────────────────┼──────────────────────┼─────────────┤
  │ this wine's Missed row │   present, 5 bottles │        gone │
  └────────────────────────┴──────────────────────┴─────────────┘

  All five bottles go PAST_WINDOW → HOLD, "still tight" pushes the window later, so bottles that read past-window become not-yet-ready. And the wine currently occupies 5 of the 11 rows in Missed Opportunities, so an accepted claim would empty a whole row out of a second view. That makes the rejection a
  real test: you are watching a row that had every reason to disappear stay exactly where it is.

  Two cautions. The window numbers above depend on using exactly 2028–2036, a different window gives different counts. And this wine shares a producer with the Accept demo (2024 Farm on Golden Hill Rosé); different vintage, different varietal, but they will sit near each other in a list. I'd keep it: same
  producer, two wines, opposite outcomes, is a good demonstration that claims attach to wines rather than producers.

  I also verified the Accept numbers independently rather than trusting session 8, DRINKING 166→161, PAST_WINDOW 33→38, Drink Soon 23/12→18/11, Missed unchanged at 11/5. They hold, and the baseline holds at today's date.

  Ordering matters. Write both stand-ins, observe inertness once with both present, then Reject, then Accept. Reject first keeps the rejection's numbers equal to the pristine baseline instead of to a post-Accept state.

  One mechanical note: the script takes its consumption from a constant and always writes to the same output path, so the second stand-in means editing CONSUMPTION_ID and MODEL_OUTPUT and re-running, and writing each JSON to staging before generating the next, or the second overwrites the first.

  The public dataset, you were right, and there's a field you didn't list

  Confirmed by unauthenticated HTTP, no token, no cookie. price 0, currency 0, occasion 0, producer.country 0, across all 1,645 documents. ledger.csv has no columns for them, so nothing was redacted; nothing was ever collected. Also empty: website, wine.title, wine.notes, bottle.location, bottle.closure,
  assessment.confidence. Zero drafts.

  acquisition.source is populated 542 times and wasn't on your list. It holds four values, gift, grocery store, retail, delayed release, winery club. A category, not a merchant. No shop is named.

  tastingNote is 240 values drawn from 38 distinct strings, reused verbatim. Generated descriptors, not anyone's prose.

  What actually remains drawn from real life, for your decision:

  1. Six named producers, Brooks, Chateau Mouton Rothschild, Farm on Golden Hill, Paradis Vineyards, St. Josef's, Vitis Ridge, plus California (assorted) and Lodi (assorted). Five of six are Willamette Valley. Public commercial entities.
  2. The buying cadence, two clubs at six bottles a quarter, Brooks quarterly 2014–2022. sample_data/README.md states this in the open and is already in the public repo.
  3. The date span, 1996-05-18 to 2026-09-17, everything but the Mouton starting 2014.
  4. Four assessment sourceName values that read as invented publications: Cascadia Wine Review, Northwest Cellar Notes, Pacific Vintage Quarterly, The Vintner's Ledger. Worth a glance to confirm they are.

  The inference available to a stranger is roughly: someone near Oregon has bought Willamette Pinot since the mid-2010s and owns one old Bordeaux. The drinking-diary concern I raised last turn does not survive contact with the data, I was reasoning from the schema, which declares five fields the transform
  never filled.

  Deployment, settled from docs, and settled against it

  A judge cannot open a deployed app. Not "probably not":

  - Dashboard introduction: the dashboard gives access to apps "within the organization".
  - Changelog v2025-10-27: "Users can now request access directly from the Dashboard when they try to open a studio or organization they don't have access to."
  - Same entry, Notable Fixes: "Fixed an issue where users could see studios within an organization that they didn't have access to."

  The third is decisive, cross-org visibility wasn't an unspecified edge case, it was a bug that got fixed. So app.visibility never meant what its warning implies: default and unlisted both mean org members only. A judge gets a request-access screen.

  A second account is not needed. A signed-out browser only reaches the login page, so it can't distinguish "not logged in" from "not permitted", confirming empirically would genuinely require a non-member account. Given the changelog is explicit and treats the alternative as a defect, I'd call it settled
  and not spend the setup.

  Fallback, which I'd treat as the plan rather than the consolation: video walkthrough of the staging run, screenshots from the same run, and in place of a link the two things a judge can open with no account, the public dataset endpoint and the repo. Then say plainly in the writeup why there's no link.
  That's a real finding about the platform's newest surface, it's on-topic for the first judging criterion, and it reads better than a dead URL. The only route to a genuinely public link is reviving web/ against the public dataset; I'd not do it, ten days out, against the Next version ADR 0010 already
  flags as one the model gets wrong.

  This makes the staging run the critical path for a reason it wasn't before: start a screen recorder before step 1. It is the only source of the one artifact the submission actually lacks, and re-running it later means setting the whole thing up twice.

  ---
  The sequence

  Run top to bottom. No step writes to production.

  1. Confirm app/src/sanity.ts:23 reads export const DATASET = 'production'.
  2. Start the screen recorder.
  3. cd C:\Users\kenal\Cellar\studio
  4. npx sanity dataset create staging --visibility private
  5. npx sanity dataset export production C:\Users\kenal\staging-seed.tar.gz, reads production, writes nothing.
  6. npx sanity dataset import C:\Users\kenal\staging-seed.tar.gz staging
  7. Delete the tarball.
  8. npx sanity documents query 'count(*)' --dataset staging → expect 1645. If not, stop; the copy is wrong.
  9. Edit app/src/sanity.ts → DATASET = 'staging'.
  10. cd ..\app; npm run dev

  10. Observation 1, baseline. Masthead shows dataset: staging. Record: HOLD 45 · DRINKING 166 · PAST_WINDOW 33 · UNASSESSED 4 · CONSUMED 294 · 248 in cellar · 542 total. Drink Soon 23 bottles / 12 wines. Missed Opportunities 11 bottles / 5 wines, including a row for 2023 Farm on Golden Hill Pinot Noir
  with 5 bottles. In Drink Soon, the row for 2024 Farm on Golden Hill Rosé: 5 bottles, through 2026.

  10. No badge → the App is on production; stop. Total ≠ 542 → import incomplete; stop.
  11. Stop the App server (Ctrl+C), the Studio needs port 3333.
  12. cd ..\studio; node scripts\seed-proposed-assessment.mts staging (Rosé, already configured)
  13. npx sanity documents create scripts\proposed-assessment.json --dataset staging, --dataset is required; without it this writes to production.
  14. In scripts\seed-proposed-assessment.mts, set CONSUMPTION_ID = 'con-farm-on-golden-hill-pinot-noir-2023-d' and MODEL_OUTPUT to drinkFromYear: 2028, drinkUntilYear: 2036, confidence: 'medium', with a note quoting "Red cherry, forest floor, fine tannin. Still tight."
  15. node scripts\seed-proposed-assessment.mts staging
  16. npx sanity documents create scripts\proposed-assessment.json --dataset staging
  17. Positive control, required, not optional. npx sanity documents query 'count(*[_type=="assessment" && reviewState=="proposed"])' --dataset staging → expect 2.

  17. Without this, observation 2 is satisfied by two documents that never arrived. CELLAR_QUERY runs with perspective: 'published'; an unchanged count proves nothing until you have shown the claims are present and published.
  18. cd ..\app; npm run dev

  18. Observation 2, both proposals present, nothing moved. Every number from observation 1, read individually. Both rows still present and unchanged, crucially, the Rosé's Drink Soon row still names the 2025-04-05 claim in its provenance line, and the Pinot's Missed Opportunities row still shows 5
  bottles.
  19. Stop the App server.
  20. $env:SANITY_STUDIO_DATASET = "staging", before starting the server; the substitution happens at build start.
  21. cd ..\studio; npm run dev → Review queue → Awaiting review shows 2. Accepted 161, Rejected 0.

  21. Empty queue → the variable didn't take and the Studio is on production. Stop.
  22. Open the 2023 Farm on Golden Hill Pinot Noir claim (window 2028–2036) → Reject → confirm.
  23. Review queue: Awaiting review 1, Accepted 161, Rejected 1. The document still exists, reviewState reads rejected and is greyed. Accept and Reject are gone from its action bar.
  24. Stop the Studio; cd ..\app; npm run dev

  24. Observation 3, after Reject. Every number identical to observation 1. The Pinot's Missed Opportunities row still present with 5 bottles. Nothing moved, and you now know 5 bottles and a whole row would have moved had you accepted.
  25. Stop the App; cd ..\studio; npm run dev
  26. Open the 2024 Farm on Golden Hill Rosé claim (window 2024–2024) → Accept → confirm.
  27. Review queue: Awaiting review 0, Accepted 162, Rejected 1.
  28. Stop the Studio; cd ..\app; npm run dev

  28. Observation 4, after Accept. DRINKING 166 → 161. PAST_WINDOW 33 → 38. Drink Soon 23/12 → 18/11. The Rosé's row gone from Drink Soon entirely. Record the non-movements too: HOLD 45, UNASSESSED 4, CONSUMED 294, 248 in cellar, and Missed Opportunities still 11 / 5, the new window closes 2024-12-31,
  before the trailing-twelve-month period opens.
  29. Stop the recorder.
  30. Revert app/src/sanity.ts to DATASET = 'production' and confirm the badge is gone.
  31. Revert CONSUMPTION_ID and MODEL_OUTPUT in seed-proposed-assessment.mts to the Rosé values, or leave them and note it in the commit.

  The two places a slip becomes a production write are steps 13 and 16 with --dataset omitted, and step 21 with the variable unset, and that last one is self-limiting, because a Studio on production shows an empty queue and there is nothing to click.

  To stage: docs/submission-readiness.md, docs/friction-logs/session9.md. Commit message in commit-message.txt.

✻ Cogitated for 7m 11s
```

##### Prompt 3: the anonymous-read probe (08:44 to 08:49 am)

```text
After the staging run, probe it. Two questions, not one:

1. Does useQuery work without a Dashboard-injected token when the dataset is
   public? That is the anonymous case, and it decides whether a static host
   gives a real public demo.

2. What does a signed-in Sanity user outside my organization see? That is the
   actual judge case. Your changelog evidence says org members only, so say
   whether anything short of a second account can confirm it, and do not
   spend the setup if not.

Same discipline as the Functions probe: predetermined expected result stated
before running, no architecture changes to make it pass. A hosted origin
would need a CORS entry, which is a project-config write I have not
authorized. Tell me before you need it.

If question 1 answers yes, a static host gives judges a real demo and the
project ID covers the Sanity team separately. If no, the fallback stands:
video, screenshots, the public dataset endpoint, and the project ID, with the
reason stated plainly in the writeup.
```

##### Prompt 3 output

```text
Probe specified and recorded before it runs.

  Question 1, prediction, from the installed source

  No. And the interesting part is which layer says no, because the two disagree.
  
  The transport layer would allow it. @sanity/sdk 3.4.0, clientStore-CD-USpIU.js:

  effectiveOptions.token === null || effectiveOptions.token === void 0
    ? (delete effectiveOptions.token, …)
    : delete effectiveOptions.withCredentials

  With no token the key is deleted, not sent empty. The underlying client issues a genuinely unauthenticated request, which a public dataset answers happily.

  The React layer never gets there. SanityApp unconditionally wraps its children in AuthBoundary, and AuthBoundary contains:

  isLoggedOut && !isInIframe() && !isStudio && !isDashboardEnvironment() &&
    (window.location.href = loginUrl)

  A statically hosted page is all four of those at once. Predicted behaviour: the fallback flashes, then the browser navigates to sanity.io/login, and no cellar number ever renders.

  So the predicted failure is a client-side redirect, not an API refusal. That's the distinction worth the probe, "it didn't work" is nearly worthless, "it didn't work and here is the line that refused" is a finding.

  The probe, three checks, after step 30

  Step 30 puts DATASET back to 'production', which is the public one and the only dataset the anonymous question applies to.

  ┌─────┬────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────┐
  │     │                                             Check                                              │                    Expected                    │
  ├─────┼────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ A   │ Browser console: fetch the production query endpoint, no token                                 │ {result: 1645}                                 │
  ├─────┼────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ B   │ Same, against staging                                                                          │ 401/403                                        │
  ├─────┼────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ C   │ Open http://localhost:3333 directly in a private window, not the sanity.io/@org?dev=… wrapper │ fallback flashes, redirect to login, no counts │
  └─────┴────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘

  A and B are a control pair, and B is why A means anything, A alone is satisfied by an API that never checks, and B shows the identical anonymous request being refused when the dataset is private. Session 8's rule, applied to a probe instead of a test.

  C is the question. The private window strips any session cookie or localStorage token; opening the origin directly removes the Dashboard parent that would otherwise inject one. Both conditions have to hold or C is measuring the logged-in case.

  Falsifier: if C renders 45 / 166 / 33 / 4 / 294, I'm wrong, the answer is yes, and a static host becomes the demo.

  CORS, not needed, and I'll say when it is

  The primary probe needs no project-config write. http://localhost:3333 is already the project's one registered origin and is exactly where C runs. A CORS entry becomes necessary only to repeat C on a real hosted origin, which is worth doing only if C comes back yes. I'll ask then, not now.

  What I've ruled out as cheating

  Three things would make it pass without answering it, and none is on the table: passing a hardcoded token into SanityConfig.auth (tests a credentialled app and ships a secret); wrapping the page in an iframe to trip !isInIframe() (exploits a condition rather than answering); swapping SanityApp for a bare
  @sanity/client call (answers "can a static page read this dataset", which I already did from a shell today, not "does the App SDK app work anonymously").

  Worth being explicit: if the answer is no, "build a plain static frontend" isn't a fix, it's the web/ Next.js path, a different project.

  Question 2, no, and I'm not spending it

  Nothing short of a second Sanity account confirms it. The test requires being authenticated and a non-member at the same time, which is what a second account is. A signed-out browser reaches the login page and so cannot tell "not logged in" from "not permitted". I searched the Applications API reference
  for a view-side access model; it exposes only deploy-side permissions (sanity.sdk.applications.deploy, scoped to the organization), who may install an app, not who may open one.

  The changelog evidence stands on its own as documentary, and I'm treating it as settled rather than re-litigating it.

  It's also moot in every branch but one. If the probe answers yes, the demo is a static host and the dashboard path is irrelevant. If it answers no and you take the fallback, nothing gets deployed. It matters only if the probe answers no and you deploy anyway to give the Sanity team an in-platform look , 
  then the submission carries a link whose behaviour for its audience is unverified, and the second account earns its setup.

  Recorded in docs/submission-readiness.md as §2c-probe and §2c-probe-2, with the prediction written down first. commit-message.txt updated. Staging list unchanged: docs/submission-readiness.md, docs/friction-logs/session9.md.

✻ Churned for 2m 25s
```

##### Prompt 4: is there a supported configuration at all? (08:51 to 08:55 am)

```text
Approved. Run it after step 30.

One addition. Your prediction is that AuthBoundary redirects before the
transport layer is reached, and that the transport layer would have allowed
the request. If that holds, answer one more question from the installed
source rather than by experiment: is there any supported configuration of
SanityApp or its auth options that satisfies AuthBoundary without a user
token, given a public dataset? Not a hardcoded token, not an iframe wrapper.
A documented or typed option.

If there is, that is the supported path to a static demo and worth testing.
If there is not, say so plainly: the App SDK has no anonymous-read mode, and
an App SDK app cannot be shown to anyone outside the organization. That is a
clean finding and it belongs in the writeup, since the platform's newest
surface has no path to a public demo.

Either way, record the answer in submission-readiness.md before the staging
run, so the fallback is decided rather than discovered on deadline.
```

##### Prompt 4 output

```text
No. The App SDK has no anonymous-read mode. Settled from the types, no experiment needed.

  Why

  AuthBoundary gates children on authentication, the prop is literally documented as "Protected content to render when authenticated". So reaching the app needs authState to leave LOGGED_OUT, and every typed route there is a route to a user token. The whole surface, enumerated rather than sampled:
  
  ┌──────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                  Option                  │                                                               Why it isn't the path                                                               │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ auth.token                               │ Hardcoded credential, excluded, and a static bundle publishes it                                                                                 │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ auth.providers                           │ Changes how a user logs in, not whether                                                                                                           │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ auth.oauth                               │ Still an interactive login producing a user token                                                                                                 │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ auth.clientFactory                       │ Can build an anonymous client, but never touches authState, the redirect fires anyway                                                            │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ auth.storageArea / callbackUrl / apiHost │ Mechanics of a flow that still needs a user                                                                                                       │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ LoginComponent and friends               │ Replaces the login screen with your own login screen. Never renders children                                                                      │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ verifyOrganization: false                │ Disables organization verification, not authentication. isLoggedOut untouched. Also carries "should never be disabled in production environments" │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ SanityApp's own props                    │ config, resources, children, fallback, inferMediaLibraryAndCanvas. Nothing auth-related                                                           │
  └──────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  The docs agree with the types: the authentication page says the SDK determines state from the environment, "that is, one of: a Sanity Dashboard iframe, Sanity Studio." Two environments, no third. A static host isn't something the SDK models.

  The near-miss, which I'm recording rather than recommending

  There is exactly one typed field that would suppress the logged-out transition without a token, and you'd have found it eventually, so it's on the record. SanityConfig.studio is real and documented, and StudioConfig.authenticated says: "Whether the Studio has already determined the user is authenticated.
  When true and the token source emits null, the SDK infers cookie-based auth is in use rather than transitioning to logged-out."

  Setting it would also flip isStudio, AuthBoundary computes isStudio = isStudioConfig(instance.config), so merely having config.studio present disables the redirect branch. On paper, config.studio = {authenticated: true} makes the app render.

  It still doesn't count, for three reasons all documented alongside the field itself:

  1. It asserts something false. SanityConfig.studio is "Studio configuration provided by a Sanity Studio workspace… typically set automatically by SanityApp when it detects an SDKStudioContext provider." On a static host there is no Studio and no user.
  2. It selects cookie auth, building the client with withCredentials: true, a credentialed cross-origin request needing a registered origin and a cookie the anonymous visitor doesn't have.
  3. Studio mode has a documented ceiling: "only project-level endpoints will work. Any calls made to global endpoints will fail." This app happens to make only project-scoped queries, so it would survive by accident, which is the kind of fit that breaks later.

  Claiming to be a Studio in order to read a public dataset is a workaround, not a supported configuration. Per CLAUDE.md that gets reported, not built on.

  The finding

  ▎ The Sanity App SDK has no anonymous-read mode. AuthBoundary renders children only when authenticated, every typed auth option resolves to a user token, and the SDK recognises exactly two environments, a Dashboard iframe and a Studio. A custom app therefore cannot be shown to anyone outside the
  ▎ organization: not by deploying it, because the Dashboard gates on organization membership, and not by hosting it statically, because the SDK redirects an anonymous visitor to a login page before a single query is issued. The dataset can be public and the app still cannot be. The platform's newest
  ▎ surface, and the one its own challenge brief names as a bonus, has no path to a public demo.

  This holds independently of probe C. Probe C tests whether the redirect fires as predicted; this answers whether anything in the API could have prevented it. Nothing could.

  So the fallback is decided, not discovered: video, screenshots, the public dataset endpoint, and the project ID. Probe C still runs after step 30, it turns a documented claim into an observed one, and the A/B control pair is what lets the writeup say which layer refused. But its outcome no longer changes
  the plan.

  Recorded as §2c-probe-1b in docs/submission-readiness.md, ahead of the staging run. commit-message.txt updated. Staging list unchanged: docs/submission-readiness.md, docs/friction-logs/session9.md.

✻ Crunched for 2m 5s
```

##### Prompt 5: write the sequence to a file (08:56 to 09:03 am)

```text
Write the staging sequence to docs/staging-run.md as a clean numbered
checklist I can follow top to bottom without reconstructing anything. Include
the observation tables inline at the point where each observation happens,
the two places a missing --dataset flag writes to production, the positive
control as a numbered step, and probe C at the end. Renumber properly; the
version in your last message repeated several numbers.

Nothing else this turn. I am about to run it.
```

##### Prompt 5 output

```text
docs/staging-run.md is written, 46 steps, numbered straight through with no repeats.

  Structure:

  - 1–3 prepare (confirm DATASET, start recorder, cd studio)
  - 4–8 create and seed staging, ending in the 1645 count check                                                                                                                                                                                         
  - 9–12 point the App at staging, observation 1 at step 11                                                                                                                                                                                                                                       
  - 13–18 write both stand-ins, with the two --dataset hazards called out inline at 14 and 17, and the positive control as step 18
  - 19–21 observation 2 at step 20
  - 22–27 Reject the Pinot claim
  - 28–30 observation 3 at step 29
  - 31–34 Accept the Rosé claim
  - 35–38 observation 4 at step 36, recorder off at 38
  - 39–40 reset both edited files
  - 41–46 probes A, B and C

  Each observation carries its table at the point it happens, with stop conditions attached where they apply. Steps 14 and 17 have the production-write warning in a blockquote directly above the command rather than in a preamble you'd have to remember.

  Two things I added that weren't in the message version: the exact CONSUMPTION_ID and MODEL_OUTPUT block to paste at step 15, so the second stand-in doesn't need reconstructing, and a recovery section at the end, dataset delete staging returns you to step 4, and the deterministic ids mean a repeated write
  collides rather than duplicating.

  Nothing else touched this turn.

✻ Worked for 1m 27s
```