import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import swc from 'vite-plugin-swc-transform'

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
    host: true,
    proxy: {
      '/api': {
        target: 'http://43.240.223.138:3004/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // WebSocket代理
      '/ws': {
        target: 'ws://43.240.223.138:3004/',
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
