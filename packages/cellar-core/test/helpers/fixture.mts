import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {buildCellar, toCellarSnapshot, type Cellar} from '../../dist/index.js'

export const SAMPLE_DATA = join(import.meta.dirname, '..', '..', '..', '..', 'sample_data')

/** The date the oracle files were generated against. Never `new Date()`. */
export const ORACLE_NOW = '2026-09-18'

type SanityDoc = Record<string, unknown> & {_id: string; _type: string}

function ref(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const target = (value as {_ref?: unknown})._ref
  return typeof target === 'string' ? target : undefined
}

/**
 * Builds a Cellar from `sample_data/cellar.ndjson`.
 *
 * Reads the same documents that were imported, offline, so the tests need no
 * network and cannot drift from the dataset. Shaping them the way
 * CELLAR_QUERY does means `toCellarSnapshot` is exercised rather than
 * bypassed by a parallel reimplementation.
 *
 * One gap worth naming: the NDJSON carries no `_createdAt`, since the Content
 * Lake assigns that at import. Every assessment therefore tie-breaks at 0
 * here. That costs nothing, because the seed data contains no same-tier
 * same-day ties for `_createdAt` to break — see rules.test.mts, which covers
 * the comparator on synthetic data instead.
 */
export function loadCellarFromNdjson(): Cellar {
  const path = join(SAMPLE_DATA, 'cellar.ndjson')
  const docs: SanityDoc[] = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as SanityDoc)

  const producerNames = new Map<string, string>()
  for (const doc of docs) {
    if (doc._type === 'producer' && typeof doc.name === 'string') {
      producerNames.set(doc._id, doc.name)
    }
  }

  const of = (type: string): SanityDoc[] => docs.filter((doc) => doc._type === type)

  const snapshot = toCellarSnapshot({
    wines: of('wine').map((doc) => ({
      id: doc._id,
      title: doc.title,
      cuvee: doc.cuvee,
      vintageYear: doc.vintageYear,
      appellation: doc.appellation,
      producerName: producerNames.get(ref(doc.producer) ?? ''),
    })),
    bottles: of('bottle').map((doc) => ({
      id: doc._id,
      wineId: ref(doc.wine),
      format: doc.format,
      location: doc.location,
    })),
    acquisitions: of('acquisition').map((doc) => ({
      id: doc._id,
      bottleId: ref(doc.bottle),
      acquiredAt: doc.acquiredAt,
    })),
    consumptions: of('consumption').map((doc) => ({
      id: doc._id,
      bottleId: ref(doc.bottle),
      consumedAt: doc.consumedAt,
    })),
    assessments: of('assessment').map((doc) => ({
      id: doc._id,
      wineId: ref(doc.wine),
      sourceType: doc.sourceType,
      sourceName: doc.sourceName,
      assessedAt: doc.assessedAt,
      drinkFrom: doc.drinkFrom,
      drinkUntil: doc.drinkUntil,
      reviewState: doc.reviewState,
      createdAt: doc._createdAt,
    })),
  })

  return buildCellar(snapshot)
}
