/**
 * The page a signed-out visitor (or a Pi reviewer) sees first must say what the app is —
 * and only what it does today. Round 3 credibility review, 16 Nov 2026.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('landing page', () => {
  it('says what the app is', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'page.tsx'), 'utf8');
    expect(src).toContain('Own and manage your Pi-native assets — NFTs, domains and more — in one wallet.');
  });
});
