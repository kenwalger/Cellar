/**
 * Runs the twelve-note rubric against the live model and reports direction
 * agreement. Writes nothing.
 *
 * Costs twelve AI credits, $0.60, plus six more if `--borderline` is passed.
 * Never run in CI: it is non-deterministic and it spends money.
 *
 *   node studio/scripts/rubric.mts [--borderline]
 *
 * Needs SANITY_API_TOKEN, for the same reason the dry run does.
 *
 * What this can and cannot establish: direction is mechanically checkable and
 * is checked here. Whether the *years* are plausible, whether `notes` quotes
 * the phrase it actually relied on, and whether `confidence` is honest are
 * judgement calls, so the reply is printed in full for reading rather than
 * scored.
 */

import {createClient} from '@sanity/client'
import {buildInstruction, parseModelOutput} from '../lib/agentProposal.ts'
import {BORDERLINE, RUBRIC, directionOf, type Direction} from '../lib/rubric.ts'

const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error('SANITY_API_TOKEN is not set.')
  process.exit(1)
}

const client = createClient({
  projectId: 'aos9nze5',
  dataset: 'production',
  apiVersion: 'vX',
  token,
  useCdn: false,
})

/**
 * A fixed frame for every note, so the only thing varying between cases is the
 * note itself. Real dates, so nothing here is data the content model forbids.
 */
const OPENED_ON = '2024-06-15'
const OPENED_YEAR = 2024
const WINE_NAME = '2019 Paradis Vineyards Pinot Noir'
const VINTAGE_YEAR = 2019

async function ask(note: string) {
  const reply = await client.agent.action.prompt<Record<string, unknown>>({
    instruction: buildInstruction({
      tastingNote: note,
      consumedAt: OPENED_ON,
      wineName: WINE_NAME,
      vintageYear: VINTAGE_YEAR,
    }),
    format: 'json',
    temperature: 0,
  })
  return {reply, parsed: parseModelOutput(reply)}
}

function window(output: {drinkFromYear?: number; drinkUntilYear?: number}): string {
  return output.drinkFromYear ? `${output.drinkFromYear}–${output.drinkUntilYear}` : '—'
}

console.log(`Rubric: ${RUBRIC.length} notes, opened ${OPENED_ON}, vintage ${VINTAGE_YEAR}.`)
console.log('Direction is asserted. Years, notes and confidence are for reading.\n')

let agreed = 0
const disagreements: string[] = []

for (const testCase of RUBRIC) {
  const {reply, parsed} = await ask(testCase.note)

  if (!parsed.ok) {
    disagreements.push(`${testCase.note} — unusable reply: ${parsed.problems.join('; ')}`)
    console.log(`✖ UNUSABLE  "${testCase.note}"`)
    console.log(`            ${parsed.problems.join('; ')}\n`)
    continue
  }

  const actual: Direction = directionOf(parsed.value, OPENED_YEAR)
  const ok = actual === testCase.expect
  if (ok) agreed++
  else disagreements.push(`${testCase.note} — expected ${testCase.expect}, got ${actual}`)

  console.log(`${ok ? '✔' : '✖'} ${testCase.expect.padEnd(14)} "${testCase.note}"`)
  console.log(`            got ${actual.padEnd(14)} window ${window(parsed.value)}`)
  console.log(`            confidence ${parsed.value.confidence ?? '—'}`)
  console.log(`            says "${parsed.value.notes ?? '—'}"`)
  if (!ok) console.log(`            expected because: ${testCase.because}`)
  console.log(`            raw ${JSON.stringify(reply)}\n`)
}

console.log(`\nDirection agreement: ${agreed}/${RUBRIC.length}`)
if (disagreements.length > 0) {
  console.log('\nDisagreements — read these rather than reflexively retuning the prompt:')
  for (const line of disagreements) console.log(`  - ${line}`)
}

if (process.argv.includes('--borderline')) {
  console.log('\n\nBorderline notes. No expectation is asserted; these are the')
  console.log('interesting ones, and where the abstain line falls is the finding.\n')
  for (const note of BORDERLINE) {
    const {parsed} = await ask(note)
    if (!parsed.ok) {
      console.log(`  ?  "${note}"\n     unusable: ${parsed.problems.join('; ')}\n`)
      continue
    }
    const actual = directionOf(parsed.value, OPENED_YEAR)
    console.log(`  ?  "${note}"`)
    console.log(
      `     ${actual}  window ${window(parsed.value)}  confidence ${parsed.value.confidence ?? '—'}`,
    )
    console.log(`     says "${parsed.value.notes ?? '—'}"\n`)
  }
}

console.log('\nNothing was written.')
