import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true, // 暂时禁用 dts 构建，因为有类型错误
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'node18',
})