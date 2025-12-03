import 'reflect-metadata'
import '@sker/workflow'
import '@sker/workflow-ast'
import '@sker/workflow-browser'  // 导入即自动注册
import { root } from '@sker/core'
import { providers } from '@sker/sdk'
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'

root.set(providers({ baseURL: `http://localhost:8089` }))
const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions',
    'storybook-dark-mode',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = config.plugins || []
    config.plugins.push(tailwindcss() as any)

    // 配置 esbuild 支持装饰器
    config.esbuild = {
      ...config.esbuild,
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      },
    }

    // 配置 react-docgen 插件跳过 renderer 文件
    config.plugins = config.plugins?.map((plugin: any) => {
      if (plugin?.name === 'storybook:react-docgen-plugin') {
        return {
          ...plugin,
          transform(code: string, id: string) {
            // 跳过 renderer 文件
            if (id.includes('Render.tsx') || id.includes('/renderers/')) {
              return null
            }
            return plugin.transform?.call(this, code, id)
          },
        }
      }
      return plugin
    })

    return config
  },
}

export default config
