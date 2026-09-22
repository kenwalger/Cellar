I Built a Wine Cellar That Can Remember the Past

What I learned building a temporal content system with Sanity, Claude Code, and a specification written before either of them touched the project.

Most wine cellar applications answer a question that sounds simple:

What wine do I have right now?

I wanted to answer a different one.

What did my cellar look like on June 1, 1999?

And then another:

What will happen to the bottles I own today if I don't open any of them for another nine years?

Those questions change the architecture.

If a bottle has a status field containing consumed, I can tell you what is true now. I cannot necessarily tell you whether that bottle was still in the cellar in 2004. If a wine has a single drinkUntil field, I can tell you what someone currently thinks its drinking window is. I cannot tell you what they thought the window was five years ago, before another tasting changed their mind.

That led to the design rule behind Cellar:

Do not store what is true now when you may later need to know what was true then.

Cellar is my entry for the DEV Community Sanity Challenge. It models a fictional wine collection as an event ledger: bottles exist, acquisitions bring them into the cellar, consumptions take them out, and assessments make dated claims about when a wine should be opened.

The interesting part is that those claims can change.

The application can therefore move through time without restoring database snapshots. Set the date to June 1, 1999 and only four bottles are in the cellar. Move it to September 22, 2026 and 248 remain. Project forward to July 23, 2035, assuming nothing else happens, and the same 248 bottles are physically present, but 182 have moved past their drinking windows.

The cellar did not lose bottles.

It lost opportunities.

That turned out to be a useful way to learn Sanity.

It also turned into an experiment about building software with an AI coding agent when the specification exists before the code.

The architecture came first

I did something slightly unusual for a challenge project: I wrote a lot before I built anything.

Cellar entered implementation with fourteen planning documents, including a content model, temporal-resolution specification, build plan, seed-data plan, and a collection of architecture decision records. I also started a friction log before learning much about Sanity, because confusion is difficult to reconstruct once you understand the thing that confused you.

The friction log has one important rule:

Record what you expected before recording what happened.

"It did X" is useful.

"I expected Y and it did X" tells you something about the developer's mental model, the platform, or the documentation.

The log also records what would have prevented each problem. That matters because there is a considerable difference between documenting platform friction and compiling a list of complaints.

The project itself uses six primary document types:

producer
wine
bottle
acquisition
consumption
assessment

Acquisition and consumption are documents rather than mutable fields on a bottle. Assessments are also documents rather than fields on a wine.

That is what makes time travel possible.

A bottle is not "consumed" because a status field says so. It is consumed as of date T if a consumption event exists on or before T.

A drinking window is not whatever happens to be stored on the wine today. It is resolved from the assessments that existed at T, using explicit authority and recency rules.

That distinction became the foundation for everything that followed.

Stage 1: when the specification was wrong

My first substantial Claude Code prompt did not say "build the schemas."

It effectively said:

Read the specifications. Compare them with the current Sanity schema API. Tell me where they disagree. Do not write code until I approve the resolution.

That turned out to be one of the best decisions in the project.

Before writing a schema, the model found several places where my specification could not be implemented as written.

For example, I had proposed underscore-prefixed projection fields. Sanity reserves underscore-prefixed field names for system fields. I had also specified a validation rule requiring an assessment with derivedFrom to have been created in the proposed state. Sanity's document validation sees the current document, not its creation-time state, so implementing that literally would have made the later proposed-to-accepted workflow invalid. A cross-document uniqueness requirement also did not map cleanly to declarative schema validation.

The specifications were wrong.

That was not evidence that writing them had been wasted effort.

It was almost the opposite.

Because the assumptions were written down, the model had something concrete to challenge. Without the specification, those same assumptions could easily have disappeared into implementation decisions and become much harder to notice.

By the end of Stage 1, the generated seed dataset contained:

8 producers
98 wines
542 bottles
542 acquisitions
294 consumptions
161 assessments
1,645 documents total

Sanity imported all 1,645 documents in a little over eight seconds, including reference strengthening.

And this is where Sanity first started to shine.

Where Sanity clicked: content as a graph

A cellar could have been a relational database.

There is nothing here that fundamentally requires a content platform.

But once the documents were in the Content Lake, the model stopped feeling like six collections of JSON and started feeling like a graph.

A consumption references a bottle. The bottle references a wine. The wine references a producer. A later personal assessment can reference the consumption from which that assessment was derived.

One GROQ query can walk that chain.

In the seed data, two reassessments of Château Mouton Rothschild trace back to the exact bottles opened the day before. The 1996 assessment points to the bottle consumed on November 9, 1996. Another assessment in 1999 points to a different bottle opened the previous day. Thirty years of provenance is traversable without application-side joins.

That is one of the places where Sanity makes something easy that would be considerably more work in a conventional content stack.

The individual pieces are not exotic. A database can store references. An API can expose them. A frontend can join the results. A CMS can provide an editor.

Sanity gives me the structured documents, references, authoring environment, query language, API, and application surface around the same Content Lake.

For this project, that means the content graph is not an export from the CMS that my application then has to reinterpret. It is the content model.

GROQ also fits this kind of traversal unusually well. I can start with a consumption and project through bottle, wine, and producer in the query itself rather than building a series of REST requests or an application-side join layer.

There is a downside to that flexibility: GROQ can fail quietly. Misspell a projected field and null may be the answer rather than an error. Draft perspective also matters; unless the query is deliberately pinned to published content, unpublished documents can enter results. Both became rules in Cellar rather than assumptions left to individual callers.

The querying experience itself was strong.

Discovering the querying experience was less so.

Sanity Studio includes Vision, a very useful place to run GROQ directly against the dataset. Nothing in my initial onboarding path told me it existed. I discovered the tool when I needed to verify the import. Likewise, imported documents do not receive the same Studio validation simply because they entered the dataset through sanity dataset import, an important distinction when using generated seed data.

Those are fixable documentation and onboarding problems around something that is genuinely useful once found.

Stage 2: specifications need witnesses

The hard part of Cellar was never storing bottles.

It was resolving time.

I moved that logic into a pure TypeScript package called @cellar/core. It knows nothing about React, the Sanity client, network access, or the system clock. Give it a snapshot and an asOf date and it can answer questions such as:

Had this bottle been acquired yet?
Had it been consumed?
Which assessment controlled its drinking window on this date?
Was it HOLD, DRINKING, PAST_WINDOW, UNASSESSED, CONSUMED, or NOT_YET_OWNED?
If it was consumed, was that decision reasonable based on the information available at the time?
Did the cellar miss an opportunity to open it while it was drinking well?

Before Claude Code implemented that module, I generated expected outputs independently.

The important instruction was:

Treat the expected-output table as an oracle, not output to be repaired.

If the implementation disagreed with the expected output, the model was supposed to stop and report the disagreement rather than "fix" the test fixture until everything turned green.

The result was 390 passing tests, including 353 checks against three independently generated oracle datasets. The oracle-backed implementation passed on its first run.

But something more interesting happened before that.

Claude found another error in my specification.

The missed-opportunity algorithm said it only needed to evaluate certain state-change boundaries. I had omitted assessment dates.

That was wrong.

A new assessment can change the resolved drinking window without an acquisition, consumption, drinkFrom, or drinkUntil event occurring. Therefore the state can change because our knowledge changed, even though nothing happened to the physical bottle.

That distinction is the whole thesis of the project, and I had managed to leave it out of the algorithm implementing the thesis.

Again, the specification did not make the project correct.

It made the disagreement visible.

There is an important caveat here. Most of the oracles were generated from the same specification. They are strong protection against implementation mistakes, but they cannot independently prove that the specification itself is correct. The missed-opportunity oracle is somewhat stronger because it uses a different brute-force daily algorithm, but it still shares the same domain assumptions.

That distinction became another rule for the project:

Tests can tell you that the implementation disagrees with your expectations. They cannot tell you whether your expectations deserve to win.

Historical truth and current knowledge are different things

The event model creates an interesting consequence.

Suppose I opened a bottle in 2018.

At the time, the best accepted assessment said its drinking window was 2015 through 2020. Opening it in 2018 was therefore IN_WINDOW.

Then someone tastes another bottle in 2023 and concludes that the wine actually held beautifully through 2027.

Should the 2018 verdict change?

Cellar says no.

The historical verdict is resolved using the information available when the bottle was consumed. Later knowledge can tell us that the old assessment was incomplete, but it should not rewrite whether the earlier decision was reasonable given what was known then.

That is why Cellar can distinguish historical truth from verdict drift.

@cellar/core found real examples of that distinction in the generated dataset. [TODO: insert final verdict-drift figures/example once this becomes a visible view.]

This is also where the project starts becoming less about wine.

Content systems usually tell us what a record says now.

There are entire classes of systems where we need a harder answer:

What did the record say then, what evidence supported it, and when did our understanding change?

Stage 3: crossing into the App SDK

The next gate was deliberately narrow.

I did not ask Claude to build the application.

I asked it to prove this path:

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

The verification date was frozen at September 18, 2026.

The expected state was known before the view existed:

Hold              45
Drinking         166
Past window       33
Unassessed         4
Consumed         294
Total             542

Claude could query the data and run the tests, but it could not see my browser. The gate therefore explicitly prohibited it from declaring success.

It built the view, gave me the URL and expected values, and stopped.

I confirmed the six rendered numbers myself.

Every one matched an independent check.py implementation written three days earlier using a different method.

Only then did the project move forward.

This is where Sanity became particularly interesting

The App SDK let the application live inside Sanity while consuming the same Content Lake as Studio.

More importantly, useQuery can subscribe to the underlying query. An accepted assessment can change the content graph and the application can react to that change without me building a separate synchronization layer.

That is another answer to the question, "What can I do easily with Sanity that would be challenging elsewhere?"

Again, none of the individual capabilities is impossible elsewhere.

I could assemble:

a database,
an authoring interface,
an API,
subscriptions or change-data capture,
an application shell,
authorization between them,
deployment infrastructure,
and glue code keeping the models aligned.

With Sanity, those pieces share a content substrate.

For Cellar, that is more important than any single feature.

The Studio edits the graph. The App SDK reads the graph. GROQ traverses the graph. Functions can react to changes in the graph. The pure domain package determines what those changes mean.

That separation has held up remarkably well.

The App SDK documentation was the roughest part

The App SDK itself worked.

Learning the current App SDK was considerably harder than it needed to be.

Three examples appeared in one session.

First, Sanity's own agent guidance supplied a CLI command containing --skip-mcp. The installed CLI did not support that option; the actual flag was --no-mcp.

Second, the App SDK quickstart referenced an app-quickstart template that worked, but the CLI reference did not list it among the available templates.

Third, that official template installed App SDK 2.20.2 while the current SDK was 3.4.0. The reference documentation I was being directed toward described the newer major version.

The harder problem was not any one stale page. It was a recurring documentation shape.

The recommended path was well documented for the common case: render and edit documents.

Cellar was building an aggregate.

The guidance steered toward useDocuments and useDocumentProjection, while the architecture needed one useQuery over the cellar snapshot. Following the recommended shape would have meant roughly 1,500 hook instances and round trips to derive six numbers instead of executing the single query the architecture had been designed around.

Similarly, the guidance correctly warned against putting Content Lake field values into React useState, but did not clearly distinguish those values from ephemeral view state such as Cellar's asOf date.

The problem was not that the guidance was wrong.

It was that once I stepped outside the shape of the example application, it became difficult to tell the difference between:

not recommended, not documented, and not supported.

That is an important distinction for an SDK intended to support applications beyond the examples used to introduce it.

Then the cellar started moving through time

Once the App SDK gate passed, the next feature was the one I had wanted to see from the beginning: the asOf control.

It is both a date input and a slider.

Move backward and acquisitions disappear. Consumptions reverse. Assessments cease to exist before the date on which they were made. Drinking windows change as the controlling assessment changes.

Move forward and unopened bottles age through their windows.

The same 542-bottle ledger produces very different cellars:

Date	In cellar	Drinking	Past window	Not yet acquired
June 1, 1999	4	4	0	536
September 22, 2026	248	166	33	0
July 23, 2035	248	62	182	0

The future view is explicitly labeled as a projection. It assumes no future acquisitions, consumptions, or assessments.

That qualification matters.

Cellar is not predicting what my cellar will contain in 2035.

It is asking what today's ledger implies if nothing else changes.

A working demo still had bugs

The time control also produced one of my favorite findings from the project.

The date arithmetic contained a bug.

January 31 to March 1 was calculated incorrectly because the implementation borrowed days from February and silently lost the remainder.

None of the five verification dates caught it.

The application worked. The screenshots looked right. Every date I had planned to demonstrate passed.

A property test across all 17,167 possible slider positions found the problem.

That led to a useful lesson:

Demo-driven verification is not verification. It proves the paths you already walk.

The same session found a performance bug in code that had already passed the previous gate. Rebuilding the indexed cellar cost roughly 6 ms, while recalculating all 542 bottle states for a new date took only about 0.07 ms. The existing memoization rebuilt the expensive structure every time the date changed.

Measuring the two operations showed both the bug and the correct solution: memoize the structure, recompute the cheap state, and do not debounce the slider.

Without measurement, adding a debounce would have looked like sensible performance engineering.

It would also have made the demo worse.

Stage 4: sometimes the documentation cannot answer the question

One technical risk had remained open since Stage 2.

Could a Sanity Function import @cellar/core?

The repository uses npm workspaces and TypeScript. The Functions documentation described TypeScript Functions in pnpm workspaces and npm projects without TypeScript. It did not describe this combination.

Reading more documentation could not settle it.

So I stopped reading and built an experiment.

The probe used six hardcoded documents with a predetermined expected result. It was deliberately constructed so that breaking either assessment authority or accepted-only resolution would produce the wrong bottle state.

The expected result was written down before deployment.

Then the Function was deployed.

It returned exactly that result.

No package-manager migration. No bundler alias. No copied source. No transpile:false escape hatch.

More interestingly, inspecting the deployed bundle explained why.

The CLI inlined and tree-shook the local @cellar/core package while externalizing @sanity/functions and its registry dependencies into node_modules. The local package therefore only needed to be resolvable at build time. It never needed to exist in a package registry.

That was better than discovering a missing documentation paragraph.

The experiment showed that the simplified project-wide bundling model described by the documentation did not fully explain what the tool was actually doing.

And it closed the last unverified technical risk in the architecture on challenge day five.

[TODO: continue here with the real Stage 4 Functions and Agent Action once implemented.]

Where Sanity shines

Five days into the project, my strongest impression is that Sanity becomes more interesting as the content model becomes less conventional.

If Cellar were just:

Wine
title
producer
vintage
quantity
drinkUntil

I am not sure I would have learned much.

Cellar instead treats content as an evolving graph of things, events, and claims.

That plays directly to several Sanity strengths.

References are part of the content model

Acquisitions, consumptions, bottles, wines, producers, assessments, and derived evidence can remain independent documents while still being traversable as a graph.

That keeps provenance intact instead of flattening everything into the current representation of a wine.

GROQ is extremely good at asking questions of that graph

The ability to traverse references and shape the returned document in one query is a natural fit for this architecture.

I do not need an API endpoint for "historical cellar state." The application can retrieve the source facts it needs and let the deterministic domain module resolve the state.

The Content Lake is genuinely shared infrastructure

Studio is not maintaining one copy of the data while the application maintains another.

The authoring surface, application, queries, and Functions operate around the same underlying content.

That removes an entire class of synchronization problems.

The App SDK makes internal tools unusually cheap

Cellar Health is not a separate admin application with another authentication system and another deployment story. It can be a Sanity App sitting beside the content it interprets.

For applications that are partly editorial and partly operational, that is compelling.

Functions let content changes become application events

[TODO: expand after implementing the real Functions.]

The architecture already has an event model at the domain level. Being able to react to Content Lake changes without introducing another queue or webhook service should make the next stage particularly interesting.

Structured content makes the time machine possible

The most important capability is also the least flashy.

Because acquisitions, consumptions, and assessments are structured documents rather than prose buried in pages, historical state is computable.

The time slider is not replaying backups.

It is querying evidence.

Where Sanity has struggled

Most of my friction so far has not been with what Sanity can do.

It has been with discovering how Sanity currently expects me to do it.

The Studio schema system has generally been understandable once its boundaries are known. GROQ has been productive. The Content Lake has handled the model without drama. The App SDK works. The Functions bundler handled a configuration I was not sure it supported.

The rough edges have clustered around the seams:

onboarding did not surface Vision;
dataset imports bypass the validation assumptions a Studio-first developer might make;
CLI behavior changes depending on where a command is executed without always making the missing project context obvious;
App SDK guidance and templates have drifted across versions;
agent-specific guidance contained a CLI command the current CLI rejects;
supported-but-less-common patterns such as aggregate useQuery usage are much harder to distinguish from unsupported ones;
Functions documentation simplified a bundling model that turned out to be more nuanced in practice.

None of those has blocked the project.

Several cost only minutes.

But minutes are not the only useful measure of developer friction. Every undocumented branch forces a developer to decide whether they misunderstood the platform, found stale documentation, chose the wrong architecture, or encountered a real product limitation.

That uncertainty is expensive even when the eventual fix is one line.

What Sanity made easy that I would not want to build myself

This may be my most useful answer to the challenge so far.

There is almost nothing in Cellar that could not be built with other tools.

That is not the interesting comparison.

The comparison is how many tools I would have to assemble before I could concentrate on the actual problem.

For Cellar I need:

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

Sanity gives those concerns a common center.

Elsewhere, I could absolutely build the equivalent. I would probably start with a relational database, add an API, choose or build an admin interface, implement authorization, add event handling or webhooks, create a frontend, decide how live updates work, and then spend time ensuring every layer agrees about what a bottle, assessment, and consumption mean.

With Sanity, most of that plumbing already exists.

That has let me spend an unreasonable amount of time arguing about whether an assessment from 2023 should be allowed to change the historical verdict on a bottle consumed in 2018.

Which, for this project, is exactly where I want the complexity to be.

What AI actually contributed

This is a Path Two challenge entry, so there is another question I need to answer honestly:

What did the AI coding agent actually buy me?

The answer so far is not "it wrote the code faster."

It probably did.

That is also the least interesting result.

The more useful pattern has been:

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

Claude has found errors in my specifications.

It has also introduced its own bugs.

It found a date-arithmetic bug it had written. It nearly reported a Sanity type-definition problem that turned out to be its own incomplete reading of an inheritance chain. It once modified an oracle it had explicitly been told not to modify, restored it, and disclosed the mistake. It has also used mutation testing to prove that tests actually detect failures rather than merely reporting coverage.

So far, my conclusion is not that specifications make AI-generated software trustworthy.

It is:

Specifications make disagreement observable.

And independent witnesses make that disagreement useful.

Sometimes the witness is a CSV generated before implementation.

Sometimes it is a second algorithm.

Sometimes it is a property test.

Sometimes it is a benchmark.

Sometimes it is the deployed bundle.

And sometimes it is me looking at six numbers in a browser because the model cannot see them.

That is a considerably more interesting development workflow than "prompt until the tests are green."

What comes next

[TODO: update after Stage 4 and remaining build stages.]

The remaining work is intentionally narrow.

I am not adding features because the early stages finished ahead of schedule. The extra time is going into verification, the submission itself, and the demo rather than expanding scope.

The next pieces are:

[TODO: real Sanity Function/workflow]
[TODO: Agent Action turning an unstructured tasting note into a proposed structured assessment]
[TODO: remaining planned views, if still in scope]
[TODO: final polish and accessibility]
[TODO: three-minute demo]

The demo already has one sequence I know I want to keep.

Same ledger.

Different truth.

And somewhere inside those 1,645 documents is the reason why.

Final thoughts

[TODO: rewrite this section at the end of the challenge. Do not lock the conclusion yet.]

I started this project wanting to know whether Sanity was a good fit for a temporal content system.

So far, the answer is becoming more nuanced than "yes" or "no."

Sanity's strongest quality has not been making simple content simpler. It has been allowing me to make the content model more honest.

An acquisition can remain an event.

A consumption can remain an event.

An assessment can remain a dated, attributed claim rather than becoming a field that silently overwrites yesterday's belief.

Those documents can reference each other, GROQ can traverse them, an App can interpret them, and Functions can react to them without first flattening the model into whatever happens to be true today.

The places where I have struggled have mostly been around finding the current path through a fast-moving platform, particularly where my application does not look like the introductory examples.

That is useful friction to find.

Because Cellar was never really about tracking wine.

It was about asking a content system a harder question:

Not just what do you know, but what did you know then?

And, five days in, Sanity has turned out to be a surprisingly interesting place to ask it.