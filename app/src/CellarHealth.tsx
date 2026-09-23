import {useMemo} from 'react'
import {bottleState, inCellar, type BottleState, type IsoDate} from '@cellar/core'
import {useCellar} from './CellarProvider'

/**
 * Cellar Health.
 *
 * Every bottle in the dataset, bucketed by the state it was in on a given
 * date. Nothing here is stored: each count is `bottleState()` evaluated
 * against the event log, which is the whole argument of the project.
 *
 * The full path is Content Lake -> useQuery(CELLAR_QUERY) ->
 * toCellarSnapshot -> buildCellar -> bottleState, with no step skipped and
 * no number precomputed anywhere. The first three steps moved to
 * `CellarProvider` when Drink Soon became a second consumer of the same index;
 * the path is unchanged, only its first half is now shared.
 *
 * `asOf` arrives as a prop and is passed straight through as a parameter.
 * The clock is read once in `App`, and never in `@cellar/core`.
 */

/**
 * The four states that mean a bottle is physically in the cellar on the date,
 * and the two that mean it is not. The split is what makes the table readable
 * at a date far in the past: at 1999-06-01, 536 of 542 bottles are
 * NOT_YET_OWNED, and giving that row the same weight as HOLD and DRINKING
 * makes a four-bottle cellar look like a five-hundred-bottle one.
 *
 * Both groups are always rendered, including when a row is zero. A view that
 * quietly omits a state can report the right numbers for the wrong reason,
 * and the sum line at the foot only means something if every state is in it.
 */
const IN_CELLAR_STATES: readonly BottleState[] = ['HOLD', 'DRINKING', 'PAST_WINDOW', 'UNASSESSED']

const OUTSIDE_STATES: readonly BottleState[] = ['NOT_YET_OWNED', 'CONSUMED']

/**
 * Display labels only.
 *
 * NOT_YET_OWNED reads "Not yet acquired" here because that is the word the
 * ledger uses and it reads correctly in the past tense the rest of the view
 * is written in. The state value itself is unchanged: `@cellar/core` exports
 * NOT_YET_OWNED, the oracle CSVs contain that string, and the test suite
 * depends on it. Label in the view, value in the module.
 */
const STATE_LABEL: Record<BottleState, string> = {
  NOT_YET_OWNED: 'Not yet acquired',
  HOLD: 'Hold',
  DRINKING: 'Drinking',
  PAST_WINDOW: 'Past window',
  UNASSESSED: 'Unassessed',
  CONSUMED: 'Consumed',
}

export interface CellarHealthProps {
  asOf: IsoDate
}

export function CellarHealth({asOf}: CellarHealthProps) {
  // The indexed cellar, built once in the provider and shared. The split
  // between indexing and tallying is load-bearing and survived the move:
  // indexing the snapshot costs ~6ms, re-tallying all 542 bottles at a new
  // date costs ~0.07ms, and keying both on [data, asOf] would make every drag
  // of the slider pay the 6ms for work whose inputs did not change.
  const cellar = useCellar()

  const {counts, inCellarCount, ledgerTotal, violations} = useMemo(() => {
    const tally = new Map<BottleState, number>(
      [...IN_CELLAR_STATES, ...OUTSIDE_STATES].map((state) => [state, 0]),
    )

    // `inCellar()` is evaluated independently rather than inferred from the
    // tally. It is definitionally the union of the four in-cellar states, so
    // the two must agree; computing both turns that definition into a check
    // that costs nothing and fails loudly if the state machine ever drifts
    // from the predicates underneath it.
    let held = 0
    for (const bottleId of cellar.bottles.keys()) {
      const {state} = bottleState(cellar, bottleId, asOf)
      tally.set(state, (tally.get(state) ?? 0) + 1)
      if (inCellar(cellar, bottleId, asOf)) held++
    }

    return {
      counts: tally,
      inCellarCount: held,
      ledgerTotal: cellar.bottles.size,
      violations: cellar.violations.length,
    }
  }, [cellar, asOf])

  const inCellarByState = IN_CELLAR_STATES.reduce(
    (running, state) => running + (counts.get(state) ?? 0),
    0,
  )
  const sum = [...counts.values()].reduce((running, count) => running + count, 0)

  return (
    <section className="health">
      <h2>Cellar health</h2>

      {/*
        The headline number is date-dependent on purpose. `cellar.bottles.size`
        is 542 at every date because it counts what the ledger knows about, not
        what was in the cellar; printing "542 bottles" beside "as of 1999-06-01"
        is a false statement, since there were four.
      */}
      <p className="health-total">
        <strong>{inCellarCount}</strong> bottles in the cellar
      </p>
      <p className="health-ledger">of {ledgerTotal} in the ledger</p>

      <table className="health-table">
        <tbody>
          <tr className="health-group">
            <th scope="rowgroup" colSpan={2}>
              In the cellar on this date
            </th>
          </tr>
          {IN_CELLAR_STATES.map((state) => (
            <tr key={state}>
              <th scope="row">{STATE_LABEL[state]}</th>
              <td>{counts.get(state) ?? 0}</td>
            </tr>
          ))}
          <tr className="health-subtotal">
            <th scope="row">In cellar</th>
            <td className={inCellarByState === inCellarCount ? '' : 'mismatch'}>
              {inCellarByState}
              {inCellarByState === inCellarCount ? '' : ` — inCellar() says ${inCellarCount}`}
            </td>
          </tr>
        </tbody>

        <tbody className="health-outside">
          <tr className="health-group">
            <th scope="rowgroup" colSpan={2}>
              Outside the cellar on this date
            </th>
          </tr>
          {OUTSIDE_STATES.map((state) => (
            <tr key={state}>
              <th scope="row">{STATE_LABEL[state]}</th>
              <td>{counts.get(state) ?? 0}</td>
            </tr>
          ))}
        </tbody>

        {/*
          Date-independent, which is exactly what makes it a check rather than
          inventory. Every bottle in the ledger is in precisely one state on
          every date, so this reads 542 at 1996 and at 2042 or something is
          wrong.
        */}
        <tfoot>
          <tr>
            <th scope="row">Sum of states</th>
            <td className={sum === ledgerTotal ? 'ok' : 'mismatch'}>
              {sum}
              {sum === ledgerTotal ? '' : ` — does not match ${ledgerTotal}`}
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
