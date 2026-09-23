/** The Sanity project and dataset this app reads. */
export const PROJECT_ID = 'aos9nze5'

/**
 * A literal, edited by hand to point the App at a copy of the cellar.
 *
 * The Studio takes this from `SANITY_STUDIO_DATASET`, and the obvious thing
 * was to do the same here. It does not work, and it fails in the worst
 * available way. Both packages are built by `sanity build`, but the Sanity App
 * build does not substitute the variable the way the Studio build does:
 * setting it and rebuilding emits `{}.SANITY_STUDIO_DATASET||"production"`,
 * unchanged, so the App keeps reading production. `import.meta.env`, with
 * either the `SANITY_STUDIO_` or the `VITE_` prefix, folds to the default too.
 * Verified by building with the variable set and reading the bundle, for both
 * surfaces; the Studio emits ``dataset:`staging` `` and the App does not.
 *
 * A silent fallback to production is precisely the failure that would make
 * every number on screen belong to a dataset nobody thinks they are looking
 * at — the Studio writing to one cellar while the App reports another. A line
 * you have to edit cannot do that: it is in the diff, and `DatasetBadge` in
 * `App` puts it on the screen whenever it is not production.
 */
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
