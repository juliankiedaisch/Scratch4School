import { defineConfig } from 'vite'
import packageJson from './package.json'

// Externalize all dependencies, peerDependencies, and optionalDependencies, but not devDependencies.
// Inspired in part by `davidmyersdev/vite-plugin-externalize-deps`.
// Note that recent versions of Vite automatically externalize Node built-in modules.
// Adding Node built-ins here suppresses warnings, but I say we want those warnings...
const externalDeps = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
  ...Object.keys(packageJson.optionalDependencies || {}),
].map(name => new RegExp(`^${name}(?:/.*)?$`))

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'TaskHerder',
      fileName: 'task-herder',
    },
    rolldownOptions: {
      external: externalDeps,
      output: {
        /**
         * Customize the global variable names for externalized dependencies in UMD builds.
         * @param {string} depName - The name of a dependency
         * @returns {string} - The global variable name to use for the dependency
         */
        globals: depName => {
          switch (depName) {
            case 'p-limit':
              return 'pLimit'
            default:
              return depName
          }
        },
      },
    },
  },
})
