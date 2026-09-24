# Staging run

Date written: 2026-09-24

Rehearses the Stage 4a review workflow against a copy of the cellar. Two
stand-in claims are written, one is rejected and one accepted, and the counts
are read at four points. Ends with the anonymous-read probe.

**No step writes to production.** Step 6 reads it. Steps 15 and 18 would write
to it if a flag were omitted, and both are marked.

Baseline numbers are valid at today's date: no `assessedAt`, `consumedAt`,
`acquiredAt`, `drinkFrom` or `drinkUntil` in the seed data falls between
2026-09-18 and 2026-09-29, so nothing drifts between the oracle date and now.

Run the App and the Studio **one at a time**. Both default to port 3333 and
only `http://localhost:3333` is a registered CORS origin, so the second server
to start would take 3334 and be refused at the API layer.

---

## Prepare

**1.** Confirm `app/src/sanity.ts` line 23 reads:

```ts
export const DATASET = 'production'
```

**2.** Start the screen recorder. This run is the only source of the demo
footage, and setting it up again later costs the whole sequence.

**3.** Move to the studio package. The repository root has no `sanity.cli.ts`,
so CLI commands have no project there.

```powershell
cd C:\Users\kenal\Cellar\studio
```

## Create and seed staging

**4.** Create the dataset, private.

```powershell
npx sanity dataset create staging --visibility private
```

**5.** Export production. **Reads production, writes nothing to it.** Outside
the repository, because the tarball is a complete copy of the cellar and the
repository root is not gitignored for it.

```powershell
npx sanity dataset export production C:\Users\kenal\staging-seed.tar.gz
```

**6.** Import into staging.

```powershell
npx sanity dataset import C:\Users\kenal\staging-seed.tar.gz staging
```

**7.** Delete the tarball.

```powershell
Remove-Item C:\Users\kenal\staging-seed.tar.gz
```

**8.** Prove the CLI can see staging, and that the copy is complete.

```powershell
npx sanity documents query 'count(*)' --dataset staging
```

Expect **1645**. If not, stop — the copy is wrong and nothing after it means
anything.

## Point the App at staging

**9.** Edit `app/src/sanity.ts` line 23 to:

```ts
export const DATASET = 'staging'
```

**10.** Start the App.

```powershell
cd ..\app
npm run dev
```

**11. OBSERVATION 1 — baseline.** Record every row.

| | Expected |
| --- | --- |
| Masthead | `dataset: staging` |
| Cellar Health | HOLD **45** · DRINKING **166** · PAST_WINDOW **33** · UNASSESSED **4** · CONSUMED **294** |
| | **248** in cellar · **542** total |
| Drink Soon | **23** bottles / **12** wines |
| Missed Opportunities | **11** bottles / **5** wines |
| *2024 Farm on Golden Hill Rose* in Drink Soon | present, 5 bottles, through 2026, provenance naming the personal claim of **2025-04-05** |
| *2023 Farm on Golden Hill Pinot Noir* in Missed Opportunities | present, **5** bottles |

Stop conditions:

- **No badge** → the App is on production. Step 9 did not take.
- **Total ≠ 542** → the import is incomplete.
- **A count differs with the total at 542** → the `asOf` control is not at
  today, or the copy is not a copy.

**12.** Stop the App server (`Ctrl+C`). The Studio needs port 3333.

## Write both stand-in claims

**13.** Generate the first stand-in — the Rosé, already configured in the
script.

```powershell
cd ..\studio
node scripts\seed-proposed-assessment.mts staging
```

**14.** Write it to staging.

> **`--dataset staging` is required.** `studio/sanity.cli.ts` pins
> `api.dataset: 'production'`. Without the flag this command **writes to
> production**.

```powershell
npx sanity documents create scripts\proposed-assessment.json --dataset staging
```

**15.** Edit `scripts\seed-proposed-assessment.mts` for the second stand-in.
Replace the two constants with:

```ts
const CONSUMPTION_ID = 'con-farm-on-golden-hill-pinot-noir-2023-d'

const MODEL_OUTPUT = {
  supportsWindow: true,
  drinkFromYear: 2028,
  drinkUntilYear: 2036,
  confidence: 'medium',
  notes:
    'Extracted from the tasting note "Red cherry, forest floor, fine tannin. Still tight." ' +
    'recorded 10 July 2026. A 2023 Pinot still tight two summers after the vintage has not ' +
    'opened yet; the window starts in 2028.',
} as const
```

**16.** Generate it. This overwrites `proposed-assessment.json`, which is why
step 14 had to happen first.

```powershell
node scripts\seed-proposed-assessment.mts staging
```

**17.** Write it to staging.

> **`--dataset staging` is required here too**, for the same reason as step 14.

```powershell
npx sanity documents create scripts\proposed-assessment.json --dataset staging
```

**18. POSITIVE CONTROL — required, not optional.**

```powershell
npx sanity documents query 'count(*[_type=="assessment" && reviewState=="proposed"])' --dataset staging
```

Expect **2**.

Without this, observation 2 is satisfied by two documents that never arrived.
`CELLAR_QUERY` runs with `perspective: 'published'`; an unchanged count proves
nothing until the claims are shown to be present and published. If this returns
0 or 1, stop — the next observation would be measuring an absence.

## Observation 2

**19.** Start the App.

```powershell
cd ..\app
npm run dev
```

**20. OBSERVATION 2 — both claims present, nothing moved.** Read every number
individually rather than glancing.

| | Expected | Same as |
| --- | --- | --- |
| Cellar Health | HOLD **45** · DRINKING **166** · PAST_WINDOW **33** · UNASSESSED **4** · CONSUMED **294** | obs 1 |
| | **248** in cellar · **542** total | obs 1 |
| Drink Soon | **23** bottles / **12** wines | obs 1 |
| Missed Opportunities | **11** bottles / **5** wines | obs 1 |
| *2024 Farm on Golden Hill Rose* in Drink Soon | still present, still through 2026, provenance **still naming 2025-04-05** | obs 1 |
| *2023 Farm on Golden Hill Pinot Noir* in Missed Opportunities | still present, still **5** bottles | obs 1 |

The two provenance lines are the point. They are what separates "the claims
arrived and were discarded" from "the claims are not there".

**21.** Stop the App server.

## Reject the first claim

**22.** Set the dataset variable **before** starting the server. The
substitution happens at build start; exporting it afterwards does nothing and
says nothing.

```powershell
$env:SANITY_STUDIO_DATASET = "staging"
```

**23.** Start the Studio.

```powershell
cd ..\studio
npm run dev
```

**24.** Open **Review queue**.

| | Expected |
| --- | --- |
| Awaiting review | **2** |
| Accepted | **161** |
| Rejected | **0** |

If Awaiting review is empty, the variable did not take and the Studio is on
production. Stop.

**25.** Open the **2023 Farm on Golden Hill Pinot Noir** claim — window
2028–2036 — and click **Reject**, then confirm.

**26.** Check the queue and the document.

| | Expected |
| --- | --- |
| Awaiting review | **1** |
| Accepted | **161** |
| Rejected | **1** |
| The rejected document | still exists; `reviewState` reads rejected and is greyed; Accept and Reject are gone from its action bar |

**27.** Stop the Studio.

## Observation 3

**28.** Start the App.

```powershell
cd ..\app
npm run dev
```

**29. OBSERVATION 3 — after Reject.**

| | Expected | Same as |
| --- | --- | --- |
| Cellar Health | HOLD **45** · DRINKING **166** · PAST_WINDOW **33** · UNASSESSED **4** · CONSUMED **294** | obs 1 |
| | **248** in cellar · **542** total | obs 1 |
| Drink Soon | **23** bottles / **12** wines | obs 1 |
| Missed Opportunities | **11** bottles / **5** wines | obs 1 |
| *2023 Farm on Golden Hill Pinot Noir* in Missed Opportunities | still present, still **5** bottles | obs 1 |

What makes this meaningful: had that claim been accepted instead, 5 bottles
would have moved PAST_WINDOW → HOLD, Missed Opportunities would have gone to
6 bottles / 4 wines, and this wine's row would have vanished from it entirely.
Nothing moved, and it is not because there was nothing to move.

**30.** Stop the App server.

## Accept the second claim

**31.** Start the Studio. The variable is still set in this shell; if you
opened a new one, repeat step 22 first.

```powershell
cd ..\studio
npm run dev
```

**32.** Open the **2024 Farm on Golden Hill Rose** claim — window 2024–2024 —
and click **Accept**, then confirm.

**33.** Check the queue.

| | Expected |
| --- | --- |
| Awaiting review | **0** |
| Accepted | **162** |
| Rejected | **1** |

**34.** Stop the Studio.

## Observation 4

**35.** Start the App.

```powershell
cd ..\app
npm run dev
```

**36. OBSERVATION 4 — after Accept.** Record the movements and the
non-movements; the non-movements are half the claim.

| | Baseline | Now |
| --- | ---: | ---: |
| DRINKING | 166 | **161** |
| PAST_WINDOW | 33 | **38** |
| Drink Soon | 23 / 12 | **18 / 11** |
| *2024 Farm on Golden Hill Rose* in Drink Soon | present, 5 bottles | **gone** |
| HOLD | 45 | **45** |
| UNASSESSED | 4 | **4** |
| CONSUMED | 294 | **294** |
| in cellar | 248 | **248** |
| Missed Opportunities | 11 / 5 | **11 / 5** |

Missed Opportunities deliberately does not move: the accepted window closes
2024-12-31, before the trailing twelve-month period opens.

**37.** Stop the App server.

**38.** Stop the screen recorder.

## Reset

**39.** Revert `app/src/sanity.ts` line 23 to:

```ts
export const DATASET = 'production'
```

**40.** Revert the two constants in `scripts\seed-proposed-assessment.mts` to
the Rosé values, or leave them changed and say so in the commit.

## Probe — anonymous read

Runs against **production**, the public dataset, which is the only one the
anonymous question applies to. Needs no CORS write: `http://localhost:3333` is
already the project's one registered origin and is where it runs.

Predicted answer, recorded in `docs/submission-readiness.md` §2c-probe before
this run: **no**, and the refusal comes from the React layer rather than the
API. `SanityApp` wraps its children in `AuthBoundary`, which contains
`isLoggedOut && !isInIframe() && !isStudio && !isDashboardEnvironment() &&
(window.location.href = loginUrl)`. A static host is all four at once.

**41.** Start the App, now on production.

```powershell
cd ..\app
npm run dev
```

**42. PROBE A** — anonymous read of a public dataset. In the browser console on
`http://localhost:3333`:

```js
const r = await fetch('https://aos9nze5.api.sanity.io/v2024-01-01/data/query/production?query=count(*)')
console.log(r.status, await r.text())
```

Expect **200** and `{"result":1645,…}`.

**43. PROBE B** — the control that makes A mean something. Same request against
the private dataset:

```js
const r = await fetch('https://aos9nze5.api.sanity.io/v2024-01-01/data/query/staging?query=count(*)')
console.log(r.status, await r.text())
```

Expect **401 or 403**. If this also returns 200, A proved nothing — the API is
not checking, rather than `public` doing work.

**44. PROBE C** — the question. Open `http://localhost:3333` **directly in a
private window**. Not through the `https://www.sanity.io/@opyntsvcl?dev=…`
wrapper.

Both conditions matter: the private window strips any Sanity session cookie or
`localStorage` token, and opening the origin directly removes the Dashboard
parent that would otherwise inject one. Miss either and this measures the
logged-in case.

| Expected | |
| --- | --- |
| The `fallback` renders briefly | |
| The browser navigates to `sanity.io/login` | |
| No cellar counts ever appear | |

**Falsifier:** if the cellar renders with 45 / 166 / 33 / 4 / 294, the
prediction is wrong, the App SDK reads anonymously, and a static host becomes a
real public demo.

**45.** Record all three results in `docs/friction-logs/session9.md`, including
whether any network request to `aos9nze5.api.sanity.io` was issued before the
redirect. That detail is what distinguishes "the SDK refused" from "the API
refused", and it is the part worth writing up.

**46.** Stop the App server.

---

## If anything went wrong

Nothing here is destructive to production. To start over, delete the staging
dataset and return to step 4:

```powershell
cd C:\Users\kenal\Cellar\studio
npx sanity dataset delete staging
```

The two stand-in claims use deterministic ids, `assess-agent-<consumptionId>`,
so a repeated write collides rather than duplicating, and every agent-written
claim can be found with one id pattern.
