
import type { Preview } from '@storybook/react'
import '@sker/ui/globals.css'
import 'reflect-metadata'
import '@sker/workflow'
import '@sker/workflow-ast'
import '@sker/workflow-browser'
import '@sker/sdk'
import { createAuthClient } from 'better-auth/client'
import { createSkerClientPlugin } from '@sker/sdk'

// 使用 Better Auth 插件初始化 SDK
// 插件会自动执行李代桃僵，将所有 Controller 注册到 DI 容器
const auth = createAuthClient({
  baseURL: 'http://localhost:8089',
  plugins: [createSkerClientPlugin()]
})

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
