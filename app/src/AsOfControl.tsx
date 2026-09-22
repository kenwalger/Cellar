import {type IsoDate} from '@cellar/core'
import {
  ASOF_CEILING,
  ASOF_FLOOR,
  ASOF_SPAN_DAYS,
  describeAsOf,
  fromDayIndex,
  parseDateInput,
  toDayIndex,
} from './dates'

/**
 * The asOf control.
 *
 * One date, two ways to set it, because the two jobs are different and
 * neither control does both. The date field is the precision instrument: the
 * verification table names exact days, and a slider spanning seventeen
 * thousand of them cannot be dragged to one. The slider is the demonstration:
 * `docs/build-plan.md` wants the control *moving* in the demo video, and a
 * date field does not move — it jumps, and the sweep that is the entire
 * argument of this project never appears on screen.
 *
 * `asOf` is view state, not content. The App SDK's guidance against holding
 * values in `useState` is about document fields, which go stale against the
 * Content Lake and lose concurrent edits; this value is never written
 * anywhere and has no document to go stale against.
 */

export interface AsOfControlProps {
  value: IsoDate
  today: IsoDate
  onChange: (next: IsoDate) => void
}

export function AsOfControl({value, today, onChange}: AsOfControlProps) {
  const {tense, date, distance} = describeAsOf(value, today)

  return (
    <div className="asof">
      {/*
        The date is rendered here, large, rather than being read off the date
        field. A native date input draws its value in small system chrome that
        does not survive video compression, and the requirement is that the
        date stays legible while it moves.
      */}
      <p className="asof-line">
        <span className="asof-prefix">{tense === 'future' ? 'projected to' : 'as of'}</span>{' '}
        <time className="asof-date" dateTime={value}>
          {date}
        </time>
        <span className="asof-distance">{distance}</span>
      </p>

      {/*
        Required, not decoration. A future count is otherwise read as a
        prediction, and the model is not making one: it is reporting what the
        current ledger implies if nothing further is added to it.
      */}
      {tense === 'future' && (
        <p className="asof-assumption">
          Assumes no further acquisitions, consumptions, or assessments.
        </p>
      )}

      <div className="asof-controls">
        <input
          className="asof-slider"
          type="range"
          min={0}
          max={ASOF_SPAN_DAYS}
          step={1}
          value={toDayIndex(value)}
          onChange={(event) => onChange(fromDayIndex(Number(event.currentTarget.value)))}
          aria-label="As of date"
        />

        <div className="asof-exact">
          <label>
            <span className="asof-label">Date</span>{' '}
            <input
              type="date"
              min={ASOF_FLOOR}
              max={ASOF_CEILING}
              value={value}
              // A date input reads `''` mid-entry and can hold an out-of-range
              // value even with min and max set. Ignore anything unusable
              // rather than snapping the view to a half-typed year.
              onChange={(event) => {
                const parsed = parseDateInput(event.currentTarget.value)
                if (parsed) onChange(parsed)
              }}
            />
          </label>
          <button type="button" onClick={() => onChange(today)} disabled={value === today}>
            Today
          </button>
        </div>
      </div>
    </div>
  )
}
