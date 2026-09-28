import {useState} from 'react'
import {useClient, type DocumentActionComponent} from 'sanity'
import {SparklesIcon} from '@sanity/icons/Sparkles'
import {wineDisplayName} from '@cellar/core'
import {
  buildInstruction,
  buildProposal,
  parseModelOutput,
  proposalId,
  validateProposal,
  type ModelOutput,
  type ProposedAssessment,
} from '../lib/agentProposal'

/**
 * "Propose a drinking window" — the project's one AI surface (ADR 0008).
 *
 * A tasting note goes in; a `proposed` assessment comes out, or nothing does.
 * A person then accepts or rejects it through the same two transitions
 * everything else uses (ADR 0011). The agent never creates an accepted claim.
 *
 * **A document action rather than a publish trigger.** Three reasons, and the
 * third became decisive after the Function was cut. 240 of 294 consumptions
 * carry a note, so a publish trigger would spend a credit on every one. ADR
 * 0011's sentence is "the agent proposes, a person decides", and choosing to
 * ask is the first half of that. And a publish trigger would need a Function,
 * which is exactly what ADR 0012's amendment cut — this path needs none.
 *
 * **Authentication is the Studio's own session.** `useClient({apiVersion: 'vX'})`
 * returns a client that already carries the logged-in user's bearer token, and
 * `client.agent.action.*` is the documented way to reach Agent Actions from a
 * Studio component. No token is minted, stored, or put in a file. `vX` is
 * required: any dated API version is rejected with a 400.
 *
 * **Prompt rather than Generate.** Generate cannot set either reference —
 * references need the Embeddings Index API, which is deprecated with no
 * replacement — and silently ignores date fields without `localeSettings`. So
 * it could fill neither `wine`, `derivedFrom`, `assessedAt`, `drinkFrom` nor
 * `drinkUntil`, and would fail quietly at three of them. Prompt returns JSON to
 * our own code, which validates it and writes the document itself, so every
 * field the schema requires is set by a line we control.
 *
 * Prompt takes **no `schemaId`**. The troubleshooting page says every Agent
 * Actions request needs one; `PromptRequestBase` in the installed
 * `@sanity/client` 8.6.2 does not declare it at all, while requiring it on the
 * other action types. The quick start's examples are right and the absolute is
 * wrong — which is why this feature needs no schema deploy.
 */

type Phase =
  | {kind: 'idle'}
  | {kind: 'working'}
  | {kind: 'abstained'; reason: string}
  | {kind: 'proposed'; doc: ProposedAssessment}
  | {kind: 'failed'; problems: string[]}

interface ConsumptionContext {
  wineId: string
  wineName: string
  vintageYear: number | null
  existingProposal: string | null
}

/**
 * Everything the instruction needs, plus whether a proposal already exists.
 *
 * One query rather than three round trips, and it deliberately does **not**
 * fetch the wine's current window. See `buildInstruction`.
 */
const CONTEXT_QUERY = `*[_id == $id][0]{
  "wineId": bottle->wine->_id,
  "title": bottle->wine->title,
  "cuvee": bottle->wine->cuvee,
  "vintageYear": bottle->wine->vintageYear,
  "producerName": bottle->wine->producer->name,
  "existingProposal": *[_type == "assessment" && _id == $proposalId][0]._id
}`

export const ProposeWindowAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: 'vX'})
  const [phase, setPhase] = useState<Phase>({kind: 'idle'})

  const doc = (props.draft ?? props.published) as {tastingNote?: string; consumedAt?: string} | null
  const tastingNote = doc?.tastingNote?.trim()
  const consumedAt = doc?.consumedAt

  // Nothing to read, nothing to propose. Hidden rather than disabled: an
  // action offering to extract a window from a note that does not exist is
  // describing a capability the document does not have.
  if (!tastingNote || !consumedAt) return null

  async function run() {
    setPhase({kind: 'working'})
    try {
      const context: ConsumptionContext & {
        title?: string | null
        cuvee?: string | null
        producerName?: string | null
      } = await client.fetch(CONTEXT_QUERY, {
        id: props.id,
        proposalId: proposalId(props.id),
      })

      if (!context?.wineId) {
        setPhase({kind: 'failed', problems: ['this consumption has no wine behind it']})
        return
      }

      if (context.existingProposal) {
        setPhase({
          kind: 'failed',
          problems: [
            'a proposal already exists for this consumption. Accept or reject it first; ' +
              'the id is deterministic, so a second run would collide rather than add.',
          ],
        })
        return
      }

      const wineName = wineDisplayName({
        title: context.title ?? null,
        cuvee: context.cuvee ?? null,
        vintageYear: context.vintageYear ?? null,
        producerName: context.producerName ?? null,
      })

      // temperature 0: the same note should produce the same window twice.
      // This is a transcription task, not a creative one.
      const reply = await client.agent.action.prompt<Record<string, unknown>>({
        instruction: buildInstruction({
          tastingNote: tastingNote!,
          consumedAt: consumedAt!,
          wineName,
          vintageYear: context.vintageYear ?? null,
        }),
        format: 'json',
        temperature: 0,
      })

      const parsed = parseModelOutput(reply)
      if (!parsed.ok) {
        setPhase({kind: 'failed', problems: parsed.problems})
        return
      }

      // Abstention writes nothing at all — not a proposal with empty bounds.
      // The schema requires both, so a boundless proposal could never be
      // accepted, and a claim nobody can act on is noise in the review queue.
      if (!parsed.value.supportsWindow) {
        setPhase({
          kind: 'abstained',
          reason: parsed.value.notes ?? 'the note carries no signal about timing',
        })
        return
      }

      const proposal = buildProposal(
        {consumptionId: props.id, consumedAt: consumedAt!, wineId: context.wineId},
        parsed.value as ModelOutput,
      )

      const today = new Date().toISOString().slice(0, 10)
      const problems = validateProposal(proposal, today)
      if (problems.length > 0) {
        setPhase({kind: 'failed', problems})
        return
      }

      await client.create(proposal)
      setPhase({kind: 'proposed', doc: proposal})
    } catch (error) {
      setPhase({
        kind: 'failed',
        problems: [error instanceof Error ? error.message : String(error)],
      })
    }
  }

  return {
    label: phase.kind === 'working' ? 'Reading the note…' : 'Propose a drinking window',
    icon: SparklesIcon,
    tone: 'primary',
    disabled: phase.kind === 'working',
    onHandle: run,
    dialog: dialogFor(phase, () => setPhase({kind: 'idle'})),
  }
}

function dialogFor(phase: Phase, close: () => void) {
  if (phase.kind === 'abstained') {
    return {
      type: 'confirm' as const,
      tone: 'caution' as const,
      message:
        `No window proposed. ${phase.reason}\n\n` +
        'Nothing was written. A note that does not support a window produces no ' +
        'claim rather than an empty one.',
      onCancel: close,
      onConfirm: close,
    }
  }

  if (phase.kind === 'proposed') {
    const {doc} = phase
    const years = `${doc.drinkFrom.slice(0, 4)}–${doc.drinkUntil.slice(0, 4)}`
    return {
      type: 'confirm' as const,
      tone: 'positive' as const,
      message:
        `Proposed ${years}${doc.confidence ? ` (${doc.confidence} confidence)` : ''}.\n\n` +
        `${doc.notes ?? ''}\n\n` +
        'It is in the review queue as proposed and resolves nothing until accepted.',
      onCancel: close,
      onConfirm: close,
    }
  }

  if (phase.kind === 'failed') {
    return {
      type: 'confirm' as const,
      tone: 'critical' as const,
      message: `Nothing was written.\n\n${phase.problems.join('\n')}`,
      onCancel: close,
      onConfirm: close,
    }
  }

  return undefined
}
