import { defineConfig } from 'tsup'

export default defineConfig([
  // Node.js 构建（默认入口）
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    target: 'node18',
    external: ['typeorm', '@sker/core', '@sker/redis', 'ioredis', 'reflect-metadata'],
    // 避免某些优化可能导致的问题
    treeshake: false,
    // 确保正确退出
    onSuccess: async () => {
      // 空钩子，确保正确退出
    },
  },
  // 浏览器构建（仅类型和纯函数）
  {
    entry: ['src/browser.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    target: 'es2020',
    outDir: 'dist/browser',
    // 清理工具函数中可能用到的 Date 等，这些在浏览器中是安全的
    external: [],
    // browser 构建不清理 dist，避免覆盖主构建
    clean: false,
    // 避免某些优化可能导致的问题
    treeshake: false,
  },
])
