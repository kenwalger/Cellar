import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {CellarProvider} from './CellarProvider'
import {CellarShell} from './CellarShell'
import {DATASET, PROJECT_ID} from './sanity'
import './App.css'

/**
 * The App SDK surface: the cellar inside the Sanity Dashboard.
 *
 * Everything visible is in `CellarShell`, which `PublicApp` also renders. The
 * only thing this file contributes is the App SDK: the `SanityApp` provider
 * that supplies auth and configuration, and the `CellarProvider` that reads
 * through it.
 */

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
        <CellarShell Provider={CellarProvider} />
      </SanityApp>
    </div>
  )
}

export default App
