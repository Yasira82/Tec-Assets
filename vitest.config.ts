import { defineConfig } from 'vitest/config';
import react            from '@vitejs/plugin-react';
import path             from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals:     true,
    environment: 'happy-dom',
    include:     ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude:     ['node_modules', 'e2e', '.next'],
    setupFiles:  ['./src/app/app/__tests__/setup.ts'],
    // TEC-AUDIT-0037 — a RATCHET below the fleet's 60/60/60/50. Measured 13 Nov 2026 over EVERY
    // file in src/ (an untested file counts as 0, not as absent): 39.82 statements · 32.77 branches · 32.45 functions · 41.25 lines.
    // Set at what it passes today so it can only go up; raise each number as tests are added.
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'json-summary'],
      include:    ['src/**/*.{ts,tsx}'],
      exclude:    ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', 'e2e/**'],
      thresholds: { lines: 41, functions: 32, statements: 39, branches: 32 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
