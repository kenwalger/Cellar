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

### 18 September 2026, Session 0

#### Sanity signup, project scaffold, MCP configuration

IDE / tool: WebStorm + Claude Code, Windows / PowerShell
What I was trying to build: nothing yet. Account created, project
initialized, Studio running locally, MCP wired to Claude Code.
Elapsed: roughly 1 hour 15 minutes end to end, including package
installation, onboarding, scaffolding, and MCP configuration. That figure also
includes time lost to an unrelated local error and a slow machine, which
required closing and restarting the terminals and IDE, so treat it as an upper
bound on Sanity setup rather than a clean measurement.

No project code written. Numbering this Session 0 so Session 1 lines up with
Stage 1 of the build plan.

---

#### What worked

- GitHub account connection was immediate and asked nothing unnecessary.
- The scaffold command ran first time with a long flag string and no
  correction needed.
- The `clean` template produced a Studio that ran on the first
  `npm run dev` with no fiddling, no missing dependencies, and no config
  editing.
- The CLI offered a package manager choice rather than assuming npm. Small
  thing, well judged.
- `sanity mcp configure` was a single command, used my logged-in CLI session,
  and needed no API token to generate, store, or accidentally commit.

#### Onboarding

Eight steps before reaching anything buildable.

**Step 4, "What are you building?"** Six options: marketing site, media and
publishing, e-commerce, knowledge base, product / app, blog. None quite
describes this project. The question asks you to classify yourself before you
know what the classification changes. Answered Product / App as the closest
fit. Avoided Knowledge Base, since Sanity uses that term specifically for
Sanity Context knowledge bases and picking it might have steered the setup
toward machinery this project does not use.

**Step 6, "What technologies are you using?"** Fifteen options, every one of
them a frontend framework or a hosting platform. There is no option for
building inside Sanity itself. The list quietly assumes you are building a
separate site that consumes the content. That is a fair assumption for most
users and an odd one given that the App SDK is a headline feature on the same
platform. Answered React and TypeScript, which are true regardless of where
the interface ends up living.

**Step 7, "Adding Sanity to an existing site or app?"** Answered from scratch.

#### Scaffolding

```
npm create sanity@latest -- --project aos9nze5 --dataset production \
  --template clean --typescript --output-path studio
```

- Required `create-sanity@6.0.48` to be installed first.
- Login to Sanity via GitHub.
- Prompt: "Configure Sanity MCP and agent skills for these editors?" The only
  option offered was Cursor. Declined.

Studio came up on `localhost:3333`, authenticated, and showed an empty
structure with "No document types," which is correct for a clean template with
no schemas defined.

#### Where the setup flow assumes a frontend

Three separate points in setup assume Sanity plus a separate frontend:
step 6 offers only frontend frameworks, step 7 asks existing site or from
scratch, and the closing agent prompt hard-codes `Framework: Next.js`. The
App SDK is a headline feature and a named bonus in the current DEV Challenge,
and no path through onboarding leads to it.

#### The Next.js app and the vendor agent prompt

I ran every command in their walkthrough, including the Next.js scaffold:

```
npx create-next-app@latest web --tailwind --ts --app --src-dir --eslint \
  --import-alias "@/*"
```

So a `web/` directory now exists. The one thing I did not run is the final
agent prompt itself, which does two separate things: installs the
`sanity-best-practices` skill from the Sanity Agent Toolkit, and wires the
`web` app to Sanity. Both were declined on purpose.

```text
Set up Sanity using the `sanity-best-practices` skill's `getting-started` reference.

If the skill can't be found, install it by running `npx skills add sanity-io/agent-toolkit --skill sanity-best-practices -y`. If the install fails, stop and ask me to run it.

Context:
- Project: Cellar (aos9nze5)
- Dataset: production
- Framework: Next.js
- Project Type: Product / App
- This is a monorepo: the current folder is the root, with the Studio in `studio` and the Next.js app in `web`
- Connect Sanity to my new `web` app
- First, confirm `studio` and `web` are both in your working directory. If not, stop and ask me to restart you from the `cellar` folder.
- Keep the Studio standalone - do not embed it in the Next.js app
```

**The skill install** would have loaded vendor content-modelling guidance
alongside this project's own CLAUDE.md, which carries six design rules that
deliberately contradict conventional Sanity practice, most notably that
drinking windows are never fields on a wine. Installing both at once would
make it impossible to attribute any given model behaviour to the MCP server,
the toolkit skills, or the project specs. Holding the toolkit back preserves a
clean first observation of how well spec-first instructions hold on their own.
It can be added later as a deliberate second variable.

**The Sanity wiring** conflicts with
[ADR 0010](ADRs/0010-time-machine-as-sanity-app.md), dated before this
session, which puts the temporal view in a Sanity App built on the App SDK and
keeps Next.js as a day-four fallback. The `web/` app exists but is
deliberately unwired to Sanity. Keeping it costs nothing and removes a step if
the gate ever trips.

Also worth noting: the prompt asserts `Framework: Next.js` even though
step 6 was answered React and TypeScript. The flow supplied that on my behalf
rather than carrying forward what I told it.

#### Next 16.3.5 makes the fallback more expensive than assumed

The scaffold installed Next 16.3.5. It also generated `web/AGENTS.md` and
`web/CLAUDE.md`, the latter containing nothing but `@AGENTS.md`, an import, so
both agents read one source of truth. Worth stealing that pattern.

The content is Next.js's own agent rules, not Sanity's, and the warning is
blunt: this version has breaking changes, APIs and conventions and file
structure may all differ from training data, and agents should read the
bundled guides in `node_modules/next/dist/docs/` before writing any code. The
block is regenerated by `next dev`, so deleting it just produces an
uncommitted change that returns. Commit it.

This matters for ADR 0010. The day-four fallback to Next.js was costed as
cheap, because Next is well represented in training data. At 16.3.5 that
assumption is weaker: falling back would mean falling back to a version the
model is likely to get wrong, on a deadline. It does not change the decision,
since the App SDK remains the right target, but the fallback is no longer free
and the ADR should say so.

#### MCP configuration

The init prompt offered only Cursor, but a sibling command supports three
editors. Found by looking it up rather than by being told.

```text
❯ npx sanity@latest mcp configure
Need to install the following packages:
sanity@6.15.0
Ok to proceed? (y)
npm warn deprecated uuid@10.0.0: uuid@10 and below is no longer supported.
npm notice run npx
npm notice run sanity mcp configure
✔ Configure Sanity MCP server? Claude Code
✔ MCP configured for Claude Code

~ took 5m16s
```

Note the prompt: this ran from the home directory, not the repo, so it likely
wrote a user-scoped config rather than a project-scoped one. To verify: start
Claude Code from the `Cellar` folder and confirm the Sanity server appears. If
it does not, rerun from the repo root.

**Would have helped:** one sentence in the init prompt saying that other
editors are supported and pointing at `sanity mcp configure`. As written, the
Cursor-only list reads as "Cursor is the supported editor," which is not true.

**Would also have helped:** `mcp configure` saying which config file it wrote
and at what scope, rather than only that it succeeded.