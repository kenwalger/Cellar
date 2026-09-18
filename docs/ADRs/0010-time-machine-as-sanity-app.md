# ADR 0010: The temporal view is a Sanity App, not a separate frontend

Date: 2026-09-18
Status: Accepted
Supersedes: ADR 0007

## Context

ADR 0007 split the project across two surfaces on the grounds that Studio has
no native global date control, so the asOf experience had to live in a
separate frontend. That reasoning was sound for Studio.

The published brief names the App SDK as a bonus, described as building a
custom app on top of your content, with real-time data and your own interface,
instead of another read-only frontend. That is precisely the thing ADR 0007
concluded was impossible, offered as a first-class surface and rewarded
explicitly.

A separate Next.js frontend would now be the least differentiated choice
available, since it is what most of the field will submit.

## Decision

Build the temporal view as a Sanity App using the App SDK: cellar health,
Drink Soon, the asOf control, and Missed Opportunities, running inside Sanity
with its own interface rather than beside it.

This is timeboxed. If the App SDK is not rendering real data by end of day 4,
fall back to the Next.js frontend described in ADR 0007 and treat the attempt
as friction log material rather than as lost time.

## Consequences

- The split described in ADR 0007 collapses. Authoring, governance, and the
  temporal view all live in one place, which is a better demo and a simpler
  story.
- The temporal resolution module must be framework-neutral and importable by
  the app and by Functions. This was already required and is now load-bearing.
- The App SDK is a newer surface with thinner documentation than Studio. That
  is a build risk and simultaneously the most valuable friction log material
  the project will produce, since few entrants will have pushed on it.
- Screenshots and the demo video are all inside Sanity, which reads better
  against a criterion about how deep you got into the platform.
- The fallback must stay genuinely available. Do not let App SDK work leak
  into the resolution module in ways that make a Next.js fallback expensive.
- The fallback is no longer free. The scaffold installed Next 16.3.5, and the
  generated `web/AGENTS.md` warns that this version's APIs, conventions, and
  file structure may differ from model training data, directing agents to the
  bundled guides in `node_modules/next/dist/docs/` before writing code. When
  this ADR was written the fallback was costed as cheap because Next is well
  represented in training data. At 16.3.5 that assumption is weaker: falling
  back would mean working against a version the model is likely to get wrong,
  on a deadline. This does not change the decision, and it does raise the
  value of the day-four gate being honest rather than hopeful.
