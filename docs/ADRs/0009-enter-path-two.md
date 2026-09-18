# ADR 0009: Enter Path Two, defer Path One

Date: 2026-09-18
Status: Accepted

## Context

The brief published on September 18 offers two paths. Entries are due
October 4, which is sixteen days. Both paths may be entered, in separate posts.

Path One asks for an agent pointed at a Sanity Context MCP endpoint backed by a
Knowledge Base, judged on meaningful use of Sanity Context and structured
content, technical implementation, use of Knowledge Bases, and usability.

Path Two asks for an app prompted into existence in an AI-native IDE, with
Next.js or Astro on the front and Sanity behind it, judged on quality and
honesty of the build process writeup, functionality, thoughtfulness of the
schema, and creativity and originality.

Path One is a strong thematic fit. Sanity Context surfaces contradictory
claims side by side with their sources, which is the same argument this
project makes about drinking windows, and there is an existing records corpus
where contradictory sourcing is the normal condition. That is a genuinely good
entry and it is not the one the last three weeks of design work built.

## Decision

The Cellar is submitted to Path Two. Three of its four judging criteria are
the axes this project was already designed along, and the fourth is a writing
task.

Path One is deferred rather than abandoned. Revisit on September 28: if the
Cellar is feature-complete and only polish and writing remain, a second entry
is viable. If not, drop it without further deliberation.

## Consequences

- The build must genuinely be AI-assisted and documented as it happens. The
  writeup is the first judging criterion, and it cannot be reconstructed after
  the fact.
- The friction log needs a second half aimed at the prompting process, not
  only at the platform. See the updated `friction-log.md`.
- The submission post and the article are different documents. The submission
  follows their template: What I Built, Demo, Code, My Build Process, Sanity
  Project Details. "Your Content Has a Drinking Window" publishes separately
  and is linked from it. One post cannot do both jobs well.
- The submission must include the Sanity project ID or a public dataset URL.
  Submissions without it may be treated as incomplete.
- A Claude Code session transcript should be uploaded through their Agent
  Sessions tool and embedded. It is optional, encouraged, and nearly free
  given that the transcript exists anyway. Check it for keys and set it public
  before publishing.

## The writeup angle

Path Two is called vibe-coding, and most entries will be some version of
prompting an app into existence with no prior plan. This project arrives with
fourteen documents of specification written before any code existed.

That difference is the writeup. Did spec-first prompting actually beat
vibe-coding? Where did the model follow the specs, where did it ignore them,
and where were the specs wrong in ways only implementation revealed?

The criterion is honesty, not vindication. If the specs turn out to have been
overhead, that is the finding and it gets reported.
