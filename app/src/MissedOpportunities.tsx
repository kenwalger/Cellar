import {useMemo} from 'react'
import {type IsoDate, type Period, type SourceTier} from '@cellar/core'
import {useCellar} from './cellarContext'
import {describeApproxSpan, formatLongDate, formatShortDate} from './dates'
import {
  describePeakSpan,
  explainEmptyMissed,
  summarizeMissed,
  trailingPeriod,
  type MissedEmptyReason,
  type MissedRow,
} from './missedRows'

/**
 * Missed Opportunities.
 *
 * Bottles that were in their drinking window at some point during the twelve
 * months ending at `asOf`, were never opened, and are past window today. The
 * only view in the app that asks about a period rather than a date, and the
 * only one that uses two dates at once.
 *
 * Nothing here is stored, and nothing is sampled. The peak intervals come from
 * the boundary scan in `@cellar/core`, which evaluates the state at every date
 * where it can change — including `assessedAt`, where a newly visible claim
 * swaps the resolved window without any bound being crossed. Monthly sampling
 * would be simpler and would quietly miss short peaks; see "Missed
 * opportunities" in `docs/temporal-resolution.md`.
 */

/** Display labels only, mirroring TIER_LABEL in `DrinkSoon`. */
const TIER_LABEL: Record<SourceTier, string> = {
  personal: 'Personal',
  producer: 'Producer',
  critic: 'Critic',
  merchant: 'Merchant',
  other: 'Other',
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

export interface MissedOpportunitiesProps {
  asOf: IsoDate
  /**
   * Today, read once in `App`. Not `asOf`.
   *
   * The regret claim is that a bottle is in the cellar, unopened, and ruined,
   * which is a statement about the present rather than about the date being
   * inspected. Binding it to `asOf` would also break the view: measured against
   * this ledger it reads zero across the whole interesting stretch of the
   * history and then climbs as the control moves into the future, because
   * dragging forward retroactively ruins bottles that might still be drunk.
   * That is a projection presented as a loss. `verdictDrift` already answers
   * the "what would today's window have said" question properly.
   */
  today: IsoDate
}

export function MissedOpportunities({asOf, today}: MissedOpportunitiesProps) {
  const cellar = useCellar()

  const period = useMemo(() => trailingPeriod(asOf), [asOf])

  // Keyed on the period and on today, never on the raw data: the index is
  // date-independent and lives in the provider, where it costs ~6ms once.
  //
  // Measured at 0.42ms for the period ending today and 0.62ms for a period
  // listing eleven wines, against 0.04ms for Cellar Health's tally — this is
  // the expensive view, and most of the cost is the second pass that turns "3
  // bottles" into "3 of 5". Three views at one date change come to ~0.9ms,
  // about 5% of a 16.7ms frame, so the control still moves freely and
  // debouncing would only make the numbers trail the thumb.
  //
  // `period` is memoized separately so that this identity holds by reference
  // while the date is unchanged; `trailingPeriod` returns a fresh object every
  // call and an inline one would defeat the memo below entirely.
  const summary = useMemo(() => summarizeMissed(cellar, period, today), [cellar, period, today])

  const {rows, bottleCount, openedInPeriod} = summary

  return (
    <section className="missed">
      <h2>Missed Opportunities</h2>

      {/*
        Both dates, always, whether or not they differ. The period comes from
        the control and the verdict comes from today, and a reader who has
        dragged the slider into 2023 needs to see that the second date did not
        follow it there.
      */}
      <p className="missed-frame">
        At peak between {formatLongDate(period.start)} and {formatLongDate(period.end)}, never
        opened, and past window today, {formatLongDate(today)}.
      </p>

      {rows.length === 0 ? (
        <MissedEmpty period={period} today={today} />
      ) : (
        <>
          <p className="missed-total">
            <strong>{bottleCount}</strong> {bottleCount === 1 ? 'bottle' : 'bottles'} you never
            opened
          </p>
          <p className="missed-ledger">
            across {plural(rows.length, 'wine')}
            {openedInPeriod > 0
              ? `, of which ${plural(openedInPeriod, 'bottle')} did get opened in time`
              : ''}
          </p>

          <table className="missed-table">
            <thead>
              <tr>
                <th scope="col">Wine</th>
                <th scope="col">Lost</th>
                <th scope="col">At peak</th>
                <th scope="col">Window closed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <MissedRowCells key={row.wineId} row={row} period={period} today={today} />
              ))}
            </tbody>
          </table>

          <p className="missed-note">
            A bottle is listed when it was in its drinking window on at least one day of the period,
            was not opened during it, and is past window today. Peaks are computed exactly — the
            state is evaluated at every date where it can change, including the days new claims
            became visible — rather than sampled.
          </p>
        </>
      )}
    </section>
  )
}

interface MissedRowCellsProps {
  row: MissedRow
  period: Period
  today: IsoDate
}

function MissedRowCells({row, period, today}: MissedRowCellsProps) {
  const {window, peak} = row

  return (
    <tr>
      <th scope="row">
        <span className="missed-wine">{row.name}</span>
        {window && (
          // The same provenance strip as Drink Soon, and the same escape hatch
          // for the assessment id: there is no deployed Studio URL in
          // `sanity.ts` to link to, and inventing a URL shape would be exactly
          // the confidently-wrong API surface CLAUDE.md warns about.
          <span className="missed-provenance" title={window.assessmentId}>
            {TIER_LABEL[window.sourceType]}
            <span className="missed-sep"> · </span>
            {window.sourceName}
            <span className="missed-sep"> · </span>
            {formatShortDate(window.assessedAt)}
            <span className="missed-sep"> · </span>
            {plural(window.visibleCount, 'claim')}
          </span>
        )}
      </th>

      <td className="missed-count">
        <span className="missed-lost">{row.bottleCount}</span>
        <span className="missed-of">
          {row.peakedCount === row.bottleCount ? 'every one' : `of ${row.peakedCount} at peak`}
        </span>
        {row.openedInPeriod > 0 && (
          <span className="missed-opened">{row.openedInPeriod} opened in time</span>
        )}
      </td>

      <td className="missed-peak" title={peak.varies ? row.detail : undefined}>
        <span className="missed-span">{describePeakSpan(peak, period)}</span>
        {/*
          Only when the group disagrees, which happens when its bottles were
          acquired apart — the boundary set includes `acquiredAt`, so a bottle
          bought in December has a shorter peak than its siblings. The phrase
          above describes the longest-held bottle; this says how late the last
          one arrived, and the full per-bottle list is in the cell's title.
        */}
        {peak.lastFrom !== peak.from && (
          <span className="missed-varies">latest from {formatShortDate(peak.lastFrom)}</span>
        )}
      </td>

      <td className="missed-closed">
        {window ? (
          <>
            {/*
              The year, not the stored date: `drinkUntil` is 31 December
              because normalization put it there, not because anyone said so.
              Drink Soon says "through 2026" for the same reason.
            */}
            <span className="missed-until">end of {window.drinkUntil.slice(0, 4)}</span>
            <span className="missed-ago">{describeApproxSpan(window.drinkUntil, today)} ago</span>
          </>
        ) : (
          <span className="missed-until">—</span>
        )}
      </td>
    </tr>
  )
}

interface MissedEmptyProps {
  period: Period
  today: IsoDate
}

/**
 * Empty is a normal reading of this view and usually good news.
 *
 * Four of the five branches are reachable from the slider and they are
 * different claims: nothing owned, nothing at peak, everything drunk in time,
 * or nothing lost. Reporting them all as "no results" would hide the one that
 * matters most — a cellar where bottles peaked and none of them was wasted.
 *
 * This is the only place in the app that runs the boundary scan over the whole
 * ledger, and it runs here because there was nothing else to draw. See
 * `scanPeriod`.
 */
function MissedEmpty({period, today}: MissedEmptyProps) {
  const cellar = useCellar()
  const reason = useMemo(() => explainEmptyMissed(cellar, period, today), [cellar, period, today])

  return (
    <div className="missed-empty">
      <p className="missed-empty-head">{emptyHead(reason)}</p>
      <p className="missed-empty-body">{emptyBody(reason, period)}</p>
    </div>
  )
}

function emptyHead(reason: MissedEmptyReason): string {
  switch (reason.kind) {
    case 'FUTURE_PERIOD':
      return 'This period has not happened yet.'
    case 'EMPTY_CELLAR':
      return 'Nothing was in the cellar during this period.'
    case 'NONE_AT_PEAK':
      return 'No bottle was in its drinking window during this period.'
    case 'ALL_OPENED':
      return 'Every bottle that was at peak was opened.'
    case 'NOTHING_LOST':
      return 'Nothing was lost in this period.'
  }
}

function emptyBody(reason: MissedEmptyReason, period: Period): string {
  const {peakedCount, openedInPeriod, openedLater, heldStill, firstAcquisition} = reason

  switch (reason.kind) {
    case 'FUTURE_PERIOD':
      return (
        'Missed Opportunities looks backward: it needs bottles that are past window today. ' +
        'Move the date to the past to read it.'
      )

    case 'EMPTY_CELLAR':
      // "The ledger begins", not "the first bottle was acquired": six bottles
      // share the earliest acquisition date, so the singular would be a small
      // false statement about the data.
      return firstAcquisition
        ? `The ledger begins ${formatLongDate(firstAcquisition)}.`
        : 'The ledger holds no acquisitions.'

    case 'NONE_AT_PEAK':
      return `Bottles were in the cellar between ${formatLongDate(
        period.start,
      )} and ${formatLongDate(period.end)}, but none of them had an open window.`

    case 'ALL_OPENED':
      return `All ${plural(peakedCount, 'bottle')} at peak were opened during the period.`

    case 'NOTHING_LOST': {
      const unopened = peakedCount - openedInPeriod
      const since = [
        openedLater > 0 ? `${openedLater} have since been opened` : null,
        heldStill > 0 ? `${heldStill} are still in hand and not past window` : null,
      ].filter((part): part is string => part !== null)

      return (
        `${plural(peakedCount, 'bottle')} were at peak. ` +
        `${openedInPeriod} were opened during the period and ${unopened} were not` +
        (since.length > 0 ? `, but ${since.join(', and ')}` : '') +
        '.'
      )
    }
  }
}
