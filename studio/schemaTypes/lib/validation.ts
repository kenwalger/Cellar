/**
 * Validation helpers shared by the event and claim document types.
 *
 * These run in Sanity Studio only. Mutations written through the API or a
 * client library are not checked against schema validation, so the Stage 1
 * ledger import will create documents these rules would have rejected. The
 * violations surface when a document is opened, not when it is written.
 * See https://www.sanity.io/docs/content-lake/schema-validation-and-the-content-lake
 */

/** Today as a calendar date in the editor's own timezone, as YYYY-MM-DD. */
function todayLocal(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/**
 * "Must not be in the future", for `date` fields.
 *
 * A date carries no timezone, so the bound is the editor's local calendar
 * date rather than the UTC one. Comparing against UTC would stop someone west
 * of Greenwich recording today's acquisition until late in the afternoon.
 *
 * The bound is computed on each call rather than at module load, so a Studio
 * tab left open overnight does not keep yesterday's answer.
 */
export function notInFutureDate(label: string) {
  return (value: string | undefined): true | string => {
    // required() handles absence; a custom rule still runs on undefined.
    if (!value) return true
    return value <= todayLocal() ? true : `${label} cannot be in the future`
  }
}

/** "Must not be in the future", for `datetime` fields, compared as an instant. */
export function notInFutureDateTime(label: string) {
  return (value: string | undefined): true | string => {
    if (!value) return true
    return Date.parse(value) <= Date.now() ? true : `${label} cannot be in the future`
  }
}

/** Renders an ISO date as its year, per the store-dates-display-years convention. */
export function displayYear(isoDate: string | undefined): string {
  return isoDate ? isoDate.slice(0, 4) : '?'
}
