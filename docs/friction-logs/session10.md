### 25 September 2026, Session 10

#### Stage 4a verification: the staging run, recorded

IDE / tool: WebStorm, Windows / PowerShell, two dev servers, Camtasia
recording throughout. No Claude Code prompts this session; the model was
consulted only when a step failed.
What I was trying to do: prove in a real dataset that a proposed claim moves
nothing and an accepted one moves exactly what was predicted, and capture the
footage while doing it.
Outcome: all four observations confirmed. Both workflow transitions
demonstrated. The anonymous-read probe answered. One false failure caused by
my own mistake.
Elapsed: 08:15 to 09:10 am, about 55 minutes, recorded end to end.

The sequence was 46 steps against staging, written to `docs/staging-run.md`
the day before precisely so it could be followed without reconstruction.

#### What the run proved

| | before | proposals present | after Reject | after Accept |
| --- | ---: | ---: | ---: | ---: |
| DRINKING | 166 | 166 | 166 | 161 |
| PAST_WINDOW | 33 | 33 | 33 | 38 |
| Drink Soon | 23 / 12 | 23 / 12 | 23 / 12 | 18 / 11 |
| Missed Opportunities | 11 / 5 | 11 / 5 | 11 / 5 | 11 / 5 |

Two claims were written into staging. Neither moved a single count while
proposed. One was rejected and still moved nothing, though accepting it would
have moved five bottles from PAST_WINDOW to HOLD and emptied a whole wine out
of Missed Opportunities. The other was accepted and moved exactly the five
bottles predicted, with the wine's Drink Soon row disappearing entirely.

The rejected document is still in the dataset, reading `rejected`. Nothing
was destroyed, which is the point of ADR 0011.

#### Three failures, all with the same shape

The striking thing about this session is that everything that went wrong went
wrong by returning nothing rather than by reporting a problem.

**1. The integrity check compared against the wrong number.** Step 8 expected
`count(*)` to return 1645, the number the import reported. Staging returned
1657. Production also returned 1657, so the copy was exact and the
      expectation was wrong: `count(*)` includes twelve `system.group` documents
      that Sanity creates in every dataset and that were never in the NDJSON.
      Nothing in the import output hints at this. The check that actually means
      something counts your own types, or compares the two datasets against each
      other.

**2. The positive control failed because PowerShell ate its quotes.** The
query was passed as `'count(*[_type=="assessment" && ...])'`, and the shell
stripped the inner double quotes, so Sanity received `_type==assessment`,
comparing against an undefined identifier. The result was no results.

That is the worst possible failure for this particular check. The positive
control exists to prove the documents are present before "nothing moved" can
mean anything, and a quoting error produces output indistinguishable from the
documents being absent. **The check designed to prove presence can fail in a
way that looks exactly like absence.** Fixed by inverting the quotes, and the
answer was 2.

**3. A private dataset answers anonymous queries with zero rather than
refusing them.** The probe predicted 401 or 403 for an unauthenticated read
of `staging`. It returned 200 with `result: 0`. An app pointed at a dataset
it cannot read would render an empty cellar, not an error: zero bottles, no
warning, every number internally consistent.

Three times in one morning, something that should have said "you cannot see
this" said "there is nothing here" instead.

#### My own false failure

At step 36, after accepting the Rosé claim, none of the counts moved. Two
queries ruled out the interesting explanations: both documents existed,
published, no drafts, and the accepted one read `accepted` correctly.

The cause was mine. I had already reverted `app/src/sanity.ts` to
`production` before the final observation, so the App was reading a dataset
with no proposals in it.

Worth recording because of what it implies about the earlier observations.
Production and staging have identical baselines, so an App silently on
production would have produced correct-looking numbers at observation 1,
observation 2, and observation 3. The only observation where the two datasets
disagree is the last one. If the mistake had happened earlier, every
observation would have passed while measuring the wrong cellar, and nothing
in the readings would have shown it.

The masthead badge is what settled it in about ten seconds. Session 8 added
that badge after the environment-variable asymmetry, on the reasoning that
the real question is not how to point the App at staging but whether you are
sure which dataset you just wrote to. It earned its place within a day.

#### The anonymous-read probe

Run after the staging sequence, against `production`, which has been
world-readable since it was created.

| Check | Expected | Actual |
| --- | --- | --- |
| A: unauthenticated query against the public dataset | 1645 | 1645, HTTP 200 |
| B: same against the private dataset | 401 or 403 | HTTP 200, `result: 0` |
| C: open the App directly in a private window | redirect to login, no counts | redirect to login, no counts |

A and B are a control pair: A alone would be satisfied by an API that never
checks anything. B shows the identical anonymous request returning nothing
when the dataset is private, though by a different mechanism than predicted.

One detail worth keeping: check A returned **1645**, not 1657. The twelve
system documents are invisible to an anonymous request. The count a stranger
sees matches the import exactly; the count the owner sees does not.

C confirms the finding from session 9, now observed rather than inferred. The
App SDK's `AuthBoundary` redirects an anonymous visitor to a login page
before a single query is issued. The transport layer would have allowed the
read. The React layer never reaches it.

#### Small UI gap, worth more than it looks

The Studio review queue lists Awaiting review, Accepted and Rejected as
filtered lists with no counts beside them. During the false failure at step
36, a queue reading "Awaiting review 0, Accepted 162" would have told me
immediately that the transition had landed and the problem was elsewhere.
Instead I ran two GROQ queries to learn the same thing.

Added to Stage 5, with that reason attached rather than as a cosmetic item.

#### Footage

The whole run is recorded, including the three failures and the recovery.
That is the Stage 4 segment of the demo video, and it is the one part that
cannot be re-shot without setting the entire sequence up again.

Deliberately not narrated. Following a 46 step checklist across two dev
servers while talking produces worse footage and worse narration than doing
them separately.