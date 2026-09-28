/**
 * Dry run for the Agent Action. Reads a real consumption, calls the real
 * model, prints the document it would create, and writes nothing.
 *
 * This is where the instruction gets tuned, not in the Studio. Prompt performs
 * no writes by construction, so iterating on the wording costs one AI credit
 * per run ($0.05) and nothing else — no documents, no cleanup, no risk to a
 * dataset.
 *
 * Usage, from the repository root:
 *
 *   node studio/scripts/propose-window.mts <consumptionId> [dataset]
 *
 * Dataset defaults to `staging`. Naming `production` is allowed here because
 * this script cannot write — but note that the *read* is against whichever
 * dataset you name, and the tasting notes are identical in both.
 *
 * Needs a token, because this runs in Node rather than in the Studio, where
 * the session supplies one. Set SANITY_API_TOKEN. The Studio action needs no
 * token at all.
 */

import {createClient} from '@sanity/client'
import {wineDisplayName} from '@cellar/core'
import {
  buildInstruction,
  buildProposal,
  parseModelOutput,
  proposalId,
  validateProposal,
} from '../lib/agentProposal.ts'

const consumptionId = process.argv[2]
const dataset = process.argv[3] ?? 'staging'

if (!consumptionId) {
  console.error('Usage: node studio/scripts/propose-window.mts <consumptionId> [dataset]')
  process.exit(1)
}

const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error(
    'SANITY_API_TOKEN is not set.\n\n' +
      'This script runs outside the Studio, so there is no session to borrow. The\n' +
      'Studio action needs no token; this does. A read token is enough — nothing\n' +
      'here writes.',
  )
  process.exit(1)
}

const client = createClient({
  projectId: 'aos9nze5',
  dataset,
  // Agent Actions run only on vX. Any dated version is rejected with a 400.
  apiVersion: 'vX',
  token,
  useCdn: false,
})

const CONTEXT_QUERY = `*[_id == $id][0]{
  tastingNote,
  consumedAt,
  "wineId": bottle->wine->_id,
  "title": bottle->wine->title,
  "cuvee": bottle->wine->cuvee,
  "vintageYear": bottle->wine->vintageYear,
  "producerName": bottle->wine->producer->name
}`

const context = await client.fetch(CONTEXT_QUERY, {id: consumptionId})

if (!context) {
  console.error(`${consumptionId} is not in ${dataset}`)
  process.exit(1)
}
if (!context.tastingNote) {
  console.error(`${consumptionId} has no tasting note; there is nothing to read`)
  process.exit(1)
}

const wineName = wineDisplayName({
  title: context.title ?? null,
  cuvee: context.cuvee ?? null,
  vintageYear: context.vintageYear ?? null,
  producerName: context.producerName ?? null,
})

const instruction = buildInstruction({
  tastingNote: context.tastingNote,
  consumedAt: context.consumedAt,
  wineName,
  vintageYear: context.vintageYear ?? null,
})

console.log(`Dry run against ${dataset}. Nothing will be written.\n`)
console.log(`  consumption  ${consumptionId}`)
console.log(`  wine         ${wineName}`)
console.log(`  opened       ${String(context.consumedAt).slice(0, 10)}`)
console.log(`  note         "${context.tastingNote}"\n`)

const reply = await client.agent.action.prompt<Record<string, unknown>>({
  instruction,
  format: 'json',
  temperature: 0,
})

console.log('Model reply:')
console.log(JSON.stringify(reply, null, 2), '\n')

const parsed = parseModelOutput(reply)

if (!parsed.ok) {
  console.error('The reply is unusable. Nothing would be written:')
  for (const problem of parsed.problems) console.error(`  - ${problem}`)
  process.exit(1)
}

if (!parsed.value.supportsWindow) {
  console.log('ABSTAINED. No document would be created.')
  console.log(`  reason  ${parsed.value.notes ?? '(none given)'}`)
  console.log(
    '\nThis is a correct outcome, not a failure. Roughly a quarter of the\n' +
      'distinct notes in this dataset carry no timing signal.',
  )
  process.exit(0)
}

const proposal = buildProposal(
  {consumptionId, consumedAt: context.consumedAt, wineId: context.wineId},
  parsed.value,
)

const today = new Date().toISOString().slice(0, 10)
const problems = validateProposal(proposal, today)

if (problems.length > 0) {
  console.error('The document fails checks the Content Lake would not make:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log('Would create:\n')
console.log(JSON.stringify(proposal, null, 2))
console.log(`\n  id            ${proposalId(consumptionId)}  (deterministic)`)
console.log(`  assessedAt    ${proposal.assessedAt}  (the day after, deliberately)`)
console.log(`  reviewState   ${proposal.reviewState}  (resolves nothing until accepted)`)
console.log('\nNothing was written.')
