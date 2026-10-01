# ADR 0013: Acceptance time is not recorded, and the resolver cannot ask for it

Date: 2026-10-01
Status: Accepted as a known gap. Not fixed.
Amends: ADR 0001, ADR 0002, ADR 0011

## Context

The project's opening claim is a design rule:

> Do not store only what is true now when your application may need to know
> what was true then.

ADR 0001 applies it to bottle state: acquisitions and consumptions are dated
events rather than a stored `status`. ADR 0002 applies it to drinking windows:
assessments are dated claims rather than a `drinkUntil` field.

ADR 0011 then introduced `reviewState`, with three values and two transitions,
and a rule that only accepted claims resolve.

**`reviewState` is stored current state with no history.** A claim either
counts or it does not, and nothing in the dataset records when that became
true. The transition is a `set` on a field. The resolver reads the field's
current value and has no way to ask what it was on any other date.

This is the exact shape the project forbids elsewhere. It survived twelve ADRs
because the field reads as workflow rather than as domain data.

## What breaks, and what does not

The application has one temporal axis: `assessedAt`, when a claim was made.
Answering "what did I believe on date T" needs a second: when the claim
started counting.

For the seeded data the two coincide. The import wrote all 161 assessments as
`accepted`, with `assessedAt` as their only date, so a claim counted from the
day it was made. Every date the published demo can be driven to therefore
gives the same answer to both questions, and the demo is not misleading.

The agent workflow is where they separate. A proposal carries
`assessedAt = consumedAt + 1 day`, which is frequently years in the past, and
acceptance happens today. On acceptance the resolver treats the claim as
having counted since that past date. An acceptance in 2026 can change what the
cellar says about 2018.

The Accept dialog warns about exactly this, so the behaviour is disclosed. The
resolver simply has no way to represent the alternative.

Note that the temporal spec already says, in its edge case table, that the
acceptance date is irrelevant and only `assessedAt` is used. That is correct
for the question "what does everything accepted now say about T". It is wrong
for "what did the cellar say on T", and the specification does not distinguish
the two.

## Decision

Record the gap. Do not fix it now.

The fix is small and known: write `acceptedAt` in the same patch as the
transition to `accepted`, backfill it to `assessedAt` for the 161 imported
claims, and have `resolvedWindow` filter on
`assessedAt <= T && acceptedAt <= T`.

One date control still answers both questions, because T then means "the state
of knowledge at T" rather than "what today's knowledge says about T". Full
bi-temporal modelling, with independent valid-time and transaction-time axes
and two controls, is not needed for the question this project asks.

## Consequences

- The published demo answers both opening questions correctly, by accident of
  how the seed data was imported rather than by design. That is worth stating
  plainly rather than leaving for a reader to find.
- Every oracle in `sample_data/` would survive the change unaltered, since
  backfilling `acceptedAt` to `assessedAt` leaves resolution identical for all
  161 seeded claims. The change is testable without regenerating anything.
- A rejected claim needs no date. It never counted, so there is no interval to
  record.
- A claim accepted and later rejected would need a second interval rather than
  a second field, which is where this stops being a small change. ADR 0011
  does not define that transition, so it does not arise today.
- This is the strongest entry for the "what a commercial version would have to
  solve" list, because it is architectural rather than a scope cut.

## How it was found

By a reader of the published post, who noticed that its two opening questions
ask about different axes and that the application has only one of them.

Found after submission, from the post's own argument, applied to the part of
the system the argument had not been pointed at.