import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'opyntsvcl',
    entry: './src/App.tsx',
    title: 'The Cellar',
    icon: './icon.svg',
  },
  deployment: {
    appId: 'gcxu5htdwn5n9lc15m64sfpp',
  },
})
