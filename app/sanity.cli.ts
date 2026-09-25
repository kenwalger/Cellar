import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'opyntsvcl',
    entry: './src/App.tsx',
    title: 'The Cellar',
  },
  deployment: {
    appId: 'gcxu5htdwn5n9lc15m64sfpp',
  },
})
