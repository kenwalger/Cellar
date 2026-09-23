/**
 * Puts one proposed assessment into a non-production dataset, so the review
 * workflow can be exercised before the agent that will normally create them
 * exists.
 *
 * **The claim this writes is a hand-written stand-in for an agent.** No model
 * read anything. The window, the confidence and the note below are constants
 * chosen by a person from the tasting note, and they sit where Stage 4b's
 * Agent Actions Prompt response will sit. Everything around them — which wine,
 * which consumption, what `assessedAt` is, and the fact that `reviewState` is
 * `proposed` — is derived here exactly as 4b will derive it, so what this
 * script exercises is the real pipeline with the model replaced by a literal.
 *
 * It carries `sourceMethod: 'extracted'` even though nothing extracted it. The
 * field records what the document *stands for*, and a stand-in that claimed to
 * be hand-authored would be the one field in the record that lied. ADR 0012
 * exists so that an accepted proposal can be told apart from a claim the owner
 * wrote; a test fixture that opts out of that defeats the thing it is testing.
 *
 * This script writes no dataset. It generates the document, checks it against
 * the rules the schema would apply if the Studio were doing the writing, and
 * prints the one command that performs the write. Two reasons: `sanity
 * documents create` uses the CLI's own login, so no API token has to be minted
 * or stored anywhere; and the write stays in your hands, which is the same
 * split this repository already uses for git.
 *
 * Usage, from the repository root:
 *
 *   node studio/scripts/seed-proposed-assessment.mts staging
 *   npx sanity documents create studio/scripts/proposed-assessment.json --dataset staging
 *
 * Refuses to name `production` as a target. Removing that guard is not the way
 * to make a production proposal; the agent is.
 */

import {readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {addDays, isIsoDate, normalizeWindowBound, toUtcDate, wineDisplayName} from '@cellar/core'

// --- the stand-in -----------------------------------------------------------

/**
 * The consumption whose note the claim comes from.
 *
 * Chosen so that accepting the proposal is visible on the screen you land on
 * rather than one you have to navigate to. Its wine has five bottles reading
 * DRINKING today, and all five are in Drink Soon.
 */
const CONSUMPTION_ID = 'con-farm-on-golden-hill-rose-2024-b'

/**
 * What the model would have returned, written by hand.
 *
 * The note is "Flat. Too old for a rose.", recorded on 7 July 2025 against a
 * 2024 vintage. A rosé already flat that summer had closed before the summer
 * began, and windows are stated in whole years, so the last year the note
 * supports is 2024 — the year of the vintage. `drinkFrom` is that year too:
 * rosé is drunk on release and nothing in the note suggests it was ever held
 * deliberately.
 *
 * Stated as years, not dates, because that is how the claim was made and
 * because `normalizeWindowBound` is then the only thing that decides what
 * January and December mean. The same function the ledger import used.
 */
const MODEL_OUTPUT = {
  supportsWindow: true,
  drinkFromYear: 2024,
  drinkUntilYear: 2024,
  confidence: 'high',
  notes:
    'Extracted from the tasting note "Flat. Too old for a rose." recorded 7 July 2025. ' +
    'A 2024 rose already flat that summer had closed before it; the window ends with 2024.',
} as const

// --- derivation, exactly as Stage 4b will do it -----------------------------

const target = process.argv[2]

if (!target) {
  console.error('Usage: node studio/scripts/seed-proposed-assessment.mts <dataset>')
  process.exit(1)
}

if (target === 'production') {
  console.error(
    'Refusing to target production.\n' +
      '\n' +
      'This script exists to rehearse the review workflow somewhere other than\n' +
      'the real cellar. A proposed assessment in production should come from the\n' +
      'agent, which records honestly that a model wrote it.',
  )
  process.exit(1)
}

const NDJSON = join(import.meta.dirname, '..', '..', 'sample_data', 'cellar.ndjson')

type Doc = Record<string, unknown> & {_id: string; _type: string}

const docs: Doc[] = readFileSync(NDJSON, 'utf8')
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((line) => JSON.parse(line) as Doc)

function byId(id: string): Doc {
  const doc = docs.find((candidate) => candidate._id === id)
  if (!doc) throw new Error(`${id} is not in the seed data`)
  return doc
}

function refTo(value: unknown): string {
  const target = (value as {_ref?: unknown} | null)?._ref
  if (typeof target !== 'string') throw new Error('expected a reference')
  return target
}

const consumption = byId(CONSUMPTION_ID)
const bottle = byId(refTo(consumption.bottle))
const wineId = refTo(bottle.wine)

/**
 * The day after the bottle was opened, following the convention the 38
 * hand-written derived assessments in the ledger already use.
 *
 * Not the same day, and the reason is not cosmetic. Window resolution is
 * `assessedAt <= T`, and a consumption's verdict resolves the window as of
 * `consumedAt`. A claim dated the same day would therefore be visible to the
 * verdict on the very bottle its note came from, and the verdict would agree
 * with the note because it *is* the note — the check stops being a check and
 * becomes a restatement. Dated the day after, the claim is invisible to that
 * bottle and visible to every one opened later, which is what "you open a
 * bottle, write a note, and it changes the window on the bottles still in the
 * rack" actually means.
 */
const consumedOn = toUtcDate(String(consumption.consumedAt))
const assessedAt = addDays(consumedOn, 1)

const document = {
  // Deterministic, so a second run collides instead of quietly proposing the
  // same window twice, and so every agent-written claim can be found and
  // removed with one id pattern.
  _id: `assess-agent-${CONSUMPTION_ID}`,
  _type: 'assessment',
  wine: {_type: 'reference', _ref: wineId},
  // Whose claim it is. The observation is the cellar owner's; a model only
  // transcribed it, and that is what sourceMethod records instead.
  sourceType: 'personal',
  sourceName: 'me',
  assessedAt,
  drinkFrom: normalizeWindowBound(MODEL_OUTPUT.drinkFromYear, 'from'),
  drinkUntil: normalizeWindowBound(MODEL_OUTPUT.drinkUntilYear, 'until'),
  confidence: MODEL_OUTPUT.confidence,
  notes: MODEL_OUTPUT.notes,
  derivedFrom: {_type: 'reference', _ref: CONSUMPTION_ID},
  sourceMethod: 'extracted',
  // Never 'accepted', and never assembled from anything the model returned.
  // A person decides (ADR 0011).
  reviewState: 'proposed',
} as const

// --- the checks the Content Lake will not do for us -------------------------

/**
 * Schema validation runs in the Studio and nowhere else. `documents create`
 * goes through the API, so every rule in `content-model.md` is this script's
 * responsibility — the same position Stage 4b's agent is in, and the reason
 * both validate before writing rather than after.
 */
const problems: string[] = []

if (!MODEL_OUTPUT.supportsWindow) problems.push('the stand-in abstained; there is nothing to write')
if (!isIsoDate(document.assessedAt)) problems.push('assessedAt is not an ISO date')
if (!isIsoDate(document.drinkFrom)) problems.push('drinkFrom is not an ISO date')
if (!isIsoDate(document.drinkUntil)) problems.push('drinkUntil is not an ISO date')
if (document.drinkUntil < document.drinkFrom) problems.push('drinkUntil precedes drinkFrom')
if (document.assessedAt > new Date().toISOString().slice(0, 10)) {
  problems.push('assessedAt is in the future')
}
if (!['low', 'medium', 'high'].includes(document.confidence)) {
  problems.push(`confidence "${document.confidence}" is not one of low, medium, high`)
}
if (document.reviewState !== 'proposed') problems.push('reviewState must be proposed')
if (docs.some((doc) => doc._id === document._id)) {
  problems.push(`${document._id} already exists in the seed data`)
}

if (problems.length > 0) {
  console.error('Refusing to write. The document fails checks the schema would have applied:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

// --- output -----------------------------------------------------------------

const outPath = join(import.meta.dirname, 'proposed-assessment.json')
writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')

const wine = byId(wineId)
// The same composition the Studio, the App and every Function use, so the name
// printed here is the name you will be looking for on screen.
const wineName = wineDisplayName({
  title: wine.title as string | null,
  cuvee: wine.cuvee as string | null,
  vintageYear: wine.vintageYear as number | null,
  producerName: byId(refTo(wine.producer)).name as string | null,
})

console.log(`Hand-written stand-in for an agent proposal. Nothing was written to ${target}.\n`)
console.log(`  wine          ${wineName} (${wineId})`)
console.log(`  from note     "${consumption.tastingNote}"`)
console.log(`  opened        ${consumedOn}`)
console.log(`  assessedAt    ${assessedAt}  (the day after, deliberately)`)
console.log(`  window        ${document.drinkFrom} to ${document.drinkUntil}`)
console.log(`  tier          ${document.sourceType}, ${document.sourceName}`)
console.log(`  method        ${document.sourceMethod}  (stands in for one; no model ran)`)
console.log(`  reviewState   ${document.reviewState}`)
console.log(`\nWritten to ${outPath}\n`)
console.log('To put it in the dataset:\n')
console.log(`  npx sanity documents create ${outPath} --dataset ${target}\n`)
console.log("Expected, at today's date, before you accept anything:")
console.log('  every count unchanged. A proposed claim resolves nothing.')
console.log('\nExpected after Accept:')
console.log('  Cellar health   DRINKING 166 -> 161, PAST_WINDOW 33 -> 38')
console.log('  Drink Soon      23 bottles / 12 wines -> 18 / 11')
console.log(`  the row for ${wineName} leaves Drink Soon entirely`)
console.log('\nExpected after Reject instead: the numbers above, unchanged from the baseline.')
