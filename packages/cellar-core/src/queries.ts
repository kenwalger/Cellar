import type {
  AcquisitionInput,
  AssessmentInput,
  BottleInput,
  CellarSnapshot,
  ConsumptionInput,
  WineInput,
} from './types.js'

/**
 * GROQ for the Sanity-facing adapter.
 *
 * These are strings. This module does not import a Sanity client and does not
 * execute them — each consumer runs the query with whatever it already has:
 * `@sanity/client` in a Function, `useQuery` in the App, a server fetch in a
 * Next.js route. Fetching and temporal resolution stay separate concerns.
 *
 * Run every one of these against the **published** perspective. There are no
 * drafts in the dataset today, but the moment someone edits an assessment in
 * the Studio, a draft would otherwise leak into window resolution and change
 * what the cellar says before anyone published anything.
 */

/**
 * The whole cellar in one round trip.
 *
 * Deliberately no `reviewState == "accepted"` filter. The module owns that
 * rule, so it lives in exactly one place, and the review queue needs the
 * proposed claims anyway. At the size of this dataset the over-fetch is not
 * worth a rule split across two layers.
 */
export const CELLAR_QUERY = `{
  "wines": *[_type == "wine"]{
    "id": _id,
    title,
    cuvee,
    vintageYear,
    appellation,
    "producerName": producer->name
  },
  "bottles": *[_type == "bottle"]{
    "id": _id,
    "wineId": wine._ref,
    format,
    location
  },
  "acquisitions": *[_type == "acquisition" && defined(bottle._ref) && defined(acquiredAt)]{
    "id": _id,
    "bottleId": bottle._ref,
    acquiredAt
  },
  "consumptions": *[_type == "consumption" && defined(bottle._ref) && defined(consumedAt)]{
    "id": _id,
    "bottleId": bottle._ref,
    consumedAt
  },
  "assessments": *[_type == "assessment" && defined(wine._ref)]{
    "id": _id,
    "wineId": wine._ref,
    sourceType,
    sourceName,
    assessedAt,
    drinkFrom,
    drinkUntil,
    reviewState,
    "createdAt": _createdAt
  }
}`

/**
 * One wine and everything hanging off it, for a Function recomputing
 * projections on publish. Takes `$wineId`.
 *
 * A Function firing on every consumption should not pull 1,645 documents to
 * answer a question about one wine.
 */
export const WINE_SCOPED_QUERY = `{
  "wines": *[_type == "wine" && _id == $wineId]{
    "id": _id,
    title,
    cuvee,
    vintageYear,
    appellation,
    "producerName": producer->name
  },
  "bottles": *[_type == "bottle" && wine._ref == $wineId]{
    "id": _id,
    "wineId": wine._ref,
    format,
    location
  },
  "acquisitions": *[_type == "acquisition" && bottle->wine._ref == $wineId && defined(acquiredAt)]{
    "id": _id,
    "bottleId": bottle._ref,
    acquiredAt
  },
  "consumptions": *[_type == "consumption" && bottle->wine._ref == $wineId && defined(consumedAt)]{
    "id": _id,
    "bottleId": bottle._ref,
    consumedAt
  },
  "assessments": *[_type == "assessment" && wine._ref == $wineId]{
    "id": _id,
    "wineId": wine._ref,
    sourceType,
    sourceName,
    assessedAt,
    drinkFrom,
    drinkUntil,
    reviewState,
    "createdAt": _createdAt
  }
}`

/** The raw shape either query returns, before normalization. */
export interface RawCellarResult {
  wines?: unknown[]
  bottles?: unknown[]
  acquisitions?: unknown[]
  consumptions?: unknown[]
  assessments?: unknown[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Normalizes a query result into a `CellarSnapshot`.
 *
 * Rows missing a field the model requires are dropped here rather than
 * carried into the indexes as undefined. `buildCellar` reports the structural
 * consequences — a bottle with no acquisition, a wine with no assessments —
 * as violations.
 */
export function toCellarSnapshot(raw: RawCellarResult): CellarSnapshot {
  const wines: WineInput[] = []
  for (const row of raw.wines ?? []) {
    const record = asRecord(row)
    const id = asString(record?.id)
    if (!record || !id) continue
    wines.push({
      id,
      title: asString(record.title) ?? null,
      cuvee: asString(record.cuvee) ?? null,
      vintageYear: typeof record.vintageYear === 'number' ? record.vintageYear : null,
      producerName: asString(record.producerName) ?? null,
      appellation: asString(record.appellation) ?? null,
    })
  }

  const bottles: BottleInput[] = []
  for (const row of raw.bottles ?? []) {
    const record = asRecord(row)
    const id = asString(record?.id)
    if (!record || !id) continue
    bottles.push({
      id,
      wineId: asString(record.wineId) ?? '',
      format: asString(record.format) ?? null,
      location: asString(record.location) ?? null,
    })
  }

  const acquisitions: AcquisitionInput[] = []
  for (const row of raw.acquisitions ?? []) {
    const record = asRecord(row)
    const id = asString(record?.id)
    const acquiredAt = asString(record?.acquiredAt)
    if (!record || !id || !acquiredAt) continue
    acquisitions.push({id, bottleId: asString(record.bottleId) ?? '', acquiredAt})
  }

  const consumptions: ConsumptionInput[] = []
  for (const row of raw.consumptions ?? []) {
    const record = asRecord(row)
    const id = asString(record?.id)
    const consumedAt = asString(record?.consumedAt)
    if (!record || !id || !consumedAt) continue
    consumptions.push({id, bottleId: asString(record.bottleId) ?? '', consumedAt})
  }

  const assessments: AssessmentInput[] = []
  for (const row of raw.assessments ?? []) {
    const record = asRecord(row)
    const id = asString(record?.id)
    const sourceType = asString(record?.sourceType)
    const assessedAt = asString(record?.assessedAt)
    const drinkFrom = asString(record?.drinkFrom)
    const drinkUntil = asString(record?.drinkUntil)
    if (!record || !id || !sourceType || !assessedAt || !drinkFrom || !drinkUntil) continue
    assessments.push({
      id,
      wineId: asString(record.wineId) ?? '',
      sourceType: sourceType as AssessmentInput['sourceType'],
      sourceName: asString(record.sourceName) ?? '',
      assessedAt,
      drinkFrom,
      drinkUntil,
      reviewState: (asString(record.reviewState) ?? 'proposed') as AssessmentInput['reviewState'],
      createdAt: asString(record.createdAt) ?? '',
    })
  }

  return {wines, bottles, acquisitions, consumptions, assessments}
}
