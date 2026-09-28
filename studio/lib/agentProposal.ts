import {addDays, isIsoDate, normalizeWindowBound, toUtcDate} from '@cellar/core'

/**
 * Stage 4b's agent, with the model taken out of it.
 *
 * Everything here is pure: build an instruction, validate what comes back,
 * assemble a document. No network, no Sanity client, no React. Three callers
 * share it — the Studio document action, the dry-run script, and the rubric —
 * and a fourth, the test suite, can exercise all of it without a credit or a
 * token.
 *
 * That split is the point rather than a convenience. The only part of this
 * feature that is not deterministic is the model's four-key JSON reply, and
 * confining it to one function means everything around it can be asserted
 * exactly: which fields the system fixes, what `assessedAt` is, what makes a
 * reply unusable, and what a refusal looks like.
 */

/** What the model is told about. Deliberately short — see `buildInstruction`. */
export interface ProposalContext {
  tastingNote: string
  /** The consumption's `consumedAt`, date or datetime. */
  consumedAt: string
  /** Composed by `wineDisplayName`, so it matches every other surface. */
  wineName: string
  vintageYear: number | null
}

/** The four keys the model fills, and nothing else. */
export interface ModelOutput {
  supportsWindow: boolean
  drinkFromYear?: number
  drinkUntilYear?: number
  confidence?: 'low' | 'medium' | 'high'
  notes?: string
}

export type ParseResult = {ok: true; value: ModelOutput} | {ok: false; problems: string[]}

/**
 * Deterministic ids, so a second run on the same consumption collides rather
 * than quietly proposing the same window twice, and so every claim this agent
 * has ever written can be found — or removed — with one id pattern.
 */
export const PROPOSAL_ID_PREFIX = 'assess-agent-'

export function proposalId(consumptionId: string): string {
  return `${PROPOSAL_ID_PREFIX}${consumptionId}`
}

/** Windows are stated as whole years; these bound what the model may return. */
export const MIN_YEAR = 1900
export const MAX_YEAR = 2100

/**
 * What the model is asked, and — more importantly — what it is not told.
 *
 * **The currently resolved window is deliberately absent.** An assessment is
 * supposed to be an independent claim, and handing the model the window its
 * output might replace invites it to copy. It would also destroy the rubric:
 * shown the incumbent, a plausible answer is indistinguishable from mimicry,
 * and there would be no way to tell extraction from agreement.
 *
 * The no-outside-knowledge rule is in the instruction for a reason that is
 * about attribution rather than accuracy. The claim this produces is written
 * to the `personal` tier under the owner's name. A window inferred from the
 * producer's reputation or a vintage chart would be a stranger's opinion
 * filed as the owner's, at the top authority tier, outranking every producer
 * and critic claim for that wine.
 */
export function buildInstruction(context: ProposalContext): string {
  const vintage = context.vintageYear === null ? 'unknown' : String(context.vintageYear)
  const openedOn = toUtcDate(context.consumedAt)

  return [
    'You are reading one tasting note from a wine cellar and deciding whether it',
    'supports a drinking window — the years during which the wine is at its best.',
    '',
    `Wine: ${context.wineName}`,
    `Vintage year: ${vintage}`,
    `Opened on: ${openedOn}`,
    `Tasting note: "${context.tastingNote}"`,
    '',
    'Rules:',
    '1. Reason ONLY from the note, the vintage year and the date it was opened.',
    '   Do not use any outside knowledge of this producer, this vintage, this',
    '   region, or typical ageing curves. This claim will be attributed to the',
    '   cellar owner, and an inference from outside knowledge would not be theirs.',
    '2. A note saying the wine was past its best means the window CLOSED BEFORE',
    '   the year it was opened.',
    '3. A note saying the wine was drinking well means the window CONTAINS the',
    '   year it was opened.',
    '4. A note saying the wine was too young means the window OPENS AFTER the',
    '   year it was opened.',
    '5. A note with no signal about timing at all — only flavour, occasion, food,',
    '   or price — supports no window. Say so rather than guessing.',
    '',
    'Reply with JSON and nothing else, in exactly this shape:',
    '{',
    '  "supportsWindow": true,',
    '  "drinkFromYear": 2020,',
    '  "drinkUntilYear": 2026,',
    '  "confidence": "medium",',
    '  "notes": "one sentence naming the phrase you relied on"',
    '}',
    '',
    'If the note supports no window, reply exactly:',
    '{"supportsWindow": false, "notes": "one sentence saying what is missing"}',
    '',
    'confidence is "low", "medium" or "high" and describes how strongly the note',
    'supports the window, not how good the wine is. Years are whole numbers and',
    'drinkUntilYear must not be earlier than drinkFromYear.',
  ].join('\n')
}

/**
 * Validates the model's reply before anything is built from it.
 *
 * Every field is checked rather than trusted, including ones the instruction
 * asks for explicitly. The reply is the one input to this feature that no
 * amount of prompt engineering makes deterministic, and `client.create()`
 * writes through the API, which does not consult the schema — so this function
 * is the only thing standing between a malformed reply and a document the
 * Studio would have rejected.
 */
export function parseModelOutput(raw: unknown): ParseResult {
  const problems: string[] = []

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {ok: false, problems: ['the reply was not a JSON object']}
  }

  const record = raw as Record<string, unknown>

  if (typeof record.supportsWindow !== 'boolean') {
    return {ok: false, problems: ['supportsWindow is missing or not a boolean']}
  }

  const notes =
    typeof record.notes === 'string' && record.notes.trim() !== '' ? record.notes.trim() : undefined

  // An abstention carries no window, and carrying one anyway would be the
  // reply contradicting itself. Unknown keys are dropped rather than rejected.
  if (!record.supportsWindow) {
    return {ok: true, value: {supportsWindow: false, notes}}
  }

  const from = record.drinkFromYear
  const until = record.drinkUntilYear

  for (const [name, value] of [
    ['drinkFromYear', from],
    ['drinkUntilYear', until],
  ] as const) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      problems.push(`${name} is missing or not a whole number`)
    } else if (value < MIN_YEAR || value > MAX_YEAR) {
      problems.push(`${name} ${value} is outside ${MIN_YEAR}–${MAX_YEAR}`)
    }
  }

  if (typeof from === 'number' && typeof until === 'number' && until < from) {
    problems.push(`drinkUntilYear ${until} is earlier than drinkFromYear ${from}`)
  }

  let confidence: ModelOutput['confidence']
  if (record.confidence !== undefined) {
    if (
      record.confidence === 'low' ||
      record.confidence === 'medium' ||
      record.confidence === 'high'
    ) {
      confidence = record.confidence
    } else {
      problems.push(`confidence ${JSON.stringify(record.confidence)} is not low, medium or high`)
    }
  }

  if (problems.length > 0) return {ok: false, problems}

  return {
    ok: true,
    value: {
      supportsWindow: true,
      drinkFromYear: from as number,
      drinkUntilYear: until as number,
      confidence,
      notes,
    },
  }
}

export interface ProposalSource {
  consumptionId: string
  consumedAt: string
  wineId: string
}

/** The document, exactly as it will be written. */
export interface ProposedAssessment {
  _id: string
  _type: 'assessment'
  wine: {_type: 'reference'; _ref: string}
  sourceType: 'personal'
  sourceName: 'me'
  assessedAt: string
  drinkFrom: string
  drinkUntil: string
  confidence?: 'low' | 'medium' | 'high'
  notes?: string
  derivedFrom: {_type: 'reference'; _ref: string}
  sourceMethod: 'extracted'
  reviewState: 'proposed'
}

/**
 * Assembles the document. The model contributed two years, a confidence and a
 * sentence; everything else on this record is a fact from the ledger or a
 * literal in this file.
 *
 * `assessedAt` is the day **after** the bottle was opened, following the
 * convention all 38 hand-written derived assessments in the seed ledger
 * already use. This is not cosmetic. Window resolution is `assessedAt <= T`,
 * and a consumption's verdict resolves the window as of `consumedAt` — so a
 * claim dated the same day would be visible to the verdict on the very bottle
 * its note came from, and the verdict would agree with the note *because it is
 * the note*. The check would stop being a check and become a restatement.
 * Dated the day after, the claim is invisible to that bottle and visible to
 * every one opened later, which is what "you open a bottle, write a note, and
 * it changes the window on the bottles still in the rack" actually means.
 *
 * `sourceType: 'personal'` because the observation is the owner's; the model
 * only transcribed it. `sourceMethod: 'extracted'` because that transcription
 * is also true, and ADR 0012 exists so the record can hold both.
 *
 * `reviewState` is a literal here and is never assembled from anything the
 * model returned. A person decides (ADR 0011).
 */
export function buildProposal(source: ProposalSource, output: ModelOutput): ProposedAssessment {
  if (!output.supportsWindow) {
    throw new Error('buildProposal called on an abstention; nothing should be written')
  }

  const assessedAt = addDays(toUtcDate(source.consumedAt), 1)

  return {
    _id: proposalId(source.consumptionId),
    _type: 'assessment',
    wine: {_type: 'reference', _ref: source.wineId},
    sourceType: 'personal',
    sourceName: 'me',
    assessedAt,
    drinkFrom: normalizeWindowBound(output.drinkFromYear as number, 'from'),
    drinkUntil: normalizeWindowBound(output.drinkUntilYear as number, 'until'),
    ...(output.confidence ? {confidence: output.confidence} : {}),
    ...(output.notes ? {notes: output.notes} : {}),
    derivedFrom: {_type: 'reference', _ref: source.consumptionId},
    sourceMethod: 'extracted',
    reviewState: 'proposed',
  }
}

/**
 * The checks the Content Lake will not make.
 *
 * Schema validation runs in the Studio form and nowhere else. This document is
 * written by `client.create()`, which goes through the API, so every rule in
 * `docs/content-model.md` is this function's responsibility. The same position
 * the seeding script is in, and the reason both validate before writing rather
 * than after.
 *
 * `today` is a parameter rather than a clock read, so this is checkable
 * against a table like everything else in the project.
 */
export function validateProposal(doc: ProposedAssessment, today: string): string[] {
  const problems: string[] = []

  if (!isIsoDate(doc.assessedAt)) problems.push('assessedAt is not an ISO date')
  if (!isIsoDate(doc.drinkFrom)) problems.push('drinkFrom is not an ISO date')
  if (!isIsoDate(doc.drinkUntil)) problems.push('drinkUntil is not an ISO date')
  if (doc.drinkUntil < doc.drinkFrom) problems.push('drinkUntil precedes drinkFrom')
  if (doc.assessedAt > today) problems.push(`assessedAt ${doc.assessedAt} is in the future`)
  if (!doc.drinkFrom.endsWith('-01-01')) problems.push('drinkFrom is not 1 January')
  if (!doc.drinkUntil.endsWith('-12-31')) problems.push('drinkUntil is not 31 December')
  if (doc.reviewState !== 'proposed') problems.push('reviewState must be proposed')
  if (doc.sourceMethod !== 'extracted') problems.push('sourceMethod must be extracted')
  if (!doc.wine._ref) problems.push('wine reference is empty')
  if (!doc.derivedFrom._ref) problems.push('derivedFrom reference is empty')

  return problems
}
