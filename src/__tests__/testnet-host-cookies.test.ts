/**
 * On the Testnet host (`*.vercel.app`) a cookie with Domain=.tecosystem.app is dropped by
 * the browser, silently — Tec-Ecommerce #80 found it the hard way (2026-10-10). Every route
 * here that sets or clears a session cookie either sets it host-only or goes through
 * cookieDomainFor.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), `src/app/api/auth/${f}/route.ts`), 'utf8');

describe('session cookies on the Testnet host', () => {
  it('refresh, logout and sso-callback decide the Domain with cookieDomainFor', () => {
    for (const f of ['refresh', 'logout', 'sso-callback']) {
      expect(read(f), f).toContain('cookieDomainFor(');
      expect(read(f), f).not.toMatch(/domain:\s*'\.tecosystem\.app'/);
    }
  });

  it('pi-login sets its cookies host-only', () => {
    expect(read('pi-login')).not.toMatch(/domain:/);
  });
});
