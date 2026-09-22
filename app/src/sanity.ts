/** The Sanity project and dataset this app reads. */
export const PROJECT_ID = 'aos9nze5'
export const DATASET = 'production'

/**
 * Today, as a calendar date in the viewer's own timezone.
 *
 * The clock is read here, in the app, and never in `@cellar/core` — `asOf`
 * and `now` are always parameters to the resolution module, which is what
 * keeps it reproducible and checkable against an oracle table.
 *
 * Local rather than UTC for the same reason the Studio's validation is: a
 * date carries no timezone, and someone west of Greenwich should not see
 * yesterday's cellar all afternoon.
 *
 * Until the Stage 3 gate passed this returned a fixed 2026-09-18, matching
 * the date `check.py` computed its expected counts for. Since the asOf
 * control landed this is a starting value rather than the only one: `App`
 * calls it once at mount to seed `asOf`, and the user moves it from there.
 */
export function today(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
