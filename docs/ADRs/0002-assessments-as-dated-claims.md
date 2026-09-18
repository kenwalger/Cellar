# ADR 0002: Drinking windows are dated, attributed claims

Date: 2026-08-31
Status: Accepted

## Context

`drinkFrom` and `drinkUntil` look like properties of a wine. They are not.
They are opinions. The producer states one window at release, a critic states
another later, and the owner forms a third after opening a bottle. A single
pair of fields forces each new opinion to destroy the previous one.

## Decision

Introduce an `assessment` document: a reference to a wine, a source type, a
source name, an `assessedAt` date, a window, a confidence, and notes. The
current window is resolved by query. Nothing is ever overwritten.

An assessment may carry `derivedFrom`, a reference to the consumption whose
tasting note produced it.

## Consequences

- The UI can always show where a window came from and how many claims exist
  behind it.
- Verdicts can be computed against the window that was in force at the moment
  of drinking rather than against today's window.
- Editors must add assessments rather than edit them. This is convention, not
  schema enforcement, and needs a note in the Studio UI.
- This is the model's transferable idea, and the article's central argument
  rests on it.
