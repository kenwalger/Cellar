<img src="app/icon.svg" alt="" width="48" align="left" />

# The Cellar

A wine collection you can read at any date.

[![License: MIT](https://img.shields.io/badge/License-MIT-7a1f3d.svg)](LICENSE)
[![Built with Sanity](https://img.shields.io/badge/built%20with-Sanity-7a1f3d.svg)](https://www.sanity.io/)
[![Live demo](https://img.shields.io/badge/demo-live-7a1f3d.svg)](https://kenwalger.github.io/Cellar/)

**[Open the demo](https://kenwalger.github.io/Cellar/)** (no account needed) ·
**[Watch the walkthrough](https://youtu.be/bb-9b_9k7WA)** ·
**[Read the write-up](TODO-dev-to-post-url)**

---

![The Cellar at three dates: four bottles in 1999, 248 today, and 248 in 2035 of which 182 are past their drinking window](TODO-hero-image.png)

Most cellar applications answer one question: what do I have right now? This
one answers a harder one. What did the cellar look like on 1 June 1999? What
did I think that bottle's drinking window was in 2018, before a later tasting
changed my mind? Which bottles were at peak last year while I was not paying
attention, and are past saving now?

## How it works

Nothing is stored as current state.

- **Acquisitions** and **consumptions** are documents with dates, not fields
  on a bottle. A bottle is consumed as of date T if a consumption event exists
  on or before T.
- **Assessments** are dated, attributed claims about when a wine should be
  drunk. Nothing overwrites a window. The current window is resolved from the
  claims that existed at T, by explicit rules: a personal tasting note
  outranks the producer's, which outranks a critic's, and within a tier the
  most recent claim wins.

Move the date control backward and acquisitions disappear, consumptions
reverse, and drinking windows change as the controlling claim changes. Move it
forward and unopened bottles age through their windows.

> Do not store only what is true now when your application may need to know
> what was true then.

The word "only" is load-bearing. Most systems should store current state. The
architectural decision is recognising when historical truth is itself a
requirement.

## Three surfaces

| Surface | Job |
| --- | --- |
| **Sanity Studio** | Authors and governs the ledger. Six document types, a review queue, custom document actions, and an Agent Action that proposes a drinking window from a tasting note |
| **A Sanity App** | Interprets it, inside Sanity, on the App SDK. Cellar health, Drink Soon, Missed Opportunities, and a date control spanning 1996 to 2042 |
| **A public page** | The same views without an account, reading the public dataset with a plain client. Read-only by construction: there is no token in the bundle |

The temporal logic lives in `packages/cellar-core`, a pure TypeScript package
that knows nothing about React, Sanity, the network, or the system clock.
`asOf` and `now` are always parameters, which is what makes it checkable
against an oracle.

## Running it

From the repository root:

```text
npm install
npm run build:core
```

The Sanity App, which opens through the Sanity Dashboard:

```text
npm run dev --workspace cellar-app
```

The Studio:

```text
npm run dev --workspace studio
```

The public build, which needs no Sanity account:

```text
npm run build:public --workspace cellar-app
```

Tests:

```text
npm test
```

407 in `@cellar/core`, 124 in the app, 35 in the Studio. 353 of the core tests
run against three independently generated oracles in `sample_data/`.

## Layout

```text
packages/cellar-core/   temporal resolution, pure TypeScript, no Sanity
studio/                 schemas, structure, document actions, the Agent Action
app/                    the Sanity App and the public build, sharing every view
sample_data/            the ledger, the oracles, and the scripts that made them
docs/                   specifications, decision records, friction logs
```

## Documentation

The specifications were written before any code existed, and several turned
out to be wrong in ways only implementation revealed. Those corrections are
recorded rather than quietly fixed.

| Path | What |
| --- | --- |
| [`docs/content-model.md`](docs/content-model.md) | Document types, fields, references, validation rules, invariants, and the changes made during implementation |
| [`docs/temporal-resolution.md`](docs/temporal-resolution.md) | The asOf predicates, window resolution, the state machine, and the edge cases |
| [`docs/seed-data-plan.md`](docs/seed-data-plan.md) | Ledger design and the demo moments the data has to guarantee |
| [`docs/build-plan.md`](docs/build-plan.md) | Stage ladder, gates, and cut list |
| [`docs/ADRs/`](docs/ADRs/) | Twelve decision records, each with the option that was rejected |
| [`docs/friction-logs/`](docs/friction-logs/README.md) | Fifteen sessions of build notes, with prompts and outputs verbatim |

The friction logs have [their own index](docs/friction-logs/README.md). If you
only read one session, read [session 3](docs/friction-logs/session-3.md),
where ten conflicts came back before a line of code was written.

## About the data

The cellar is loosely based on a real one. The producers, appellations, and
club memberships are real, and some of the history is too, including the 1993
Mouton bought in 1996 and opened twice in the nineties.

Everything evaluative is invented. Drinking windows, scores, critic notes, and
most tasting notes exist for the demo, and critic assessments are attributed
to publications that do not exist. Nothing here should be read as a factual
claim about any wine, and nothing attributed to a named producer reflects
anything they have actually said.

## Built for

The [DEV Challenge sponsored by Sanity](https://dev.to/challenges/sanity-2026-09-16),
Path Two, September 2026. Sanity project `aos9nze5`, dataset `production`,
public.

## License

MIT. See [LICENSE](LICENSE).