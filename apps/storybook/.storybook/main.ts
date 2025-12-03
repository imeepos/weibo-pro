
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/**/*.mdx',
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',
    'storybook-dark-mode',
    {
      name: "@storybook/addon-react-native-web",
      options: {
        modulesToTranspile: [],
        projectRoot: "../",
      },
    },
  ],
  framework: "@storybook/react-vite",
  docs: {
    autodocs: "tag",
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

    // 配置 react-docgen: 允许装饰器在 export 之前
    config.plugins = config.plugins?.map((plugin: any) => {
      if (plugin?.name === 'storybook:react-docgen-plugin') {
        const originalTransform = plugin.transform
        return {
          ...plugin,
          babelOptions: {
            ...plugin.babelOptions,
            parserOpts: {
              ...plugin.babelOptions?.parserOpts,
              plugins: [
                ['decorators', { decoratorsBeforeExport: true }],
                'typescript',
              ],
            },
          },
          transform(code: string, id: string) {
            if (id.includes('Visitor.ts') || id.includes('Ast.ts') || id.includes('/workflow-')) {
              return null
            }
            return originalTransform?.call(this, code, id)
          },
        }
      }
      return plugin
    })

    return config
  },
}

export default config
