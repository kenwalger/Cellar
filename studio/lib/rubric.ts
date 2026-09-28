/**
 * The twelve-note rubric.
 *
 * The model's output is not deterministic, so "is the window right" cannot be
 * asserted. The *direction* can. A note saying the wine was past its best must
 * produce a window that closes before the year it was opened, whatever years it
 * picks — and that is a mechanical check on a non-deterministic reply.
 *
 * Twelve of the 38 distinct notes in the dataset, three per category, chosen so
 * each category contains an easy case and a harder one. Every note here is real
 * and appears verbatim in `sample_data/ledger.csv`.
 *
 * What is deliberately *not* here is as important. Six notes sit on the
 * boundary — "Settling down nicely", "Surprisingly good for what it cost",
 * "Impatient. Worth it anyway", "Fading. Drink the rest soon", "Honeyed now.
 * Turning the corner but lovely", "Opened on the deck before it was ready" —
 * and reasonable readers disagree about them. Putting them in the rubric would
 * turn a judgement call into a failing test. They are listed at the bottom as
 * the cases to read rather than assert.
 */

export type Direction = 'closes-before' | 'contains' | 'opens-after' | 'abstain'

export interface RubricCase {
  note: string
  expect: Direction
  /** Why this note belongs in this category, in the terms the rules use. */
  because: string
}

export const RUBRIC: RubricCase[] = [
  // Past its best: the window closed before the year it was opened.
  {
    note: 'Dried out. Held it too long.',
    expect: 'closes-before',
    because: '"held it too long" states the error directly',
  },
  {
    note: 'Flat. Too old for a rose.',
    expect: 'closes-before',
    because: '"too old" is explicit; the least ambiguous note in the dataset',
  },
  {
    note: 'Should have listened to myself. Thin and drying. Three left.',
    expect: 'closes-before',
    because: '"thin and drying" with regret; harder, because the signal is in the tasting terms',
  },

  // At peak: the window contains the year it was opened.
  {
    note: 'Much better. Blackberry, soft tannin. This is the peak.',
    expect: 'contains',
    because: 'says "the peak" in as many words',
  },
  {
    note: 'Silky. Drinking well right now.',
    expect: 'contains',
    because: '"right now" anchors the window to the opening date',
  },
  {
    note: 'Great acid. Held up better than expected.',
    expect: 'contains',
    because: 'still good, harder: "held up" could be misread as past-peak',
  },

  // Too young: the window opens after the year it was opened.
  {
    note: 'Opened too young. Fruit is there, structure is not resolved.',
    expect: 'opens-after',
    because: '"too young" is explicit',
  },
  {
    note: 'Structured. Could have waited another two years.',
    expect: 'opens-after',
    because: 'names the interval it should have waited',
  },
  {
    note: 'Red cherry, forest floor, fine tannin. Still tight.',
    expect: 'opens-after',
    because: '"still tight" is the signal; harder, because it is one word among tasting terms',
  },

  // No timing signal at all: abstain, and write nothing.
  {
    note: 'Pear and citrus. Crisp.',
    expect: 'abstain',
    because: 'flavour only',
  },
  {
    note: 'Needed a bottle for dinner and this was in front.',
    expect: 'abstain',
    because: 'occasion only; says nothing about the wine',
  },
  {
    note: 'Grocery store cab doing grocery store cab things.',
    expect: 'abstain',
    because: 'a judgement about quality, not about timing; the trap is that it sounds dismissive',
  },
]

/**
 * Borderline notes, for reading rather than asserting.
 *
 * Each of these could defensibly be classified two ways, and where the abstain
 * line falls on them is the most interesting thing a person can learn from a
 * rubric run. Recorded so that a run reports on them without failing on them.
 */
export const BORDERLINE: string[] = [
  'Settling down nicely.',
  'Surprisingly good for what it cost.',
  'Impatient. Worth it anyway.',
  'Fading. Drink the rest soon.',
  'Honeyed now. Turning the corner but lovely.',
  'Opened on the deck before it was ready. Grapey, a little raw.',
]

export interface DirectionCheck {
  actual: Direction
  passed: boolean
}

/**
 * Classifies what the model actually produced, so it can be compared with the
 * category the note was filed under.
 *
 * The comparison is against the *year the bottle was opened*, which is the only
 * fixed point the note and the window share.
 */
export function directionOf(
  output: {supportsWindow: boolean; drinkFromYear?: number; drinkUntilYear?: number},
  openedYear: number,
): Direction {
  if (!output.supportsWindow) return 'abstain'
  const from = output.drinkFromYear as number
  const until = output.drinkUntilYear as number
  if (until < openedYear) return 'closes-before'
  if (from > openedYear) return 'opens-after'
  return 'contains'
}
