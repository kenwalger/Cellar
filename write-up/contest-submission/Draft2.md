# I Built a Wine Cellar That Can Remember the Past

*What I learned building a temporal content system with Sanity, Claude Code, and a specification written before either of them touched the project.*

Most wine cellar applications answer a question that sounds simple: **What wine do I have right now?** I wanted to answer a different one: **What did my cellar look like on June 1, 1999?** Then I wanted to move in the other direction and ask what would happen to the bottles I own today if I did nothing for another nine years.

Those questions change the architecture. If a bottle has a `status` field containing `consumed`, I can tell you what is true now, but I cannot necessarily tell you whether that bottle was still in the cellar in 2004. If a wine has a single `drinkUntil` field, I can tell you what someone currently thinks its drinking window is, but I cannot tell you what they thought five years ago before another tasting changed their mind.

That led to the design rule behind **Cellar**: do not store what is true now when you may later need to know what was true then.

Cellar is my entry for the DEV Community Sanity Challenge. It models a fictional wine collection as an event ledger. Bottles exist, acquisitions bring them into the cellar, consumptions take them out, and assessments make dated claims about when a wine should be opened. Those claims can change, which means the application can move through time without restoring database snapshots.

Set the date to June 1, 1999 and only four bottles are in the cellar. Move it to September 22, 2026 and 248 remain. Project forward to July 23, 2035, assuming nothing else happens, and those same 248 bottles are physically present, but 182 have moved past their drinking windows.

The cellar did not lose bottles. It lost opportunities, and that distinction turned out to be a useful way to learn Sanity.

It also turned into an experiment about building software with an AI coding agent when the specification exists **before** the code.

## The Architecture Came First

I did something slightly unusual for a challenge project: I wrote a lot before I built anything. Cellar entered implementation with fourteen planning documents, including a content model, temporal-resolution specification, build plan, seed-data plan, and a collection of architecture decision records.

I also started a friction log before learning much about Sanity because confusion is difficult to reconstruct once you understand the thing that confused you. Each entry records what I expected, what actually happened, how I resolved it, and what documentation, error message, or tooling change would have prevented the problem. That last part matters because there is a considerable difference between documenting platform friction and compiling a list of complaints.

The project itself uses six primary document types:

- `producer`
- `wine`
- `bottle`
- `acquisition`
- `consumption`
- `assessment`

Acquisition and consumption are documents rather than mutable fields on a bottle. Assessments are also documents rather than fields on a wine. That is what makes time travel possible.

A bottle is not "consumed" because a status field says so. It is consumed as of date T if a consumption event exists on or before T. A drinking window is not whatever happens to be stored on the wine today. It is resolved from the assessments that existed at T, using explicit authority and recency rules.

That distinction became the foundation for everything that followed.

## Stage 1: When the Specification Was Wrong

My first substantial Claude Code prompt did not simply say "build the schemas." It instructed the model to read the specifications, compare them with the current Sanity schema API, identify disagreements, and stop before writing code until I had approved the resolutions.

That turned out to be one of the better decisions in the project because the model found several places where my specification could not be implemented as written before it created a schema.

For example, I had proposed underscore-prefixed projection fields. Sanity reserves underscore-prefixed field names for system fields. I had also specified a validation rule requiring an assessment with `derivedFrom` to have been *created* in the proposed state. Sanity document validation sees the current document rather than its creation-time state, so implementing that literally would have made the later proposed-to-accepted workflow invalid. A cross-document uniqueness requirement also did not map cleanly to declarative schema validation.

The specifications were wrong, but that was not evidence that writing them had been wasted effort. Because the assumptions were written down, the model had something concrete to challenge. Without the specification, those same assumptions could easily have disappeared into implementation decisions and become much harder to notice.

By the end of Stage 1, the generated seed dataset contained 8 producers, 98 wines, 542 bottles, 542 acquisitions, 294 consumptions, and 161 assessments, for 1,645 documents total. Sanity imported all 1,645 documents in roughly eight seconds, including reference strengthening.

That was also where Sanity first started to shine.

## Where Sanity Clicked: Content as a Graph

A cellar could have been a relational database. There is nothing here that fundamentally requires a content platform, but once the documents were in the Content Lake, the model stopped feeling like six collections of JSON and started feeling like a graph.

A consumption references a bottle. The bottle references a wine. The wine references a producer. A later personal assessment can reference the consumption from which that assessment was derived. GROQ can walk that chain directly.

In the seed data, two reassessments of Château Mouton Rothschild trace back to the exact bottles opened the day before. The 1996 assessment points to the bottle consumed on November 9, 1996, while another assessment in 1999 points to a different bottle opened the previous day. Thirty years of provenance can be traversed in one query without application-side joins.

That is one of the places where Sanity makes something easy that would be considerably more work in a conventional content stack. The individual pieces are not exotic. A database can store references, an API can expose them, a frontend can join the results, and a CMS can provide an editor. Sanity gives me structured documents, references, an authoring environment, a query language, an API, and an application surface around the same Content Lake.

For this project, that means the content graph is not an export from the CMS that my application then has to reinterpret. **It is the content model.**

GROQ fits this kind of traversal unusually well. I can start with a consumption and project through bottle, wine, and producer in the query itself rather than building a series of REST requests or an application-side join layer. There is a downside to that flexibility, though: GROQ can fail quietly. Misspell a projected field and `null` may be the answer rather than an error. Draft perspective also matters because unpublished documents can enter results unless the query deliberately pins the perspective. Both became explicit rules in Cellar rather than assumptions left to individual callers.

The querying experience itself was strong. Discovering the querying experience was less so. Sanity Studio includes Vision, a useful place to run GROQ directly against the dataset, but nothing in my initial onboarding path told me it existed. I discovered it when I needed to verify the import. Likewise, imported documents do not receive Studio validation simply because they entered the dataset through `sanity dataset import`, which is an important distinction when using generated seed data.

Those are fixable documentation and onboarding problems around something that is genuinely useful once found.

## Stage 2: Specifications Need Witnesses

The hard part of Cellar was never storing bottles. It was resolving time.

I moved that logic into a pure TypeScript package called `@cellar/core`. It knows nothing about React, the Sanity client, network access, or the system clock. Give it a snapshot and an `asOf` date and it can determine whether a bottle had been acquired, whether it had been consumed, which assessment controlled its drinking window on that date, what state it occupied, whether a historical consumption was reasonable based on the information available at the time, and whether the cellar missed an opportunity to open it while it was drinking well.

Before Claude Code implemented that module, I generated expected outputs independently. The important instruction was to treat the expected-output table as an oracle rather than output to be repaired. If the implementation disagreed with the expected output, the model was supposed to stop and report the disagreement rather than "fix" the test fixture until everything turned green.

The result was 390 passing tests, including 353 checks against three independently generated oracle datasets. The oracle-backed implementation passed on its first run, but something more interesting happened before that: Claude found another error in my specification.

The missed-opportunity algorithm said it only needed to evaluate certain state-change boundaries. I had omitted assessment dates. That was wrong because a new assessment can change the resolved drinking window without an acquisition, consumption, `drinkFrom`, or `drinkUntil` event occurring. The state can change because our **knowledge** changed even though nothing happened to the physical bottle.

That distinction is the whole thesis of the project, and I had managed to leave it out of the algorithm implementing the thesis. Once again, the specification did not make the project correct. It made the disagreement visible.

There is an important caveat here. Most of the oracles were generated from the same specification. They are strong protection against implementation mistakes, but they cannot independently prove that the specification itself is correct. The missed-opportunity oracle is somewhat stronger because it uses a different brute-force daily algorithm, although it still shares the same domain assumptions.

The resulting lesson is one I expect to keep beyond this challenge: tests can tell you that the implementation disagrees with your expectations, but they cannot tell you whether your expectations deserve to win.

## Historical Truth and Current Knowledge Are Different Things

The event model creates an interesting consequence. Suppose I opened a bottle in 2018 and, at the time, the best accepted assessment said its drinking window was 2015 through 2020. Opening it in 2018 was therefore `IN_WINDOW`. Then someone tastes another bottle in 2023 and concludes that the wine actually held beautifully through 2027.

Should the 2018 verdict change?

Cellar says no. The historical verdict is resolved using the information available when the bottle was consumed. Later knowledge can tell us that the old assessment was incomplete, but it should not rewrite whether the earlier decision was reasonable given what was known then.

That is why Cellar can distinguish historical truth from verdict drift. `[TODO: insert final verdict-drift figures/example once this becomes a visible view.]`

This is also where the project starts becoming less about wine. Content systems usually tell us what a record says now, but there are entire classes of systems where we need a harder answer: **What did the record say then, what evidence supported it, and when did our understanding change?**

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

Claude could query the data and run the tests, but it could not see my browser. The gate therefore explicitly prohibited it from declaring success. It built the view, gave me the URL and expected values, and stopped. I confirmed the six rendered numbers myself, and every one matched an independent `check.py` implementation written earlier using a different method.

### This Is Where Sanity Became Particularly Interesting

The App SDK let the application live **inside Sanity** while consuming the same Content Lake as Studio. More importantly, `useQuery` can subscribe to the underlying query, so an accepted assessment can change the content graph and the application can react without me building a separate synchronization layer.

That is another answer to the question, "What can I do easily with Sanity that would be challenging elsewhere?" Again, none of the individual capabilities is impossible elsewhere. I could assemble a database, authoring interface, API, subscriptions or change-data capture, application shell, authorization between them, deployment infrastructure, and glue code keeping the models aligned.

With Sanity, those pieces share a content substrate. For Cellar, that is more important than any single feature. Studio edits the graph, the App SDK reads the graph, GROQ traverses the graph, Functions can react to changes in the graph, and the pure domain package determines what those changes mean.

That separation has held up remarkably well.

## The App SDK Documentation Was the Roughest Part

The App SDK itself worked. Learning the current App SDK was considerably harder than it needed to be.

Three examples appeared in one session. Sanity's own agent guidance supplied a CLI command containing `--skip-mcp`, while the installed CLI expected `--no-mcp`. The App SDK quickstart referenced an `app-quickstart` template that worked, but the CLI reference did not list it among the available templates. The official template also installed an older major version of the App SDK while the reference documentation I was being directed toward described the newer major version.

The harder problem was not any one stale page. It was a recurring documentation shape. The recommended path was well documented for the common case of rendering and editing documents, while Cellar was building an aggregate.

The guidance steered toward `useDocuments` and `useDocumentProjection`, while the architecture needed one `useQuery` over the cellar snapshot. Following the recommended shape would have meant roughly 1,500 hook instances and round trips to derive six numbers instead of executing the single query the architecture had been designed around.

Similarly, the guidance correctly warned against putting Content Lake field values into React `useState`, but did not clearly distinguish those values from ephemeral view state such as Cellar's `asOf` date. The problem was not that the guidance was wrong. Once I stepped outside the shape of the example application, however, it became difficult to tell the difference between **not recommended**, **not documented**, and **not supported**.

That is an important distinction for an SDK intended to support applications beyond the examples used to introduce it.

## Then the Cellar Started Moving Through Time

Once the App SDK gate passed, the next feature was the one I had wanted to see from the beginning: the `asOf` control. It is both a date input and a slider.

Move backward and acquisitions disappear, consumptions reverse, assessments cease to exist before the date on which they were made, and drinking windows change as the controlling assessment changes. Move forward and unopened bottles age through their windows.

The same 542-bottle ledger produces very different cellars:

| Date | In cellar | Drinking | Past window | Not yet acquired |
| --- | ---: | ---: | ---: | ---: |
| June 1, 1999 | 4 | 4 | 0 | 536 |
| September 22, 2026 | 248 | 166 | 33 | 0 |
| July 23, 2035 | 248 | 62 | 182 | 0 |

The future view is explicitly labeled as a projection. It assumes no future acquisitions, consumptions, or assessments. Cellar is not predicting what the cellar will contain in 2035. It is asking what today's ledger implies if nothing else changes.

### A Working Demo Still Had Bugs

The time control also produced one of my favorite findings from the project. The date arithmetic contained a bug: January 31 to March 1 was calculated incorrectly because the implementation borrowed days from February and silently lost the remainder.

None of the five verification dates caught it. The application worked, the screenshots looked right, and every date I had planned to demonstrate passed. A property test across all 17,167 possible slider positions found the problem.

That led to another useful lesson: **demo-driven verification proves the paths you already walk, not the paths you forgot existed.**

The same session found a performance bug in code that had already passed the previous gate. Rebuilding the indexed cellar cost roughly 6 ms, while recalculating all 542 bottle states for a new date took only about 0.07 ms. The existing memoization rebuilt the expensive structure every time the date changed.

Measuring the two operations showed both the bug and the correct solution: memoize the structure, recompute the cheap state, and **do not debounce the slider**. Without measurement, adding a debounce would have looked like sensible performance engineering while making the demo worse.

## Stage 4: Sometimes the Documentation Cannot Answer the Question

One technical risk had remained open since Stage 2: could a Sanity Function import `@cellar/core`?

The repository uses npm workspaces and TypeScript. The Functions documentation described TypeScript Functions in pnpm workspaces and npm projects without TypeScript, but it did not describe this combination. Reading more documentation could not settle it, so I stopped reading and built an experiment.

The probe used six hardcoded documents with a predetermined expected result. It was deliberately constructed so that breaking either assessment authority or accepted-only resolution would produce the wrong bottle state. The expected result was written down before deployment, and the Function returned exactly that result.

No package-manager migration was required. There was no bundler alias, copied source, or `transpile: false` escape hatch.

More interestingly, inspecting the deployed bundle explained why. The CLI inlined and tree-shook the local `@cellar/core` package while externalizing `@sanity/functions` and its registry dependencies into `node_modules`. The local package therefore only needed to be resolvable at build time; it never needed to exist in a package registry.

That was better than discovering a missing documentation paragraph. The experiment showed that the simplified project-wide bundling model described by the documentation did not fully explain what the tool was actually doing, and it closed the last unverified technical risk in the architecture on challenge day five.

`[TODO: continue here with the real Stage 4 Functions and Agent Action once implemented.]`

## Where Sanity Shines

Five days into the project, my strongest impression is that Sanity becomes more interesting as the content model becomes less conventional. If Cellar were simply a wine document containing a title, producer, vintage, quantity, and drinking window, I am not sure I would have learned much.

Cellar instead treats content as an evolving graph of things, events, and claims. That plays directly to several Sanity strengths.

References are part of the content model rather than something an application has to reconstruct after retrieval. Acquisitions, consumptions, bottles, wines, producers, assessments, and derived evidence can remain independent documents while still being traversable as a graph. That keeps provenance intact instead of flattening everything into the current representation of a wine.

GROQ is particularly effective at asking questions of that graph. The ability to traverse references and shape the returned document in one query is a natural fit for this architecture. I do not need an API endpoint for "historical cellar state." The application can retrieve the source facts it needs and let the deterministic domain module resolve the state.

The Content Lake also functions as genuinely shared infrastructure. Studio is not maintaining one copy of the data while the application maintains another. The authoring surface, application, queries, and Functions operate around the same underlying content, removing an entire class of synchronization problems.

The App SDK makes internal tools unusually inexpensive to add. Cellar Health is not a separate admin application with another authentication system and another deployment story. It can be a Sanity App sitting beside the content it interprets. For applications that are partly editorial and partly operational, that is compelling.

Functions should extend that advantage by letting content changes become application events without introducing another queue or webhook service. `[TODO: expand this after implementing the real Functions.]`

The most important capability, though, may be the least flashy. Because acquisitions, consumptions, and assessments are structured documents rather than prose buried in pages, historical state is computable. The time slider is not replaying backups. It is querying evidence.

## Where Sanity Has Struggled

Most of my friction so far has not been with what Sanity can do. It has been with discovering **how Sanity currently expects me to do it**.

The Studio schema system has generally been understandable once its boundaries are known. GROQ has been productive. The Content Lake has handled the model without drama. The App SDK works. The Functions bundler handled a configuration I was not sure it supported. The rough edges have instead clustered around the seams between those pieces.

Onboarding did not surface Vision. Dataset imports bypass validation assumptions a Studio-first developer might reasonably make. CLI behavior changes depending on where a command is executed without always making the missing project context obvious. App SDK guidance and templates have drifted across versions. Agent-specific guidance contained a CLI command the current CLI rejects. Supported but less-common patterns such as aggregate `useQuery` usage are much harder to distinguish from unsupported ones. Functions documentation simplified a bundling model that turned out to be more nuanced in practice.

None of those issues has blocked the project, and several cost only minutes. Minutes are not the only useful measure of developer friction, though. Every undocumented branch forces a developer to decide whether they misunderstood the platform, found stale documentation, chose the wrong architecture, or encountered a real product limitation.

That uncertainty is expensive even when the eventual fix is one line.

## What Sanity Made Easy That I Would Not Want to Build Myself

This may be my most useful answer to the challenge so far. There is almost nothing in Cellar that could not be built with other tools, but that is not the interesting comparison. The comparison is how many tools I would have to assemble before I could concentrate on the actual problem.

For Cellar I need:

```text
structured authoring
        +
reference-rich storage
        +
graph-like querying
        +
live application reads
        +
content-triggered compute
        +
workflow around proposed claims
        +
a custom application surface
        +
one consistent content model
```

Sanity gives those concerns a common center.

Elsewhere, I could absolutely build the equivalent. I would probably start with a relational database, add an API, choose or build an admin interface, implement authorization, add event handling or webhooks, create a frontend, decide how live updates work, and then spend time ensuring every layer agrees about what a bottle, assessment, and consumption mean.

With Sanity, most of that plumbing already exists. That has let me spend an unreasonable amount of time arguing about whether an assessment from 2023 should be allowed to change the historical verdict on a bottle consumed in 2018.

For this project, that is exactly where I want the complexity to be.

## What AI Actually Contributed

This is a Path Two challenge entry, so there is another question I need to answer honestly: **What did the AI coding agent actually buy me?**

The answer so far is not simply that it wrote the code faster. It probably did, but that is also the least interesting result.

The more useful pattern has been:

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

Claude has found errors in my specifications, and it has also introduced its own bugs. It found a date-arithmetic bug it had written. It nearly reported a Sanity type-definition problem that turned out to be its own incomplete reading of an inheritance chain. It once modified an oracle it had explicitly been told not to modify, restored it, and disclosed the mistake. It has also used mutation testing to prove that tests actually detect failures rather than merely reporting coverage.

So far, my conclusion is not that specifications make AI-generated software trustworthy. It is that **specifications make disagreement observable, and independent witnesses make that disagreement useful.**

Sometimes the witness is a CSV generated before implementation. Sometimes it is a second algorithm, a property test, a benchmark, or the deployed bundle. Sometimes it is me looking at six numbers in a browser because the model cannot see them.

That is a considerably more interesting development workflow than prompting until the tests are green.

## What Comes Next

`[TODO: update after Stage 4 and remaining build stages.]`

The remaining work is intentionally narrow. I am not adding features simply because the early stages finished ahead of schedule. The extra time is going into verification, the submission itself, and the demo rather than expanding scope.

The remaining pieces include the real Sanity Functions and workflow, the Agent Action that turns an unstructured tasting note into a proposed structured assessment, any remaining planned views that survive the scope gate, final polish and accessibility, and the three-minute demo.

The demo already has one sequence I know I want to keep: 1999, 2026, and 2035. It is the same ledger at three points in time, producing three different representations of the cellar because the underlying evidence changed.

Somewhere inside those 1,645 documents is the reason why.

## Final Thoughts

`[TODO: rewrite this section at the end of the challenge. Do not lock the conclusion yet.]`

I started this project wanting to know whether Sanity was a good fit for a temporal content system. So far, the answer is more interesting than a simple platform verdict.

Sanity's strongest quality in this project has not been making simple content simpler. It has been allowing me to make the content model **more honest**. An acquisition can remain an event. A consumption can remain an event. An assessment can remain a dated, attributed claim rather than becoming a field that silently overwrites yesterday's belief.

Those documents can reference each other, GROQ can traverse them, an App can interpret them, and Functions can react to them without first flattening the model into whatever happens to be true today. The places where I have struggled have mostly been around finding the current path through a fast-moving platform, particularly where my application does not look like the introductory examples.

That is useful friction to find because Cellar was never really about tracking wine. It was about asking a content system a harder question: **not just what do you know, but what did you know then?**

Five days in, Sanity has turned out to be a surprisingly interesting place to ask it.
