/** @type {import('tsup').Options} */
module.exports = {
  entry: ['src/main.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  platform: 'node',
  minify: false,
  keepNames: true,
  bundle: false,
  skipNodeModulesBundle: true,
};
