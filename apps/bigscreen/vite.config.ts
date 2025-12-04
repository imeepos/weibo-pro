import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import swc from 'vite-plugin-swc-transform'
import path, { join, resolve } from 'path'
import { homedir } from 'os'
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const projectOutDir = resolve(__dirname, 'dist')
  const deployOutDir = join(homedir(), 'sker/nginx/html')
  const isBuild = command === 'build'

  const mirrorOutputPlugin = {
    name: 'mirror-output-to-nginx',
    closeBundle() {
      if (!existsSync(projectOutDir)) return

      if (existsSync(deployOutDir)) {
        rmSync(deployOutDir, { recursive: true, force: true })
      }

      mkdirSync(deployOutDir, { recursive: true })
      cpSync(projectOutDir, deployOutDir, { recursive: true })
    },
  }

  return {
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
      ...(isBuild ? [mirrorOutputPlugin] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
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
    build: {
      outDir: projectOutDir,
      target: 'es2020',
      sourcemap: false, // 禁用 sourcemap 减少内存使用
      cssCodeSplit: true, // 启用CSS代码分割
      assetsInlineLimit: 4096, // 小于4KB的资源内联

      // 压缩配置
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // 移除console
          drop_debugger: true, // 移除debugger
          pure_funcs: ['console.log', 'console.debug'], // 移除特定函数
          reduce_vars: true,
          reduce_funcs: true,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false, // 移除注释
        },
      },

      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
      rollupOptions: {
        output: {
          // 优化代码分割策略
          manualChunks(id) {
            // 将 node_modules 中的依赖分割到 vendor chunk
            if (id.includes('node_modules')) {
              // 大型库单独分割
              if (id.includes('echarts')) {
                return 'vendor-echarts'
              }
              if (id.includes('monaco-editor')) {
                return 'vendor-monaco'
              }
              if (id.includes('@xyflow') || id.includes('react-flow')) {
                return 'vendor-workflow'
              }
              return 'vendor'
            }
          },

          // 文件命名优化
          chunkFileNames: 'assets/js/[name]-[hash:8].js',
          entryFileNames: 'assets/js/[name]-[hash:8].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const extType = info[info.length - 1]

            // 根据资源类型分目录
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || '')) {
              return `assets/media/[name]-[hash:8][extname]`
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash:8][extname]`
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash:8][extname]`
            }
            if (/\.css$/i.test(assetInfo.name || '')) {
              return `assets/css/[name]-[hash:8][extname]`
            }

            return `assets/misc/[name]-[hash:8][extname]`
          },
        },

        // Tree shaking优化
        treeshake: {
          moduleSideEffects: true, // 必须设为 true，否则 React 组件会被 tree-shake 掉
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },

    // 优化依赖预构建
    optimizeDeps: {
      force: true,
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'dayjs', 'clsx', 'tailwind-merge', 'zustand', 'lucide-react'],
      exclude: ['echarts', 'web-vitals', '@sker/core', '@sker/workflow', '@sker/workflow-ui'],
      esbuildOptions: {
        target: 'es2020',
      },
    },

    // CSS优化
    css: {
      devSourcemap: false,
      modules: {
        generateScopedName: command === 'build' ? '[hash:base64:5]' : '[local]_[hash:base64:5]',
      },
    },

    // 预加载优化
    experimental: {
      renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
        // 可以配置CDN地址
        return { relative: true }
      },
    },
  }
})
