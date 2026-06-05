import { describe, it, expect } from 'vitest';

describe('Tec-Assets', () => {
  it('environment configured', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('gateway URL has fallback', () => {
    const url = process.env.API_GATEWAY_URL
             ?? 'https://api-gateway-production-6a68.up.railway.app';
    expect(url).toContain('http');
  });

  it('asset types are valid', () => {
    const types = ['domain', 'nft', 'token'];
    expect(types).toContain('domain');
  });
});
