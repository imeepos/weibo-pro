import type { Preview } from '@storybook/react'
import { useEffect } from 'react'
import { useDarkMode } from 'storybook-dark-mode'
import '../src/styles.css'
import '@sker/ui/styles'
import '@sker/workflow-ui/styles'

const DarkModeDecorator = (Story: any) => {
  const isDark = useDarkMode()

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return <Story />
}

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
      lightClass: '',
      stylePreview: true,
    },
  },
  decorators: [DarkModeDecorator],
}

export default preview
