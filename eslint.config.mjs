// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import path           from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'e2e/**',
      '**/__tests__/**',
      '*.config.*',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Asset images are arbitrary URLs (user uploads, NFT media). next/image needs
      // every host listed in next.config, so a plain <img> is the intended element
      // here — the same call Tec-Ecommerce made.
      '@next/next/no-img-element': 'off',
    },
  },
];
