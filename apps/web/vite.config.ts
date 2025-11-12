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
        target: 'http://localhost:9001',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:9001',
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
