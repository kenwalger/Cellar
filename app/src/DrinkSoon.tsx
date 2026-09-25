import {useMemo} from 'react'
import {type IsoDate, type SourceTier} from '@cellar/core'
import {useCellar} from './cellarContext'
import {describeApproxSpan, describeRemaining, formatLongDate, formatShortDate} from './dates'
import {
  DRINK_SOON_MONTHS,
  firstAcquisitionDate,
  summarizeDrinkSoon,
  type DrinkSoonSummary,
} from './drinkSoonRows'

/**
 * Drink Soon.
 *
 * Bottles in the cellar on the date whose window is open and closing within
 * twelve months, grouped by wine, each row carrying where its window came
 * from. The provenance is the point. A list that only says "drink this" is any
 * inventory app; this one can say which claim it believes, who made it, when,
 * and how many other accepted claims it beat.
 *
 * Nothing here is stored. `summarizeDrinkSoon` is `bottleState` and
 * `isDrinkSoon` evaluated against the event log at the date the control is
 * showing, which is the same path Cellar Health takes and the same path a
 * verdict takes.
 */

/**
 * Display labels only, mirroring STATE_LABEL in `CellarHealth`. The values are
 * unchanged: `@cellar/core` exports the lowercase tiers, AUTHORITY_ORDER is
 * written in them, and the resolution rule depends on them.
 */
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

export interface DrinkSoonProps {
  asOf: IsoDate
}

export function DrinkSoon({asOf}: DrinkSoonProps) {
  const cellar = useCellar()

  // Two memos on different keys, as in CellarHealth. The first acquisition is
  // a property of the ledger and does not move when the control does.
  const firstAcquisition = useMemo(() => firstAcquisitionDate(cellar), [cellar])
  const summary = useMemo(() => summarizeDrinkSoon(cellar, asOf), [cellar, asOf])

  const {rows, bottleCount, drinkingCount} = summary

  return (
    <section className="soon">
      <h2>Drink Soon</h2>

      {rows.length === 0 ? (
        <DrinkSoonEmpty asOf={asOf} summary={summary} firstAcquisition={firstAcquisition} />
      ) : (
        <>
          <p className="soon-total">
            <strong>{bottleCount}</strong> {bottleCount === 1 ? 'bottle' : 'bottles'} closing within{' '}
            {DRINK_SOON_MONTHS} months
          </p>
          <p className="soon-ledger">
            across {plural(rows.length, 'wine')}, of {drinkingCount} in their drinking window
          </p>

          <table className="soon-table">
            <thead>
              <tr>
                <th scope="col">Wine</th>
                <th scope="col">Bottles</th>
                <th scope="col">Window</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.wineId}>
                  <th scope="row">
                    <span className="soon-wine">{row.name}</span>
                    {/*
                      The assessment id rides along in `title` rather than as a
                      link. There is no deployed Studio URL in `sanity.ts` to
                      point at, and inventing a URL shape would be exactly the
                      confidently-wrong API surface CLAUDE.md warns about.
                    */}
                    <span className="soon-provenance" title={row.window.assessmentId}>
                      {TIER_LABEL[row.window.sourceType]}
                      <span className="soon-sep"> · </span>
                      {row.window.sourceName}
                      <span className="soon-sep"> · </span>
                      {formatShortDate(row.window.assessedAt)}
                      <span className="soon-sep"> · </span>
                      {plural(row.window.visibleCount, 'claim')}
                    </span>
                  </th>
                  <td className="soon-count">{row.bottleCount}</td>
                  <td className="soon-window">
                    {/*
                      The year, not the stored date. `drinkUntil` is 31
                      December because normalization put it there, not because
                      anybody said so, and "through 2026" is the claim that was
                      actually made. "Through" is also carrying the
                      inclusivity: the bottle is DRINKING on `drinkUntil`
                      itself.
                    */}
                    <span className="soon-through">
                      through {row.window.drinkUntil.slice(0, 4)}
                    </span>
                    <span className="soon-left">
                      {describeRemaining(asOf, row.window.drinkUntil)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="soon-note">
            Each window is the highest-authority accepted claim visible on this date; the claim
            count is how many that wine has. Windows are stated in years, so the horizon moves a
            year at a time.
          </p>
        </>
      )}
    </section>
  )
}

interface DrinkSoonEmptyProps {
  asOf: IsoDate
  summary: DrinkSoonSummary
  firstAcquisition: IsoDate | null
}

/**
 * Empty is a normal reading of this view, not a failure of it.
 *
 * It is empty at three of the five verification dates, and the three reasons
 * are different claims about the cellar. The third is the common one and it is
 * good news — a cellar with nothing closing is a cellar in hand — so it says
 * how much is drinking and when the next window closes rather than reporting
 * an absence and stopping.
 */
function DrinkSoonEmpty({asOf, summary, firstAcquisition}: DrinkSoonEmptyProps) {
  const {inCellarCount, drinkingCount, holdCount, pastWindowCount, unassessedCount, nearestClose} =
    summary

  if (inCellarCount === 0) {
    return (
      <div className="soon-empty">
        <p className="soon-empty-head">Nothing in the cellar on this date.</p>
        <p className="soon-empty-body">
          {/*
            "The ledger begins", not "the first bottle was acquired": six
            bottles share the earliest acquisition date, so the singular would
            be a small false statement about the data.
          */}
          {firstAcquisition && asOf < firstAcquisition
            ? `The ledger begins ${formatLongDate(firstAcquisition)}.`
            : 'Every bottle in the ledger has been consumed.'}
        </p>
      </div>
    )
  }

  if (drinkingCount === 0) {
    const parts = [
      holdCount > 0 ? `${holdCount} on hold` : null,
      pastWindowCount > 0 ? `${pastWindowCount} past window` : null,
      unassessedCount > 0 ? `${unassessedCount} with no accepted assessment` : null,
    ].filter((part): part is string => part !== null)

    return (
      <div className="soon-empty">
        <p className="soon-empty-head">No bottle is in its drinking window on this date.</p>
        <p className="soon-empty-body">
          {plural(inCellarCount, 'bottle')} in the cellar
          {parts.length > 0 ? ` — ${parts.join(', ')}` : ''}.
        </p>
      </div>
    )
  }

  return (
    <div className="soon-empty">
      <p className="soon-empty-head">
        Nothing needs drinking in the next {DRINK_SOON_MONTHS} months.
      </p>
      <p className="soon-empty-body">
        {plural(drinkingCount, 'bottle')} in their drinking window, and the earliest closes
        {nearestClose ? ` in ${nearestClose.slice(0, 4)}` : ''}
        {nearestClose ? ` — about ${describeApproxSpan(asOf, nearestClose)} away` : ''}.
      </p>
    </div>
  )
}
