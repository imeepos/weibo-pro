import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  external: [
    // 排除所有 workspace 依赖
    /^@sker\//,
    // 排除 node_modules 中的依赖
    /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/
  ],
  noExternal: [],
  platform: 'node',
  shims: false,
  minify: false,
  keepNames: true,
  bundle: true,
});
