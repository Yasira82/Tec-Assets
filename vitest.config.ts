import { defineConfig } from 'vitest/config';
import path             from 'path';

export default defineConfig({
  // ✅ esbuild يتعامل مع JSX بدل tsconfig jsx:preserve
  esbuild: {
    jsx:             'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'happy-dom',
    include:     ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude:     ['node_modules', 'e2e', '.next'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
