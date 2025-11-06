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
          externalHelpers: true,
        },
      },
    }),
  ],

  optimizeDeps: {
    exclude: [
      '@sker/workflow',
      '@sker/workflow-ui',
      '@sker/core',
      '@sker/entities',
    ],
    include: [
      '@xyflow/react',
    ],
  },

  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages/],
    },
  },
})
