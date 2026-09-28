import {useState} from 'react'
import {type IsoDate} from '@cellar/core'
import {
  ASOF_CEILING,
  ASOF_FLOOR,
  ASOF_SPAN_DAYS,
  describeAsOf,
  describeOutOfRange,
  fromDayIndex,
  readDateInput,
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

  /**
   * The text in the date field while it is being edited, or null when the
   * field is showing the committed `value`.
   *
   * This exists because the field is controlled and the control was fighting
   * the typist. Every keystroke in the year produces a complete, valid date
   * (`0002-12-31` on the way to `2023-12-31`), the old handler clamped it into
   * range and committed it, and React then wrote `1996-01-01` back over the
   * year being typed. Holding the raw text means the value React writes back
   * is the value the input already has, so the edit survives.
   */
  const [draft, setDraft] = useState<string | null>(null)

  /** Why the field refused a date, or null. Cleared by any successful commit. */
  const [notice, setNotice] = useState<string | null>(null)

  /** A date chosen by the slider or the Today button abandons any pending edit. */
  function commit(next: IsoDate) {
    setDraft(null)
    setNotice(null)
    onChange(next)
  }

  function handleTyping(raw: string) {
    const outcome = readDateInput(raw)

    if (outcome.status === 'commit') {
      setDraft(null)
      setNotice(null)
      onChange(outcome.date)
      return
    }

    // Held, not committed. An out-of-range date says so straight away; an
    // unfinished one says nothing, because it is not wrong yet.
    setDraft(raw)
    setNotice(outcome.status === 'outOfRange' ? describeOutOfRange(outcome) : null)
  }

  /**
   * Blur and Enter. A date the control cannot reach is clamped *here* rather
   * than on the keystroke, with the notice left on screen to say what happened;
   * an unfinished entry is abandoned and the field returns to the committed
   * date.
   */
  function settle() {
    if (draft === null) return
    const outcome = readDateInput(draft)
    setDraft(null)

    if (outcome.status === 'outOfRange') {
      onChange(outcome.clamped)
      return
    }
    setNotice(null)
  }

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
          // Reads the committed date, never the draft. While a date is being
          // typed the slider sits where the cellar actually is, which is
          // correct: nothing has been chosen yet. It catches up on the
          // keystroke that completes the date.
          value={toDayIndex(value)}
          onChange={(event) => commit(fromDayIndex(Number(event.currentTarget.value)))}
          aria-label="As of date"
        />

        <div className="asof-exact">
          <label>
            <span className="asof-label">Date</span>{' '}
            <input
              type="date"
              min={ASOF_FLOOR}
              max={ASOF_CEILING}
              // The draft while one is in flight, otherwise the committed date.
              // `min` and `max` mark the field invalid outside the domain but
              // do not stop the value arriving, so the range is enforced in
              // `readDateInput` rather than by the attributes.
              value={draft ?? value}
              onChange={(event) => handleTyping(event.currentTarget.value)}
              onBlur={settle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') settle()
              }}
              aria-describedby={notice ? 'asof-notice' : undefined}
            />
          </label>
          <button type="button" onClick={() => commit(today)} disabled={value === today}>
            Today
          </button>
        </div>
      </div>

      {/*
        The date the control refused and the one it is showing instead. The
        behaviour it replaces was the same clamp with nothing on screen: type
        2043 and the view moved to 2042 without comment, which reads as the
        field ignoring you.
      */}
      {notice && (
        <p className="asof-notice" id="asof-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
