import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {PublicApp} from '../src/PublicApp'

/**
 * Mount point for the public build, and the only file the App SDK surface has
 * no equivalent of — `sanity build` supplies its own.
 *
 * This directory is the Vite root, which keeps it out of the way of
 * `sanity build`: there is no `index.html` at the package root for the Sanity
 * CLI to find, and the config that reads this one is named
 * `vite.public.config.ts`, which Vite never auto-discovers.
 */
const container = document.getElementById('root')
if (!container) throw new Error('#root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <PublicApp />
  </StrictMode>,
)
