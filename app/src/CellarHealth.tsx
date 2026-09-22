import {useMemo} from 'react'
import {useQuery} from '@sanity/sdk-react'
import {
  bottleState,
  buildCellar,
  CELLAR_QUERY,
  toCellarSnapshot,
  type BottleState,
  type RawCellarResult,
} from '@cellar/core'
import {DATASET, PROJECT_ID, today} from './sanity'

/**
 * Cellar Health.
 *
 * Every bottle in the dataset, bucketed by the state it was in on a given
 * date. Nothing here is stored: each count is `bottleState()` evaluated
 * against the event log, which is the whole argument of the project.
 *
 * The full path is Content Lake -> useQuery(CELLAR_QUERY) ->
 * toCellarSnapshot -> buildCellar -> bottleState, with no step skipped and
 * no number precomputed anywhere.
 */

/**
 * Display order. The five states the gate checks, in the order it lists them,
 * with NOT_YET_OWNED first.
 *
 * NOT_YET_OWNED is shown even though it should be zero on this date. A view
 * that quietly omits a state can report the right numbers for the wrong
 * reason, and the sum line below only means something if every state is in it.
 */
const STATE_ORDER: readonly BottleState[] = [
  'NOT_YET_OWNED',
  'HOLD',
  'DRINKING',
  'PAST_WINDOW',
  'UNASSESSED',
  'CONSUMED',
]

const STATE_LABEL: Record<BottleState, string> = {
  NOT_YET_OWNED: 'Not yet owned',
  HOLD: 'Hold',
  DRINKING: 'Drinking',
  PAST_WINDOW: 'Past window',
  UNASSESSED: 'Unassessed',
  CONSUMED: 'Consumed',
}

export function CellarHealth() {
  // Read once per mount so every count on screen belongs to the same date,
  // and so a re-render cannot move the cellar underneath the reader.
  const asOf = useMemo(() => today(), [])

  // One query for the whole cellar. The published perspective is explicit:
  // an unpublished draft assessment must not change what the cellar says
  // before anyone published it.
  const {data} = useQuery<RawCellarResult>({
    query: CELLAR_QUERY,
    projectId: PROJECT_ID,
    dataset: DATASET,
    perspective: 'published',
  })

  const {counts, total, violations} = useMemo(() => {
    const cellar = buildCellar(toCellarSnapshot(data ?? {}))

    const tally = new Map<BottleState, number>(STATE_ORDER.map((state) => [state, 0]))
    for (const bottleId of cellar.bottles.keys()) {
      const {state} = bottleState(cellar, bottleId, asOf)
      tally.set(state, (tally.get(state) ?? 0) + 1)
    }

    return {counts: tally, total: cellar.bottles.size, violations: cellar.violations.length}
  }, [data, asOf])

  const sum = [...counts.values()].reduce((running, count) => running + count, 0)

  return (
    <section className="health">
      <header className="health-header">
        <h1>Cellar health</h1>
        <p className="health-asof">
          as of <time dateTime={asOf}>{asOf}</time>
        </p>
      </header>

      <p className="health-total">
        <strong>{total}</strong> bottles
      </p>

      <table className="health-table">
        <tbody>
          {STATE_ORDER.map((state) => (
            <tr key={state}>
              <th scope="row">{STATE_LABEL[state]}</th>
              <td>{counts.get(state) ?? 0}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Sum of states</th>
            <td className={sum === total ? 'ok' : 'mismatch'}>
              {sum}
              {sum === total ? '' : ` — does not match ${total}`}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="health-note">
        {violations === 0
          ? 'No dataset health violations.'
          : `${violations} dataset health violation${violations === 1 ? '' : 's'}.`}
      </p>
    </section>
  )
}
