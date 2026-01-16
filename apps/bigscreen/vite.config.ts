import { defineConfig, type PluginOption, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import swc from 'vite-plugin-swc-transform'
import path, { join, resolve } from 'path'
import { homedir } from 'os'
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'

// 修复 three.js 解析问题的插件
function fixThreeJsPlugin(): Plugin {
  return {
    name: 'fix-three-js',
    enforce: 'pre',
    resolveId(id, importer, options) {
      // 让 Vite 自然解析 three，不需要手动干预
      // 因为 package.json 的 exports 字段会正确指向入口
      return null
    },
  }
}

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
      fixThreeJsPlugin(),
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
      // 确保所有模块使用同一个 React 实例，避免 "Cannot access 'React' before initialization" 错误
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: true,
      // SharedArrayBuffer 支持所需的安全头
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
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
      sourcemap: true, // 启用 sourcemap 用于调试
      cssCodeSplit: true, // 启用CSS代码分割
      assetsInlineLimit: 4096, // 小于4KB的资源内联

      // 压缩配置 - 启用以减小生产包体积
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false, // 保留 console 用于生产调试
          drop_debugger: true,
          reduce_vars: true,
          reduce_funcs: true,
          passes: 2, // 多次压缩以获得更好的效果
        },
        mangle: {
          safari10: true,
          toplevel: true, // 顶级作用域变量名混淆
        },
        format: {
          comments: false,
        },
      },

      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
      rollupOptions: {
        output: {
          // 简化代码分割策略 - 只分离真正独立的大型库
          // 避免复杂的 chunk 分割导致的循环依赖问题
          manualChunks(id) {
            // @sker/* 包不分割，保持在主 bundle 中以确保正确的初始化顺序
            if (id.includes('@sker/')) {
              return undefined; // 不分割
            }

            // better-auth 也不分割，避免初始化顺序问题
            if (id.includes('better-auth')) {
              return undefined; // 不分割
            }

            // 只分离真正独立的大型库
            if (id.includes('node_modules')) {
              // ECharts - 完全独立的图表库
              if (id.includes('echarts') || id.includes('zrender')) {
                return 'vendor-echarts'
              }
              // Three.js 相关 - 完全独立的 3D 库
              if (
                id.includes('/three/') ||
                id.includes('three-') ||
                id.includes('d3-force') ||
                id.includes('force-graph') ||
                id.includes('react-force-graph')
              ) {
                return 'vendor-3d'
              }
            }
            // 其他所有依赖保持在主 bundle 中，避免循环依赖
            return undefined;
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
          moduleSideEffects: (id) => {
            // 排除测试文件的副作用
            if (id.includes('.test.') || id.includes('.spec.')) return false;
            // 其他所有模块保留副作用（默认行为）
            return true;
          },
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },

    // 优化依赖预构建
    optimizeDeps: {
      force: true,
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'dayjs',
        'clsx',
        'tailwind-merge',
        'zustand',
        'lucide-react',
        'rxjs',
        'rxjs/operators',
        'better-auth/client'  // 强制预构建 better-auth
      ],
      exclude: ['echarts', 'web-vitals', '@sker/core', '@sker/workflow', '@sker/workflow-ui', 'three'],
      esbuildOptions: {
        target: 'es2020',
      },
    },

    // SSR 配置 - 强制 three.js 使用 ESM
    ssr: {
      noExternal: ['three'],
    },

    // Web Worker 支持
    worker: {
      format: 'es',
      plugins: () => [
        react() as PluginOption,
        swc({
          swcOptions: {
            jsc: {
              target: 'es2022',
              parser: {
                syntax: 'typescript',
                tsx: false, // Worker 中不使用 TSX
              },
            },
          },
        }) as PluginOption,
      ],
      rollupOptions: {
        output: {
          format: 'es',
        },
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
