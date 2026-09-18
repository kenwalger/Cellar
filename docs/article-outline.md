# Article outline

**Working title:** Your Content Has a Drinking Window

**Spine:** Do not store only what is true now when your application may need
to know what was true then.

**Structural decision:** the content architecture argument is signalled early,
not sprung at the end. The title already gives it away, and a reader who
arrives expecting an argument and gets eight sections of wine will leave. The
escalation at the end is the dependency turn, not the reveal.

## 1. The cellar problem

Concrete and specific. A rack of bottles being deliberately not drunk. The
question that makes it a data problem: which of these am I about to lose.

Establish early, in one line, that this is a content architecture problem
wearing a wine label. Then go back to the wine and mean it.

## 2. The field that lies

`drinkUntil` looks like a property of a wine. It is not. It is a claim, made
by someone, on a date, from a position of some authority, and it gets revised.

Show the naive schema. Show what breaks. The producer says 2030, a critic says
2032, you taste it in 2028 and think 2029. A single field forces you to
destroy two of those three.

## 3. Claims as documents

The assessment document. Nothing overwrites anything. The window becomes a
query rather than a value.

First payoff: the UI can say where a window came from. "Window based on three
assessments, most recent personal, May 2026."

## 4. Whose claim wins

Recency is not sufficient. Authority is part of the data model, and stating
the resolution rule is a design decision rather than an implementation detail.

This is the section that transfers most directly to content operations, and
it is worth flagging that here rather than saving it.

## 5. Events, not status

The second thing that looks like a property and is not: a bottle's status.
Store the status and the cellar can only ever tell you about today.

Acquisition and consumption as events. State as a function of the log.
The rule: every projection must be reproducible from events alone.

## 6. What that buys

The asOf control. The screenshot from March 2023. Eight bottles at peak, two
opened, three now past window.

Then the verdict subtlety: the window resolved as of the moment of drinking,
not as of today. You were right at the time. This is the part that is hard to
get any other way and it is the strongest moment in the piece.

## 7. The same problem, without the wine

The mapping, stated compactly rather than laboured.

- Python 1.0 documentation is past window and still authoritative about
  Python 1.0. Past window is not the same as wrong.
- 2.7 aged far past its window because the world stayed put around it.
- 3.15 documentation may not be ready yet.
- Archived is a state, not a deletion queue. Treating past-window content as
  garbage is how organizations lose their own history.
- A modified timestamp records when somebody touched a document. It does not
  record when the document stopped being true.

That last line is the one to build the section around.

## 8. Where the metaphor breaks

This is the escalation, and the reason the piece exists.

Wine decay is intrinsic and roughly predictable at bottling. Content decay is
not. A tutorial accurate yesterday becomes wrong at 9:01 this morning because
an authentication API three hops away shipped a new major version. Nothing
happened to the document.

So content staleness is not a date problem. It is a dependency problem.

## 9. Staleness as a query

If the model knows `dependsOn` and `supersedes`, the audit changes shape.

Not: find everything older than twelve months.
Instead: show every published document whose dependencies have changed since
its last assessment.

Close by pointing back at the cellar's own architecture. The graph was the
reason for the platform choice.

## 10. Coda

One line noting that the prescriptive version, what a dependency-aware content
model actually looks like in practice, is the follow-up piece.

## Notes on execution

- The wine has to be real enough to carry six sections. Actual bottles, actual
  windows, actual regret. Fictionalized cellar, but written like someone who
  has one.
- Resist explaining event sourcing. Readers who know it do not need it, and
  readers who do not will follow the cellar perfectly well without the term.
- The word "only" in the spine sentence needs a paragraph of its own
  somewhere. Most systems should store current state. The interesting part is
  knowing when they should not.
- Screenshots carry more weight than code blocks here. One schema excerpt, one
  query, and otherwise show the application.
