# Friction log

A record of the experience of learning and building on Sanity, captured while
it is happening.

## Why this exists

Two reasons, and they pull in the same direction.

The first is that the article is better if it has real moments in it. Specific
confusions, specific delights, and the exact place where a mental model
clicked are worth more than a competent walkthrough.

The second is that a friction log is a developer relations deliverable in its
own right. Documenting where a platform is hard to learn, precisely and
constructively, is the work. It is also unrecoverable after the fact: once you
understand something, you cannot reconstruct what it was like not to.

## Rules of capture

1. **Write at the moment of friction, not after resolving it.** The value is in
   the confusion, and the confusion evaporates the second it resolves. Thirty
   seconds of notes beats a careful reconstruction on day nine.
2. **Record what you expected before recording what happened.** The gap between
   the two is the finding. "It did X" is a bug report. "I expected Y and it did
   X" is a mental model mismatch, which is more useful.
3. **Timestamp everything.** Elapsed time is data.
4. **Do not soften.** This is a raw capture file. Judgement about what is fair,
   what is a real problem, and what is a skill issue happens later, when
   something gets published.
5. **Note the search that failed.** What you typed into docs search or a search
   engine when you were stuck tells you what vocabulary you had at the time,
   and vocabulary mismatch is the most common documentation failure.

## Entry template

```
### [date, time] Short title

Category:   surprise | delight | confusion | friction | click | gap
Surface:    Studio | GROQ | Functions | Agent Actions | schema | CLI | docs | frontend
Elapsed:    how long this cost me

Expected:
What I thought would happen, or what I thought the thing was.

Happened:
What actually did.

Resolution:
How I got past it, and what finally made it make sense.

Would have helped:
The one sentence in the docs, error message, or tutorial that would have
saved this entirely.
```

The "would have helped" field is the most valuable one and the easiest to
skip. It converts a complaint into a recommendation, which is the difference
between a rant and a friction log.

## Entries

<!-- Newest last. Append during the build, do not tidy. -->

## Standing questions

Revisit at the end of each build day rather than once at the end. Answers
change as competence grows, and the change is itself interesting.

### On learning the platform

- What surprised me?
- What was delightful?
- What confused me?
- What would I teach a new Sanity developer first?
- Where did Studio's mental model click, and what triggered it?

### On the tools

- What did GROQ make easier? Where did I reach for it and find it was the
  wrong instrument?
- What did Agent Actions actually enable that ordinary generation did not?
  Be specific. If the honest answer is "nothing", that is a finding too.
- Where did Functions fit the problem, and where did they feel like a
  workaround?

### On the model

- Where did the content model help?
- Where did I fight the platform? Distinguish carefully between three things:
  a bug, a documentation gap, and a genuine design disagreement. They have
  different fixes and only one of them is Sanity's fault.
- What would I build differently next time?

### On the documentation

- What did the documentation explain well?
- What did it explain poorly?
- What did it not explain at all, that I only learned by failing?
- Where did I end up in Discord, GitHub issues, or a blog post instead of the
  docs, and what was I looking for?

## Build process capture

Path Two's first judging criterion is the quality and honesty of the build
process writeup. That writeup is assembled from this section, and it cannot be
reconstructed afterwards. Capture daily, at the end of each session, while the
prompts are still in scrollback.

### Per session

```
### [date] Session N

IDE / tool:
What I was trying to build:

Prompts that worked:
The ones that produced usable output first time. Paste them.

Prompts that failed:
What I asked for, what I got instead, and how many attempts it took.

Where the model got stuck:
Wrong API surface, invented functions, outdated patterns, confident nonsense.
Be specific about which Sanity feature it got wrong, because that is a
signal about what the training data contains and what the docs make clear.

How I course-corrected:
Pointed it at docs, rewrote the prompt, gave up and hand-wrote it.

Hand-written vs generated:
Rough proportion, and which parts I did not trust it with.
```

### The spec-first question

This project arrived with fourteen documents written before any code existed.
Most Path Two entries will have none. The comparison is the writeup's spine,
so track it deliberately:

- Did pointing the model at a spec file produce better output than describing
  the same thing in the prompt?
- Where did the model ignore the spec and do something else?
- Which spec turned out to be wrong in a way only implementation revealed?
- What did I have to decide mid-build that no spec covered?
- Would I do this again, honestly?

The criterion is honesty, not vindication. If the specs were overhead, say so.
A writeup that concludes the planning was unnecessary is more interesting than
one that concludes the author was right all along, and judges can tell the
difference.

## Instrumentation

Record these as they happen. They are the closest thing to activation metrics
you can gather on yourself, and they are exactly the evidence that
time-to-value claims usually lack.

| Marker | Time | Notes |
| --- | --- | --- |
| Account created to Studio running locally | | |
| Studio running to first custom schema saved | | |
| First document created by hand | | |
| First successful GROQ query against real data | | |
| First dataset import completed | | |
| First Function deployed and firing | | |
| First Agent Action returning usable structured output | | |
| First App SDK view rendering real data | | |
| First workflow transition moving a proposed assessment | | |

Also worth noting: how many of these required leaving the documentation, and
where you went instead.

## What this feeds

- Specific moments in the challenge article, which make it concrete rather
  than generic
- A separate piece on learning the platform, if the material supports one
- A work sample, if Sanity turns out to be interesting as a place to work

On that last point: this file is raw and stays raw. Anything published gets
rewritten with judgement applied, proposed fixes attached, and the skill
issues separated out from the real problems. A friction log written to be
published is a friction log with the useful parts removed.

---

### [date] Session N

IDE / tool:
What I was trying to build:

Prompts that worked:
The ones that produced usable output first time. Paste them.

Prompts that failed:
What I asked for, what I got instead, and how many attempts it took.

Where the model got stuck:
Wrong API surface, invented functions, outdated patterns, confident nonsense.
Be specific about which Sanity feature it got wrong, because that is a
signal about what the training data contains and what the docs make clear.

How I course-corrected:
Pointed it at docs, rewrote the prompt, gave up and hand-wrote it.

Hand-written vs generated:
Rough proportion, and which parts I did not trust it with.