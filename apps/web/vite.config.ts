import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import swc from 'vite-plugin-swc-transform'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
    }),
  ],
  server: {
    port: 3000,
    host: true,
    // 配置代理
    proxy: {
      // API请求代理
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // WebSocket代理
      '/ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '')
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
