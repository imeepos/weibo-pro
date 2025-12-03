
import type { Preview } from '@storybook/react'
import '@sker/ui/globals.css'
import 'reflect-metadata'
import '@sker/workflow'
import '@sker/workflow-ast'
import '@sker/workflow-browser'
import { root } from '@sker/core'
import { providers } from '@sker/sdk'

// 初始化 DI 容器
root.set(providers({ baseURL: `http://localhost:8089` }))

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    }
  },
}

export default preview
