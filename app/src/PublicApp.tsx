import {CellarShell} from './CellarShell'
import {PublicCellarProvider} from './PublicCellarProvider'
import './App.css'

/**
 * The public surface: the same cellar, served as a static page.
 *
 * It exists because the App SDK has no anonymous-read mode. `AuthBoundary`
 * renders its children only when authenticated and redirects a logged-out
 * visitor to a login page before any query is issued, and every typed auth
 * option resolves to a user token — so a bundle containing `SanityApp` cannot
 * be shown to anyone outside the organization, no matter how public the
 * dataset is. This file is that bundle without it.
 *
 * Note what is *not* here: no fallback prop, no config array, no provider
 * from Sanity. The shell is identical, the views are the same modules, and
 * the only difference in the whole tree is which provider fills the context.
 */
export function PublicApp() {
  return (
    <div className="app-container">
      <CellarShell Provider={PublicCellarProvider} />
    </div>
  )
}

export default PublicApp
