# Friction logs: a reading guide

Fifteen sessions, 18 to 28 September 2026, building The Cellar on Sanity with
Claude Code. Each file carries the prompts and outputs verbatim, plus what was
found and what it cost.

This is the index. `friction-log.md` holds the rules of capture, the entry
template, the standing questions, and sessions 0 through 2. Sessions 3 onward
are separate files.

## If you read one thing

**[session-3.md](session-3.md)**, the App SDK gate. Three pieces of vendor
guidance contradicted the shipped tooling in a single session, and the model
nearly filed a bug that turned out to be its own misreading, then logged the
near-miss instead.

**If you read two,** add **[session-9.md](session-9.md)**: four prompts to
establish that an App SDK app cannot be shown to anyone outside your
organization, by deployment or by static hosting, with the exact line that
refuses.

## The through-line

Almost everything that went wrong in this project went wrong by **returning
nothing rather than reporting a problem.**

| Where | What |
| --- | --- |
| [session-10](session-10.md) | A private dataset answers an anonymous query with HTTP 200 and zero rows rather than refusing it. An app pointed at a dataset it cannot read renders an empty cellar, not an error |
| [session-10](session-10.md) | PowerShell stripped the quotes from a GROQ query, so the positive control failed in a way indistinguishable from the documents being absent |
| [session-10](session-10.md) | `count(*)` includes system documents the import never created, so the obvious integrity check compares against the wrong number |
| [session-11](session-11.md) | A public dataset is exempt from authentication, not from CORS. Every anonymous read in this project went through curl, which sends no `Origin` header, so no CORS check ever applied |
| [session-8](session-8.md) | `SANITY_STUDIO_DATASET` folds into the Studio bundle and does nothing in the App bundle. No warning either way |
| [session-12](session-12.md) | A `dist` ignore rule does not match `dist-public`, so the build output was committed |
| [session-14](session-14.md) | `npm install --package-lock-only` re-resolved the tree and downgraded the CLI two major versions, rewriting two manifests without saying so |

## The answer was in the installed code

Four questions the documentation answered wrongly, or not at all, and the
shipped types or source settled in minutes. Two of them deleted planned
production writes.

| Where | Question | Where the answer was |
| --- | --- | --- |
| [session-5](session-5.md) | Do Functions bundle a workspace-linked package on npm plus TypeScript? | The deployed bundle. It decides per dependency, not per project |
| [session-9](session-9.md) | Is there a supported way to render an App SDK app without a user token? | The typed auth surface, enumerated. No |
| [session-13](session-13.md) | Does the Prompt action require `schemaId`? | `PromptRequestBase` declares four members and that is not one. The troubleshooting page is backwards |
| [session-14](session-14.md) | Can a preview `select` follow references more than one hop? | The path observer recurses with no depth limit. Undocumented and always worked |

The last one cuts the other way. Session 6 assumed undocumented meant
unavailable and shipped a bottle list where 98 wines collapsed into 70 labels,
with "2023 Pinot Noir" naming four different producers. **The same caution
that stopped the model filing a bug that did not exist also stopped it using
a feature that did.**

## Stale vendor guidance

| Where | What |
| --- | --- |
| [session-3](session-3.md) | Sanity's bundled agent rule supplies a CLI command with a flag the installed CLI rejects |
| [session-3](session-3.md) | The App SDK quickstart names a template the CLI reference does not list |
| [session-3](session-3.md) | That template installs the SDK a major version behind the docs it points you at |
| [session-13](session-13.md) | Two live doc pages contradict each other on `schemaId`, and the authoritative one is wrong |
| [session-13](session-13.md) | The page that settles whether a Studio session authorises Agent Actions is an AI Assist guide that demonstrates it by example and never says so |
| [session-14](session-14.md) | The only supported route to counts in Structure Builder goes through a context property the types mark `@alpha` and call a V2 compatibility shim. The guide teaching it does not mention that |

## Tests that certify nothing

Three distinct kinds, found a session apart, and the third is the worst.

**A test that cannot fail.** [session-8](session-8.md). An invariance test
passed while measuring nothing, because its fixture would have lost on
recency whether proposed or accepted. What caught it was the companion
assertion that accepting must change at least one state. An audit found two
more.

**A check that always fails.** [session-11](session-11.md). A CI grep for
leaked credentials fired on every clean build, matching a legitimate export
name. A check that always fails gets waved through and certifies as little as
one that never can, and it is worse, because a false positive looks diligent.

**A correct test of a wrong contract.** [session-13](session-13.md). The date
input discarded a year mid-entry, and the existing test asserted exactly that
behaviour and passed. An assertion about clamping reads as diligence.

Related: [session-4](session-4.md). A date-arithmetic bug that **all five
verification dates passed under**. The application worked, the screenshots
were right, every date planned for the demo was fine. A property test across
17,167 slider positions found it. Demo-driven verification proves the paths
you already walk.

## Specifications reaching forward

A normalization rule written on day one, for reasons that had nothing to do
with any interface, turned every drinking window into whole years.

- [session-6](session-6.md): weeks later, that made a horizon control useless,
  because the count could only change once a year
- [session-7](session-7.md): a stage after that, it made the obvious period
  for Missed Opportunities structurally empty, all year, every year

No document connects those three facts. Fifteen minutes of measuring the data
found each of them.

The reverse case is in [session-11](session-11.md): a polish list drafted from
the build plan had three items already done. **A plan describes work that was
scheduled, not work that is left.**

## Model behaviour worth recording

| Where | What |
| --- | --- |
| [session-3](session-3.md) | Nearly reported a platform bug that was its own incomplete reading of an interface chain. Logged the near-miss instead |
| [session-9](session-9.md) | Found a typed field that would have made a static page render, and declined to recommend it on three documented grounds |
| [session-5](session-5.md) | Refused a test design of mine that would have written twice to production, with a better reason than I had |
| [session-8](session-8.md) | Broke an explicit rule about git, twice, and disclosed it unprompted both times |
| [session-13](session-13.md) | Abstained on a third of real tasting notes rather than guessing a drinking window |
| [session-8](session-8.md), [session-14](session-14.md) | Used mutation testing twice, unprompted, to prove tests fail when the code they cover is removed |

## By session

| # | Date | What |
| --- | --- | --- |
| [0](friction-log.md) | 18 Sep | Signup, scaffold, MCP. Onboarding assumes a separate frontend at three separate points |
| [1](friction-log.md) | 21 Sep | Stage 1. Ten conflicts before any code; three spec errors; 1,645 documents imported |
| [2](friction-log.md) | 22 Sep | Stage 2. The temporal module, 353 oracle checks passing first run |
| [3](session-3.md) | 22 Sep | The App SDK gate. Stale guidance, three times, and a near-miss |
| [4](session-4.md) | 22 Sep | The asOf control. A 100x memo bug found by measurement, and a date bug no demo date caught |
| [5](session-5.md) | 22 Sep | The Functions bundling probe. Outcome A, first attempt |
| [6](session-6.md) | 23 Sep | Drink Soon. Year quantization kills a horizon control |
| [7](session-7.md) | 23 Sep | Missed Opportunities. The calendar year is structurally empty |
| [8](session-8.md) | 23 Sep | The review workflow. The vacuous test problem, and the env-var asymmetry |
| [9](session-9.md) | 24 Sep | No anonymous-read mode. Submission readiness |
| [10](session-10.md) | 25 Sep | The staging run, recorded. Three failures, all returning nothing |
| [11](session-11.md) | 25 Sep | Deploy, and the CORS finding that invalidated three sessions of verification |
| [12](session-12.md) | 25 Sep | The Pages workflow, and an ignore rule that did not match |
| [13](session-13.md) | 28 Sep | The date input, the style guide, and Stage 4b |
| [14](session-14.md) | 28 Sep | Studio polish, and 45 minutes lost to one dependency line |