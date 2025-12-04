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
    host: '127.0.0.1',
    port: 3002,
    proxy: {
      // SSE 专用代理配置 - 必须在普通 API 之前
      '/api/sse': {
        target: 'http://localhost:8089',
        changeOrigin: true,
        secure: false,
        // SSE 关键配置：禁用响应缓冲，允许流式传输
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 设置正确的 SSE 请求头
            proxyReq.setHeader('Accept', 'text/event-stream');
            proxyReq.setHeader('Cache-Control', 'no-cache');
            proxyReq.setHeader('Connection', 'keep-alive');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // 确保响应头支持 SSE
            proxyRes.headers['content-type'] = 'text/event-stream';
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['connection'] = 'keep-alive';
          });
        }
      },
      // 普通 API 代理
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
        secure: false
      },
      // WebSocket 代理
      '/ws': {
        target: 'ws://localhost:8089',
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
    include: ['react', 'react-dom', '@xyflow/react', 'lucide-react'],
  },

  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages/],
    },
  },
})
