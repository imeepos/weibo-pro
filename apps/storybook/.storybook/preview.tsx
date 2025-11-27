import type { Preview } from '@storybook/react'
import '../src/styles.css'
import '@sker/ui/styles'
import '@sker/workflow-ui/styles'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    darkMode: {
      classTarget: 'html',
      darkClass: 'dark',
      lightClass: 'light',
      stylePreview: true,
    },
  },
}

export default preview
