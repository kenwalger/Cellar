import {Suspense} from 'react'
import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {CellarHealth} from './CellarHealth'
import {DATASET, PROJECT_ID} from './sanity'
import './App.css'

const config: SanityConfig[] = [
  {
    projectId: PROJECT_ID,
    dataset: DATASET,
  },
]

function App() {
  return (
    <div className="app-container">
      <SanityApp config={config} fallback={<p className="loading">Connecting to Sanity…</p>}>
        {/* SDK data hooks suspend, so every fetching component needs a boundary. */}
        <Suspense fallback={<p className="loading">Reading the cellar…</p>}>
          <CellarHealth />
        </Suspense>
      </SanityApp>
    </div>
  )
}

export default App
