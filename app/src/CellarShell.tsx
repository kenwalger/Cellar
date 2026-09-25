import {Suspense, useState, type ComponentType, type ReactNode} from 'react'
import {AsOfControl} from './AsOfControl'
import {CellarHealth} from './CellarHealth'
import {DrinkSoon} from './DrinkSoon'
import {MissedOpportunities} from './MissedOpportunities'
import {DATASET, today} from './sanity'

/**
 * Everything both surfaces have in common, which is everything except how the
 * cellar is fetched.
 *
 * The masthead, the clock, the `asOf` state, the Suspense placement and all
 * three views live here and nowhere else. `App` renders this inside
 * `SanityApp` with the App SDK provider; `PublicApp` renders it bare with the
 * `@sanity/client` provider. A view can therefore not behave differently on
 * the two surfaces, because there is only one of it — which was the condition
 * for building the public version at all.
 *
 * The provider arrives as a component rather than as rendered children so the
 * Suspense boundary can sit *outside* it here. Passing `<Provider>…</Provider>`
 * in from the caller would put the boundary in the caller too, and then the
 * rule below about the control would have to be re-obeyed in two places.
 */
export interface CellarShellProps {
  /** Fills `CellarContext`. Suspends while it fetches; both of ours do. */
  Provider: ComponentType<{children: ReactNode}>
}

export function CellarShell({Provider}: CellarShellProps) {
  // The clock is read exactly once, here, at mount. `useState` is given the
  // function rather than its result so a re-render cannot move the cellar's
  // notion of "now" underneath the reader mid-session.
  const [todayDate] = useState(today)
  const [asOf, setAsOf] = useState(todayDate)

  return (
    <>
      {/*
        The control sits outside the Suspense boundary deliberately. Nothing
        it does can re-suspend the fetch today, since `asOf` is not among
        either provider's inputs — but placement makes that structural rather
        than incidental, and a slider that vanishes into a fallback mid-drag is
        the one failure this view cannot afford on camera.
      */}
      <header className="masthead">
        <h1>The Cellar</h1>
        {/*
          Which cellar these numbers came from, shown only when it is not the
          real one. Silence means production, and a label on every screen would
          train the reader to stop seeing it. The Studio and the App take their
          dataset from different mechanisms — see the comment on DATASET — so
          "am I looking at the dataset I just wrote to?" is a question worth
          answering on the screen rather than from memory.

          It guards the public build too: a static page published while this
          literal said `staging` would be a permanent public demo of the wrong
          cellar, and this is the only thing on screen that would say so.
        */}
        {DATASET !== 'production' && <p className="masthead-dataset">dataset: {DATASET}</p>}
        <AsOfControl value={asOf} today={todayDate} onChange={setAsOf} />
      </header>

      {/*
        Both providers suspend, so every fetching component needs a boundary.
        The provider is the only thing that fetches: one query and one
        `buildCellar` for every view below it, rather than one each.
      */}
      <Suspense fallback={<p className="loading">Reading the cellar…</p>}>
        <Provider>
          <CellarHealth asOf={asOf} />
          <DrinkSoon asOf={asOf} />
          {/*
            The only view given two dates. `asOf` chooses the period it looks
            at; `todayDate` is where the bottles actually are, and it does not
            follow the slider. See the `today` prop.
          */}
          <MissedOpportunities asOf={asOf} today={todayDate} />
        </Provider>
      </Suspense>
    </>
  )
}
