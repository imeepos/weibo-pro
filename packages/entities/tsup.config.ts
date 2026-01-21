import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true, // 改为 true 确保清理旧产物
  splitting: false,
  sourcemap: true,
  target: 'node18',
})