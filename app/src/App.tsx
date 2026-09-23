import {Suspense, useState} from 'react'
import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {AsOfControl} from './AsOfControl'
import {CellarHealth} from './CellarHealth'
import {CellarProvider} from './CellarProvider'
import {DrinkSoon} from './DrinkSoon'
import {MissedOpportunities} from './MissedOpportunities'
import {DATASET, PROJECT_ID, today} from './sanity'
import './App.css'

const config: SanityConfig[] = [
  {
    projectId: PROJECT_ID,
    dataset: DATASET,
  },
]

function App() {
  // The clock is read exactly once, here, at mount. `useState` is given the
  // function rather than its result so a re-render cannot move the cellar's
  // notion of "now" underneath the reader mid-session.
  const [todayDate] = useState(today)
  const [asOf, setAsOf] = useState(todayDate)

  return (
    <div className="app-container">
      <SanityApp config={config} fallback={<p className="loading">Connecting to Sanity…</p>}>
        {/*
          The control sits outside the Suspense boundary deliberately. Nothing
          it does can re-suspend the query today, since `asOf` is not among
          useQuery's options — but placement makes that structural rather than
          incidental, and a slider that vanishes into a fallback mid-drag is
          the one failure this view cannot afford on camera.
        */}
        <header className="masthead">
          <h1>The Cellar</h1>
          {/*
            Which cellar these numbers came from, shown only when it is not the
            real one. Silence means production, and a label on every screen
            would train the reader to stop seeing it. The Studio and the App
            take their dataset from different mechanisms — see the comment on
            DATASET — so "am I looking at the dataset I just wrote to?" is a
            question worth answering on the screen rather than from memory.
          */}
          {DATASET !== 'production' && <p className="masthead-dataset">dataset: {DATASET}</p>}
          <AsOfControl value={asOf} today={todayDate} onChange={setAsOf} />
        </header>

        {/*
          SDK data hooks suspend, so every fetching component needs a boundary.
          The provider is the only thing that fetches now: one query and one
          `buildCellar` for every view below it, rather than one each.
        */}
        <Suspense fallback={<p className="loading">Reading the cellar…</p>}>
          <CellarProvider>
            <CellarHealth asOf={asOf} />
            <DrinkSoon asOf={asOf} />
            {/*
              The only view given two dates. `asOf` chooses the period it looks
              at; `todayDate` is where the bottles actually are, and it does not
              follow the slider. See the `today` prop.
            */}
            <MissedOpportunities asOf={asOf} today={todayDate} />
          </CellarProvider>
        </Suspense>
      </SanityApp>
    </div>
  )
}

export default App
