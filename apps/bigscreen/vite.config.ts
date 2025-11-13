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
      port: 3000,
      host: true,
      // 配置代理
      proxy: {
        '/api': {
          target: 'http://localhost:9001',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: 'ws://localhost:9001',
          changeOrigin: true,
          secure: false,
          ws: true,
        }
      }
    },
    build: {
      outDir: projectOutDir,
      target: 'es2020',
      sourcemap: 'hidden', // 生产环境启用隐藏的源码映射，便于调试但不暴露给用户
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
        // 移除外部依赖配置，让所有依赖都打包到bundle中
        output: {
          // 使用自动代码分割

          // 文件命名优化
          chunkFileNames: () => {
            return `assets/js/[name]-[hash:8].js`
          },
          entryFileNames: 'assets/js/[name]-[hash:8].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const extType = info[info.length - 1]

            // 根据资源类型分目录
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
          moduleSideEffects: true,
          propertyReadSideEffects: true,
          tryCatchDeoptimization: true,
        },
      },
    },

    // 优化依赖预构建
    optimizeDeps: {
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
