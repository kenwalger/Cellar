import {useState} from 'react'
import {useDocumentOperation, type DocumentActionComponent} from 'sanity'
import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {CloseIcon} from '@sanity/icons/Close'

/**
 * The two transitions ADR 0011 defines, and no others.
 *
 * An assessment is `proposed`, `accepted` or `rejected`. Agents create
 * proposed; people decide. Both transitions lead out of `proposed`, so these
 * actions appear on a proposed assessment and nowhere else — there is no path
 * back, and no accepted-to-rejected edge. That is the workflow, not a subset
 * of it awaiting completion.
 *
 * The field itself is `readOnly`, so these are the only way to move it. A
 * workflow you can bypass with a radio button is decorated rather than
 * modelled.
 *
 * Each action patches and then publishes, in that order, because the review
 * state is data and the App reads the published perspective. A proposed claim
 * left in a draft would be invisible to `CELLAR_QUERY` for the wrong reason —
 * it must be visible and still resolve nothing, which is what makes the
 * unchanged counts a real test rather than an absence.
 */

type ReviewState = 'accepted' | 'rejected'

function currentReviewState(props: {draft?: unknown; published?: unknown}): string | undefined {
  const doc = (props.draft ?? props.published) as {reviewState?: string} | null
  return doc?.reviewState
}

/**
 * Builds one transition.
 *
 * `patch.execute` and `publish.execute` come from `useDocumentOperation`,
 * which mutates through the document store rather than the form. Field-level
 * `readOnly` does not reach it: in the installed types, `OperationsAPI`
 * declares `patch` with no disabled reasons of its own, where `publish`
 * enumerates `LIVE_EDIT_ENABLED`, `ALREADY_PUBLISHED`, `NO_CHANGES`,
 * `NOT_PUBLISHABLE` and `TARGET_NOT_FOUND`. That is the type-level answer;
 * the on-screen one is in the verification steps.
 */
function defineTransition(
  to: ReviewState,
  label: string,
  icon: typeof CheckmarkIcon,
  tone: 'positive' | 'critical',
  message: string,
): DocumentActionComponent {
  // Capitalized because it is a React component, not a plain factory result:
  // Studio calls it on every render and it holds hooks. `react-hooks` enforces
  // the naming, and it is right to — the hooks below are only legal here
  // because this is a component.
  const ReviewTransitionAction: DocumentActionComponent = (props) => {
    const {patch, publish} = useDocumentOperation(props.id, props.type)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [busy, setBusy] = useState(false)

    // Not merely disabled. An accepted or rejected claim has left the queue,
    // and offering a greyed-out Accept on it would imply a transition the
    // model does not have.
    if (currentReviewState(props) !== 'proposed') return null

    return {
      label,
      icon,
      tone,
      disabled: busy || publish.disabled === 'NOT_READY',
      onHandle: () => setDialogOpen(true),
      dialog: dialogOpen && {
        type: 'confirm' as const,
        tone,
        message,
        onCancel: () => setDialogOpen(false),
        onConfirm: () => {
          setBusy(true)
          patch.execute([{set: {reviewState: to}}])
          publish.execute()
          // Closing via local state rather than `props.onComplete()`. The
          // published Document Actions reference still shows `onComplete`, but
          // the installed types deprecate it — "use local state instead, for
          // example call setDialogOpen(false)" — and it is slated for removal.
          setDialogOpen(false)
        },
      },
    }
  }

  return ReviewTransitionAction
}

/**
 * Accept. The claim starts resolving windows from this moment — or rather,
 * from its own `assessedAt`, which may be years ago.
 */
export const AcceptAssessmentAction = defineTransition(
  'accepted',
  'Accept',
  CheckmarkIcon,
  'positive',
  'Accept this claim? It will resolve windows from its assessed date, which may be earlier than today, and can change what the cellar says about bottles opened since then.',
)

/**
 * Reject. The document stays in the dataset.
 *
 * ADR 0011 keeps rejected claims because the project's central assertion is
 * that nothing is overwritten and nothing is destroyed — including claims that
 * were considered and declined. It also means this is reversible in the only
 * sense the model allows: the record of the decision survives it.
 */
export const RejectAssessmentAction = defineTransition(
  'rejected',
  'Reject',
  CloseIcon,
  'critical',
  'Reject this claim? It stays in the dataset, recorded as rejected, and resolves nothing.',
)
