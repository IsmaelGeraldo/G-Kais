import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['vite'],
  sourcemap: true,
  outfile: 'dist/server.mjs',
  banner: {
    js: "import { createRequire as __gkaisCreateRequire } from 'node:module'; const require = __gkaisCreateRequire(import.meta.url);"
  }
});
