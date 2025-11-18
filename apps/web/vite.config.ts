import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import swc from 'vite-plugin-swc-transform'

// 类型安全的插件配置，避免版本冲突
export default defineConfig({
  plugins: [
    react() as PluginOption,
    tailwindcss() as PluginOption,
    swc({
      swcOptions: {
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
        },
      },
    }) as PluginOption,
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom', '@xyflow/react'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', '@xyflow/react'],
  },

  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages/],
    },
  },
})
