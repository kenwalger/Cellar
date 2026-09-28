/**
 * The agent, checked without the model.
 *
 * Every assertion here holds for *any* reply, which is the point. The model's
 * four-key JSON is the only non-deterministic thing in this feature; the
 * validator, the field assignments, the id and `assessedAt` are not, and they
 * are where the claims that matter live — that the agent can never create an
 * accepted assessment, that an abstention writes nothing, and that a reply
 * which would produce an invalid document is refused before anything is
 * written.
 *
 * Run with `npm test --workspace cellar-studio`. No network, no credits.
 */

import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {
  MAX_YEAR,
  MIN_YEAR,
  buildInstruction,
  buildProposal,
  parseModelOutput,
  proposalId,
  validateProposal,
  type ModelOutput,
} from '../lib/agentProposal.ts'
import {RUBRIC, directionOf} from '../lib/rubric.ts'

const SOURCE = {
  consumptionId: 'con-farm-on-golden-hill-rose-2024-b',
  consumedAt: '2025-07-07T12:00:00Z',
  wineId: 'farm-on-golden-hill-rose-2024',
}

const GOOD: ModelOutput = {
  supportsWindow: true,
  drinkFromYear: 2024,
  drinkUntilYear: 2024,
  confidence: 'high',
  notes: 'A 2024 rose already flat the following summer had closed before it.',
}

const TODAY = '2026-09-28'

describe('what the system fixes, whatever the model says', () => {
  const doc = buildProposal(SOURCE, GOOD)

  it('never creates an accepted assessment', () => {
    assert.equal(doc.reviewState, 'proposed')
  })

  /**
   * The strongest form of that claim: `reviewState` is a literal in the
   * source, so no reply can reach it. Asserted by feeding the model output a
   * `reviewState` of its own and checking it is discarded.
   */
  it('discards a review state the model tries to supply', () => {
    const parsed = parseModelOutput({...GOOD, reviewState: 'accepted'})
    assert.ok(parsed.ok)
    assert.ok(!('reviewState' in parsed.value), 'an unknown key survived parsing')
    assert.equal(buildProposal(SOURCE, parsed.value as ModelOutput).reviewState, 'proposed')
  })

  it('records both whose claim it is and who did the typing', () => {
    assert.equal(doc.sourceType, 'personal')
    assert.equal(doc.sourceName, 'me')
    assert.equal(doc.sourceMethod, 'extracted')
  })

  it('points at the wine and the note it came from', () => {
    assert.equal(doc.wine._ref, SOURCE.wineId)
    assert.equal(doc.derivedFrom._ref, SOURCE.consumptionId)
  })

  it('uses a deterministic id, so a second run collides rather than duplicates', () => {
    assert.equal(doc._id, proposalId(SOURCE.consumptionId))
    assert.equal(doc._id, buildProposal(SOURCE, GOOD)._id)
  })

  /**
   * The convention that keeps the verdict a check rather than a restatement.
   * Resolution is `assessedAt <= T` and a verdict resolves as of `consumedAt`,
   * so a claim dated the same day would be visible to the verdict on the very
   * bottle its note came from.
   */
  it('dates the claim the day after the bottle was opened', () => {
    assert.equal(doc.assessedAt, '2025-07-08')
    assert.ok(doc.assessedAt > '2025-07-07', 'the claim is visible to its own source bottle')
  })

  it('normalizes years to whole-year bounds', () => {
    assert.equal(doc.drinkFrom, '2024-01-01')
    assert.equal(doc.drinkUntil, '2024-12-31')
  })
})

describe('abstention writes nothing at all', () => {
  it('parses an abstention without demanding a window', () => {
    const parsed = parseModelOutput({supportsWindow: false, notes: 'flavour only'})
    assert.ok(parsed.ok)
    assert.equal(parsed.value.supportsWindow, false)
    assert.equal(parsed.value.drinkFromYear, undefined)
  })

  /**
   * Not "a proposal with empty bounds". The schema requires both, so a
   * boundless proposal could never be accepted, and a claim nobody can act on
   * is noise in the review queue. `buildProposal` refuses rather than
   * producing one.
   */
  it('refuses to build a document from an abstention', () => {
    assert.throws(() => buildProposal(SOURCE, {supportsWindow: false}), /nothing should be written/)
  })

  it('drops a window the model supplied alongside an abstention', () => {
    const parsed = parseModelOutput({supportsWindow: false, drinkFromYear: 2020})
    assert.ok(parsed.ok)
    assert.equal(parsed.value.drinkFromYear, undefined, 'a contradictory window survived')
  })
})

describe('replies that cannot be used are refused before anything is written', () => {
  const unusable: [string, unknown][] = [
    ['not an object', 'sorry, I cannot help with that'],
    ['an array', [2020, 2026]],
    ['null', null],
    ['no supportsWindow', {drinkFromYear: 2020, drinkUntilYear: 2026}],
    ['supportsWindow as a string', {supportsWindow: 'true'}],
    ['missing both years', {supportsWindow: true}],
    ['a fractional year', {supportsWindow: true, drinkFromYear: 2020.5, drinkUntilYear: 2026}],
    ['years as strings', {supportsWindow: true, drinkFromYear: '2020', drinkUntilYear: '2026'}],
    ['until before from', {supportsWindow: true, drinkFromYear: 2026, drinkUntilYear: 2020}],
    [
      'a year below the floor',
      {supportsWindow: true, drinkFromYear: MIN_YEAR - 1, drinkUntilYear: 2026},
    ],
    [
      'a year above the ceiling',
      {supportsWindow: true, drinkFromYear: 2020, drinkUntilYear: MAX_YEAR + 1},
    ],
    [
      'an invented confidence',
      {supportsWindow: true, drinkFromYear: 2020, drinkUntilYear: 2026, confidence: 'certain'},
    ],
  ]

  for (const [name, reply] of unusable) {
    it(`refuses ${name}`, () => {
      const parsed = parseModelOutput(reply)
      assert.equal(parsed.ok, false, `${name} was accepted`)
      if (!parsed.ok) assert.ok(parsed.problems.length > 0, 'refused without saying why')
    })
  }

  /**
   * The companion assertion. Without it, every test above is satisfied by a
   * parser that refuses everything, which is indistinguishable from one that
   * validates correctly.
   */
  it('accepts a well-formed reply, so the refusals above mean something', () => {
    const parsed = parseModelOutput({
      supportsWindow: true,
      drinkFromYear: 2020,
      drinkUntilYear: 2026,
      confidence: 'medium',
      notes: 'still tight',
    })
    assert.ok(parsed.ok, 'a valid reply was refused')
    assert.equal(parsed.value.drinkFromYear, 2020)
    assert.equal(parsed.value.confidence, 'medium')
  })

  it('accepts a reply that omits the optional keys', () => {
    const parsed = parseModelOutput({
      supportsWindow: true,
      drinkFromYear: 2020,
      drinkUntilYear: 2026,
    })
    assert.ok(parsed.ok)
    assert.equal(parsed.value.confidence, undefined)
    assert.equal(parsed.value.notes, undefined)
  })
})

describe('the checks the Content Lake will not make', () => {
  it('passes a document built from a good reply', () => {
    assert.deepEqual(validateProposal(buildProposal(SOURCE, GOOD), TODAY), [])
  })

  it('catches a claim dated in the future', () => {
    const future = buildProposal({...SOURCE, consumedAt: '2030-01-01'}, GOOD)
    assert.ok(
      validateProposal(future, TODAY).some((p) => p.includes('in the future')),
      'a claim from a bottle opened in 2030 was accepted',
    )
  })

  it('catches bounds that are not whole-year', () => {
    const doc = {...buildProposal(SOURCE, GOOD), drinkUntil: '2024-06-30'}
    assert.ok(validateProposal(doc, TODAY).some((p) => p.includes('31 December')))
  })

  it('catches a review state that is not proposed', () => {
    const doc = {...buildProposal(SOURCE, GOOD), reviewState: 'accepted' as const}
    assert.ok(validateProposal(doc as never, TODAY).some((p) => p.includes('must be proposed')))
  })
})

describe('the instruction', () => {
  const instruction = buildInstruction({
    tastingNote: 'Flat. Too old for a rose.',
    consumedAt: '2025-07-07T12:00:00Z',
    wineName: '2024 Farm on Golden Hill Rose',
    vintageYear: 2024,
  })

  it('carries the note, the wine, the vintage and the date opened', () => {
    assert.match(instruction, /Flat\. Too old for a rose\./)
    assert.match(instruction, /2024 Farm on Golden Hill Rose/)
    assert.match(instruction, /Vintage year: 2024/)
    assert.match(instruction, /Opened on: 2025-07-07/)
  })

  /**
   * The withholding, asserted rather than trusted to a comment. An assessment
   * is an independent claim, and an instruction that leaked the incumbent
   * window would make a plausible reply indistinguishable from mimicry.
   */
  it('withholds the currently resolved window', () => {
    assert.doesNotMatch(instruction, /resolved|current window|existing (claim|window)/i)
  })

  it('forbids outside knowledge, because the claim is attributed to the owner', () => {
    assert.match(instruction, /Do not use any outside knowledge/)
  })

  it('names JSON, which format: json requires in the instruction text', () => {
    assert.match(instruction, /JSON/)
  })
})

describe('the rubric', () => {
  it('covers all four directions, three notes each', () => {
    const counts = new Map<string, number>()
    for (const c of RUBRIC) counts.set(c.expect, (counts.get(c.expect) ?? 0) + 1)
    assert.deepEqual([...counts.entries()].sort(), [
      ['abstain', 3],
      ['closes-before', 3],
      ['contains', 3],
      ['opens-after', 3],
    ])
  })

  /** The classifier is pure, so it is checked here rather than against credits. */
  it('classifies a window against the year the bottle was opened', () => {
    assert.equal(directionOf({supportsWindow: false}, 2024), 'abstain')
    assert.equal(
      directionOf({supportsWindow: true, drinkFromYear: 2019, drinkUntilYear: 2022}, 2024),
      'closes-before',
    )
    assert.equal(
      directionOf({supportsWindow: true, drinkFromYear: 2026, drinkUntilYear: 2030}, 2024),
      'opens-after',
    )
    assert.equal(
      directionOf({supportsWindow: true, drinkFromYear: 2022, drinkUntilYear: 2026}, 2024),
      'contains',
    )
  })

  /** A window ending in the year it was opened contains it; the bound is inclusive. */
  it('treats the opened year itself as contained at both bounds', () => {
    assert.equal(
      directionOf({supportsWindow: true, drinkFromYear: 2020, drinkUntilYear: 2024}, 2024),
      'contains',
    )
    assert.equal(
      directionOf({supportsWindow: true, drinkFromYear: 2024, drinkUntilYear: 2030}, 2024),
      'contains',
    )
  })
})
