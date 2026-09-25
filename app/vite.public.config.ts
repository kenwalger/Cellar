import {defineConfig} from 'vite'

/**
 * The public build. Deliberately not `vite.config.ts`.
 *
 * Vite auto-discovers `vite.config.{js,ts,mjs,cjs,mts,cts}` and nothing else,
 * so this name cannot be picked up implicitly — by Vite, or by `sanity build`,
 * which runs Vite internally. It has to be passed with `-c`. The same package
 * is therefore built two ways without either build knowing about the other,
 * and `sanity build` was run after this file existed to confirm it.
 *
 * Paths are relative to the working directory, which the npm scripts make the
 * package root. Resolving them from `import.meta.url` would be sturdier and
 * needs `node:path` — and this file is matched by the package's `tsconfig.json`,
 * which has no `@types/node`. Adding Node types to a browser app's typecheck
 * to tidy a build config is the wrong trade.
 */
export default defineConfig({
  // The entry lives in its own directory so there is no `index.html` at the
  // package root for the Sanity CLI to trip over.
  root: 'public-entry',

  /**
   * GitHub Pages serves this repository at `https://kenwalger.github.io/Cellar/`,
   * not at the domain root. Vite's default `base` of `/` would emit
   * `<script src="/assets/…">`, which resolves to `kenwalger.github.io/assets/…`
   * — the wrong path, a 404, and a blank page whose only symptom is in the
   * console. Change this if the repository is renamed or a custom domain is
   * added; those are the two things that move it.
   */
  base: '/Cellar/',

  build: {
    // Relative to `root`, hence the `..`. Not `dist/`, which `sanity build`
    // owns and empties.
    outDir: '../dist-public',
    emptyOutDir: true,
  },
})
