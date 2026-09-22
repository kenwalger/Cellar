# I Built a Wine Cellar That Can Remember the Past

*What I learned building a temporal content system with Sanity, Claude Code, and a specification written before either of them touched the project.*

Most wine cellar applications answer a question that sounds simple: **What wine do I have right now?** I wanted to answer a different one: **What did my cellar look like on June 1, 1999?** Then I wanted to move in the other direction and ask what would happen to the bottles I own today if I did nothing for another nine years.

Those questions change the architecture. If a bottle has a `status` field containing `consumed`, I can tell you what is true now, but I cannot necessarily tell you whether that bottle was still in the cellar in 2004. If a wine has a single `drinkUntil` field, I can tell you what someone currently thinks its drinking window is, but I cannot tell you what they thought five years ago before another tasting changed their mind.

That led to the design rule behind **Cellar**: do not store what is true now when you may later need to know what was true then.

## What I Built

Cellar models a wine collection as an event ledger rather than an inventory. Bottles exist, acquisitions bring them into the cellar, consumptions take them out, and assessments make dated, attributed claims about when a wine should be opened. Those claims can change, which means the application can move through time without restoring database snapshots.

Six document types carry it:

- `producer`
- `wine`
- `bottle`
- `acquisition`
- `consumption`
- `assessment`

Acquisition and consumption are documents rather than mutable fields on a bottle. Assessments are documents rather than fields on a wine. That is what makes time travel possible.

A bottle is not "consumed" because a status field says so. It is consumed as of date T if a consumption event exists on or before T. A drinking window is not whatever happens to be stored on the wine today. It is resolved from the assessments that existed at T, using explicit authority and recency rules: my own tasting note outranks the producer's, which outranks a critic's, and within a tier the most recent claim wins.

The application itself is a Sanity App, built on the App SDK, running inside Sanity beside the content it interprets. It reads the whole cellar in one GROQ query and hands it to a pure TypeScript package that resolves state at any date.

## Demo

The same 542-bottle ledger, read at three different moments:

| Date | In cellar | Drinking | Past window | Not yet acquired |
| --- | ---: | ---: | ---: | ---: |
| June 1, 1999 | 4 | 4 | 0 | 536 |
| September 22, 2026 | 248 | 166 | 33 | 0 |
| July 23, 2035 | 248 | 62 | 182 | 0 |

In 1999 the entire cellar is four bottles of 1993 Château Mouton Rothschild, with two more already opened. By 2026 it is 248 bottles. Projected to 2035, assuming nothing else happens, those same 248 bottles are still physically present, but 182 of them have moved past their drinking windows.

The cellar did not lose bottles. It lost opportunities.

The future view is explicitly labeled as a projection and states its assumption on screen: no further acquisitions, consumptions, or assessments. Cellar is not predicting what the cellar will contain in 2035. It is asking what today's ledger implies if nothing else changes.

`[TODO: screenshots for 1999, 2026, 2035. Three-minute demo video.]`

## The Architecture Came First

I did something slightly unusual for a challenge project: I wrote a lot before I built anything. Cellar entered implementation with fourteen planning documents, including a content model, a temporal-resolution specification, a build plan, a seed-data plan, and eleven architecture decision records.

I also started a friction log before learning much about Sanity, because confusion is difficult to reconstruct once you understand the thing that confused you. Each entry records what I expected, what actually happened, how I resolved it, and what documentation, error message, or tooling change would have prevented the problem. That last part matters, because there is a considerable difference between documenting platform friction and compiling a list of complaints.

## How I Worked With AI

This is a Path Two entry, so I should be precise about how the code got written and who decided what.

Claude Code wrote nearly all of it, in a terminal alongside WebStorm, with Sanity's MCP server connected. But the prompts themselves were drafted in a separate planning conversation with Claude in the chat app, where I also made the decisions at each fork and then relayed them. When Claude Code came back with ten objections to my specification, I worked through those objections in the planning session and sent the answers. The friction log records that split for every session, and it would be misleading to describe this as one developer and one agent.

The pattern that emerged looks like this:

```text
specification
     ↓
agent conflict pass
     ↓
human decision
     ↓
implementation
     ↓
independent oracle / measurement / experiment
     ↓
human-visible gate
```

The conflict pass is the part I would keep in any future project. Before writing code, the model reads the specifications, compares them against the current platform behavior, and reports where they disagree. It stops there. Every stage in this project started that way, and every stage found something.

The gates matter just as much. Claude Code cannot see my browser, so any verification that depends on rendered output has to end with me. I learned to write that into the prompt explicitly, along with a list of the things that would not count as proof: calling the domain module from a script, querying the dataset another way, or pointing at the test suite. Without those exclusions, there are too many ways to report a pass that is not one.

What the AI contributed, then, is not mainly speed. It probably was faster, but that is the least interesting result. Claude found errors in my specifications and also introduced its own bugs. It found a date-arithmetic bug it had written. It nearly reported a Sanity type-definition problem that turned out to be its own incomplete reading of an inheritance chain, and logged the near-miss instead. It once modified an oracle file it had explicitly been told not to modify, restored it, and disclosed the mistake. It has twice used mutation testing to prove that tests actually detect failures rather than merely reporting coverage.

So my conclusion is not that specifications make AI-generated software trustworthy. It is that **specifications make disagreement observable, and independent witnesses make that disagreement useful.**

Sometimes the witness is a CSV generated before implementation. Sometimes it is a second algorithm, a property test, a benchmark, or the contents of a deployed bundle. Sometimes it is me looking at six numbers in a browser because the model cannot see them.

That is a considerably more interesting workflow than prompting until the tests are green.

## Stage 1: When the Specification Was Wrong

My first substantial Claude Code prompt did not say "build the schemas." It instructed the model to read the specifications, compare them with the current Sanity schema API, identify disagreements, and stop before writing code until I had approved the resolutions.

That turned out to be one of the better decisions in the project, because the model found several places where my specification could not be implemented as written.

I had proposed underscore-prefixed projection fields. Sanity reserves underscore prefixes for system fields. I had also specified a validation rule requiring an assessment with `derivedFrom` to have been *created* in the proposed state. Sanity document validation sees the current document rather than its creation-time state, so implementing that literally would have made the later proposed-to-accepted transition permanently invalid, breaking the exact workflow the rule existed to protect. A cross-document uniqueness requirement also did not map cleanly to declarative schema validation.

The specifications were wrong, but that is not evidence that writing them was wasted effort. Because the assumptions were written down, the model had something concrete to challenge. Without the specification, those same assumptions would have disappeared into implementation decisions and become much harder to notice.

By the end of Stage 1, the generated seed dataset contained 8 producers, 98 wines, 542 bottles, 542 acquisitions, 294 consumptions, and 161 assessments, for 1,645 documents. Sanity imported all of them in roughly eight seconds, including reference strengthening.

## Where Sanity Clicked: Content as a Graph

A cellar could have been a relational database. Nothing here fundamentally requires a content platform. But once the documents were in the Content Lake, the model stopped feeling like six collections of JSON and started feeling like a graph.

A consumption references a bottle. The bottle references a wine. The wine references a producer. A later personal assessment can reference the consumption it was derived from. GROQ walks that chain directly.

In the seed data, two reassessments of Château Mouton Rothschild trace back to the exact bottles opened the day before: one in 1996, one in 1999, each pointing at a different bottle. Thirty years of provenance traversed in a single query, with no application-side joins.

For this project, that means the content graph is not an export from the CMS that my application then has to reinterpret. **It is the content model.**

GROQ fits this kind of traversal unusually well. I can start with a consumption and project through bottle, wine, and producer in the query itself rather than building a series of requests or an application-side join layer. There is a downside to that flexibility: GROQ can fail quietly. Misspell a projected field and `null` may be the answer rather than an error. Draft perspective matters too, since unpublished documents can enter results unless the query deliberately pins the perspective. Both became explicit rules in Cellar rather than assumptions left to individual callers.

The querying experience was strong. Discovering it was less so. Sanity Studio includes Vision, a place to run GROQ directly against the dataset, and nothing in my onboarding path told me it existed. I found it when I needed to verify the import. Likewise, imported documents do not receive Studio validation simply because they arrived through `sanity dataset import`, which is an important distinction when working with generated seed data.

## Stage 2: Specifications Need Witnesses

The hard part of Cellar was never storing bottles. It was resolving time.

That logic lives in a pure TypeScript package called `@cellar/core`. It knows nothing about React, the Sanity client, the network, or the system clock. Give it a snapshot and an `asOf` date and it determines whether a bottle had been acquired, whether it had been consumed, which assessment controlled its drinking window on that date, what state it occupied, whether a historical consumption was reasonable given what was known at the time, and whether the cellar missed an opportunity to open it while it was drinking well.

Before Claude Code implemented that module, I generated expected outputs independently. The important instruction was to treat the expected-output table as an oracle rather than as output to be repaired. If the implementation disagreed, the model was to stop and report, not quietly adjust the fixture until everything turned green.

The result was 390 passing tests, including 353 checks against three independently generated oracle datasets, all passing on the first run. But something more interesting happened before that. Claude found another error in my specification.

The missed-opportunity algorithm listed the state-change boundaries it needed to evaluate. I had omitted assessment dates. That was wrong, because a new assessment can change the resolved drinking window without any acquisition, consumption, `drinkFrom`, or `drinkUntil` boundary being crossed. The state changes because our **knowledge** changed, even though nothing happened to the physical bottle.

That distinction is the whole thesis of the project, and I had left it out of the algorithm implementing the thesis.

There is an important caveat. Most of the oracles were generated from the same specification. They are strong protection against implementation mistakes, but they cannot independently prove the specification is correct. The missed-opportunity oracle is somewhat stronger, because it uses a brute-force daily evaluation rather than a boundary scan, although it still shares the same domain assumptions.

The lesson I expect to keep beyond this challenge: tests can tell you that the implementation disagrees with your expectations. They cannot tell you whether your expectations deserve to win.

## Historical Truth and Current Knowledge Are Different Things

The event model creates an interesting consequence. Suppose I opened a bottle in 2018 and, at the time, the best accepted assessment said its drinking window was 2015 through 2020. Opening it in 2018 was therefore `IN_WINDOW`. Then someone tastes another bottle in 2023 and concludes the wine actually held beautifully through 2027.

Should the 2018 verdict change?

Cellar says no. The historical verdict is resolved using the information available when the bottle was consumed. Later knowledge can tell us the old assessment was incomplete, but it should not rewrite whether the earlier decision was reasonable given what was known then.

In the seed data, 17 of 294 consumptions would be judged differently today than they were at the time. Seven wines nobody had assessed when the bottle was opened have since been assessed, and it turns out those bottles were opened at the right moment. Six bottles judged in window at the time read as early now, because a later assessment pushed the window's start back.

`[TODO: screenshot once verdict drift becomes a visible view.]`

This is also where the project stops being about wine. Content systems usually tell us what a record says now. There are entire classes of systems where we need a harder answer: **what did the record say then, what evidence supported it, and when did our understanding change?**

## Stage 3: Crossing Into the App SDK

The next gate was deliberately narrow. I did not ask Claude to build the application. I asked it to prove this path:

```text
Production Content Lake
        ↓
     App SDK
        ↓
   CELLAR_QUERY
        ↓
toCellarSnapshot()
        ↓
  bottleState()
        ↓
 rendered view
```

The verification date was frozen at September 18, 2026, and the expected state was known before the view existed:

```text
Hold              45
Drinking         166
Past window       33
Unassessed         4
Consumed         294
Total             542
```

Claude could query the data and run the tests, but it could not see my browser, so the gate explicitly prohibited it from declaring success. It built the view, gave me the URL and the expected values, and stopped. I confirmed the six rendered numbers myself, and every one matched an independent implementation written three days earlier in a different language using a different method.

The App SDK let the application live **inside Sanity** while consuming the same Content Lake as Studio. `useQuery` subscribes to the underlying query, so an accepted assessment changes the content graph and the application reacts without a separate synchronization layer.

Studio edits the graph, the App SDK reads the graph, GROQ traverses the graph, Functions react to changes in the graph, and the pure domain package decides what those changes mean. That separation has held up remarkably well.

## The App SDK Documentation Was the Roughest Part

The App SDK itself worked. Learning the current App SDK was considerably harder than it needed to be.

Three examples appeared in one session. Sanity's own agent guidance supplied a CLI command containing `--skip-mcp`, while the installed CLI expected `--no-mcp`. The App SDK quickstart referenced an `app-quickstart` template that worked, but the CLI reference did not list it among the available templates. The official template also installed an older major version of the SDK while the reference documentation I was being directed toward described the newer one.

The harder problem was not any one stale page. It was a recurring documentation shape. The recommended path was well documented for the common case of rendering and editing documents, while Cellar was building an aggregate.

The guidance steered toward `useDocuments` and `useDocumentProjection`, while the architecture needed one `useQuery` over the cellar snapshot. Following the recommended shape would have meant roughly 1,500 hook instances and round trips to derive six numbers instead of running the single query the architecture had been designed around.

Similarly, the guidance correctly warned against putting Content Lake field values into React `useState`, but did not distinguish those values from ephemeral view state such as Cellar's `asOf` date. The problem was not that the guidance was wrong. It is that once I stepped outside the shape of the example application, it became difficult to tell the difference between **not recommended**, **not documented**, and **not supported**.

That is an important distinction for an SDK intended to support applications beyond the examples used to introduce it.

## Then the Cellar Started Moving Through Time

Once the gate passed, the next feature was the one I had wanted from the beginning: the `asOf` control, a date input and a slider over the ledger's full span.

Move backward and acquisitions disappear, consumptions reverse, assessments cease to exist before the date on which they were made, and drinking windows change as the controlling assessment changes. Move forward and unopened bottles age through their windows.

### A Working Demo Still Had Bugs

The time control also produced my favorite finding of the project. The date arithmetic contained a bug: January 31 to March 1 was calculated incorrectly, because the implementation borrowed days from February and silently lost the remainder.

None of the five verification dates caught it. The application worked, the screenshots looked right, and every date I had planned to demonstrate passed. A property test across all 17,167 possible slider positions found the problem.

**Demo-driven verification proves the paths you already walk, not the paths you forgot existed.**

The same session found a performance bug in code that had already passed the previous gate. Rebuilding the indexed cellar cost roughly 6 ms, while recalculating all 542 bottle states for a new date took about 0.07 ms. The existing memoization rebuilt the expensive structure every time the date changed.

Measuring the two operations showed both the bug and the correct fix: memoize the structure, recompute the cheap state, and **do not debounce the slider**. Without the measurement, adding a debounce would have looked like sensible performance engineering while making the demo worse.

## Stage 4: Sometimes the Documentation Cannot Answer the Question

One technical risk had remained open since Stage 2: could a Sanity Function import `@cellar/core`?

The repository uses npm workspaces and TypeScript. The Functions documentation described TypeScript Functions in pnpm workspaces, and npm projects without TypeScript, but not this combination. Reading more documentation could not settle it, so I stopped reading and built an experiment.

The probe used six hardcoded documents with a predetermined expected result, deliberately constructed so that breaking either assessment authority or accepted-only resolution would produce a different bottle state. Both failure modes would read `HOLD`; only correct behavior reads `DRINKING`. The expected output was written down before deployment, and the Function returned exactly that.

No package-manager migration was required. No bundler alias, no copied source, no `transpile: false` escape hatch.

Inspecting the deployed bundle explained why. The CLI inlined and tree-shook the local `@cellar/core` package into numbered chunks while externalizing `@sanity/functions` and its registry dependencies into a shipped `node_modules`. The local package only ever needed to be resolvable at build time. It never needed to exist in a registry.

That is more useful than finding a missing paragraph. The documentation describes two project-wide bundling strategies, and the CLI actually decides per dependency. The published model of the tool did not match its behavior, and the experiment closed the last unverified technical risk in the architecture on challenge day five.

`[TODO: continue here with the real Stage 4 Functions, the review workflow, and the Agent Action once implemented.]`

## What Sanity Made Easy That I Would Not Want to Build Myself

There is almost nothing in Cellar that could not be built with other tools. That is not the interesting comparison. The comparison is how many tools I would have to assemble before I could concentrate on the actual problem.

Cellar needs structured authoring, reference-rich storage, graph-like querying, live application reads, content-triggered compute, workflow around proposed claims, a custom application surface, and one consistent content model underneath all of it.

Elsewhere I would start with a relational database, add an API, choose or build an admin interface, implement authorization, add event handling or webhooks, build a frontend, decide how live updates work, and then spend real time making sure every layer agreed about what a bottle, an assessment, and a consumption mean.

With Sanity, most of that plumbing already exists, and it exists around a single content substrate rather than as integrations between separate systems. That let me spend an unreasonable amount of time arguing about whether an assessment from 2023 should be allowed to change the historical verdict on a bottle consumed in 2018.

For this project, that is exactly where I want the complexity to be.

The most important capability may also be the least flashy. Because acquisitions, consumptions, and assessments are structured documents rather than prose buried in pages, historical state is computable. The time slider is not replaying backups. It is querying evidence.

## Where Sanity Has Struggled

Most of my friction has not been with what Sanity can do. It has been with discovering **how Sanity currently expects me to do it**.

The Studio schema system is understandable once its boundaries are known. GROQ has been productive. The Content Lake handled the model without drama. The App SDK works. The Functions bundler handled a configuration I was not sure it supported. The rough edges cluster around the seams between those pieces.

Onboarding did not surface Vision. Dataset imports bypass validation assumptions a Studio-first developer would reasonably make. CLI behavior changes depending on where a command runs, without always making the missing project context obvious. App SDK guidance and templates have drifted across versions. Agent-specific guidance contained a CLI command the current CLI rejects. Supported but less common patterns are hard to distinguish from unsupported ones. The Functions documentation simplified a bundling model that turned out to be more nuanced in practice.

None of that blocked the project, and several cost only minutes. Minutes are not the only useful measure of developer friction, though. Every undocumented branch forces a developer to decide whether they misunderstood the platform, found stale documentation, chose the wrong architecture, or hit a real product limitation.

That uncertainty is expensive even when the eventual fix is one line.

## What Comes Next

`[TODO: update after the remaining build stages.]`

The remaining work is intentionally narrow. I am not adding features because the early stages finished ahead of schedule. The extra time is going into verification, the submission, and the demo rather than expanding scope.

What is left: the real Sanity Functions and the review workflow, the Agent Action that turns an unstructured tasting note into a proposed structured assessment, any remaining views that survive the scope gate, final polish, and the demo video.

The demo already has one sequence I know I want to keep: 1999, 2026, and 2035. The same ledger at three points in time, producing three different cellars, because the underlying evidence changed.

## Code and Project Details

`[TODO: repository link, Sanity project ID, live app link if deployed.]`

**About the data.** The cellar is loosely based on a real one. The producers, appellations, and club memberships are real, and some of the history is too, including the Mouton bought in 1996 and opened twice in the nineties. Everything evaluative is invented. Drinking windows, scores, critic notes, and most tasting notes exist for the demo, and critic assessments are attributed to publications that do not exist. Nothing here should be read as a factual claim about any wine, and nothing attributed to a named producer reflects anything they have actually said.

## Final Thoughts

`[TODO: rewrite at the end of the challenge. Do not lock the conclusion yet.]`

I started this project wanting to know whether Sanity was a good fit for a temporal content system. The answer turned out to be more interesting than a platform verdict.

Sanity's strongest quality here has not been making simple content simpler. It has been letting me make the content model **more honest**. An acquisition stays an event. A consumption stays an event. An assessment stays a dated, attributed claim rather than becoming a field that silently overwrites yesterday's belief.

Those documents reference each other, GROQ traverses them, an App interprets them, and Functions react to them, without first flattening the model into whatever happens to be true today. Where I have struggled has mostly been in finding the current path through a fast-moving platform, particularly where my application does not look like the introductory examples.

That is useful friction to find, because Cellar was never really about tracking wine. It was about asking a content system a harder question: **not just what do you know, but what did you know then?**