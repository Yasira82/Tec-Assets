import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Pro-status contract — REGRESSION GUARD (consumer side).
//
// The fleet-wide Pro-detection incident: a BFF read `.data.plan` instead of
// `.data.subscription.plan`, silently resolved FREE, and every Pro-gated feature
// stayed locked for paying users. The unit test had mocked a FLAT shape, so it
// green-lit the bug. Lesson recorded in KB: "a BFF unit test is only as good as
// the response shape it mocks."
//
// So this test mocks the REAL nested commerce envelope
//   { data: { subscription: { plan, isActive, isExpired, current_period_end, daysRemaining } } }
// and asserts the canonical resolver lights Pro up. If someone ever regresses the
// resolver to read a flat shape, THIS fails. New apps inherit this guard by cloning
// the template — they must NOT hand-roll another parser.
// ─────────────────────────────────────────────────────────────────────────────
const GW = 'https://api.example.com';
process.env.API_GATEWAY_URL = GW;
process.env.INTERNAL_SECRET = 'secret';

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data } as Response);

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.API_GATEWAY_URL = GW;
  process.env.INTERNAL_SECRET = 'secret';
});

describe('resolveProState — commerce envelope contract', () => {
  it('lights Pro up for the REAL nested shape { data: { subscription } }', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      ok({ data: { subscription: {
        plan: 'PRO', isActive: true, isExpired: false,
        current_period_end: new Date(Date.now() + 20 * 86_400_000).toISOString(),
        daysRemaining: 20,
      } } }),
    );
    const { resolveProState } = await import('@/lib/subscription/pro-status');
    const state = await resolveProState('tok');

    expect(state.pro).toBe(true);              // the bug: this was false for real Pro
    expect(state.plan).toBe('PRO');
    expect(state.isExpired).toBe(false);
    expect(state.daysRemaining).toBe(20);      // renewal-reminder input flows through
  });

  it('does NOT grant Pro for a lapsed (expired) paid plan — fail closed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      ok({ data: { subscription: {
        plan: 'PRO', isActive: false, isExpired: true,
        current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
        daysRemaining: 0,
      } } }),
    );
    const { resolveProState } = await import('@/lib/subscription/pro-status');
    const state = await resolveProState('tok');

    expect(state.pro).toBe(false);
    expect(state.isExpired).toBe(true);
  });

  it('returns FREE (fail closed) on a non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response);
    const { resolveProState } = await import('@/lib/subscription/pro-status');
    expect((await resolveProState('tok')).pro).toBe(false);
  });

  it('returns FREE (fail closed) with no session token — never trusts a client field (P6)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const { resolveProState } = await import('@/lib/subscription/pro-status');
    const state = await resolveProState('');
    expect(state.pro).toBe(false);
    expect(spy).not.toHaveBeenCalled();        // no token → no upstream call at all
  });

  it('regression: the OLD flat-shape read would MISS a real Pro (why nested matters)', async () => {
    // This documents the exact bug shape. The commerce response is nested; a parser
    // that reads `.data.plan` (flat) sees undefined → FREE. The canonical resolver
    // reads `.data.subscription.plan`, so it correctly returns Pro. If the resolver
    // regresses to flat, the first test in this file fails — this one explains why.
    const nested = { data: { subscription: { plan: 'PRO', isActive: true, isExpired: false } } } as any;
    expect(nested.data.plan).toBeUndefined();            // the trap
    expect(nested.data.subscription.plan).toBe('PRO');   // the contract
  });
});

describe('resolveProState — legacy / gift pass through as commerce says them', () => {
  it('the Founding gift reads legacy + gift (no Cancel); an admin\'s gift reads legacy:false', async () => {
    const end = new Date(Date.now() + 170 * 86_400_000).toISOString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      ok({ data: { subscription: { plan: 'PRO', isActive: true, current_period_end: end, daysRemaining: 170, legacy: true, gift: true } } }),
    );
    const { resolveProState } = await import('@/lib/subscription/pro-status');
    expect(await resolveProState('tok')).toMatchObject({ pro: true, legacy: true, gift: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      ok({ data: { subscription: { plan: 'PRO', isActive: true, current_period_end: end, legacy: false, gift: true } } }),
    );
    expect(await resolveProState('tok')).toMatchObject({ pro: true, legacy: false, gift: true });
  });

  it('a field commerce does not send is false, never guessed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(ok({ data: { subscription: { plan: 'PRO', isActive: true } } }));
    const { resolveProState } = await import('@/lib/subscription/pro-status');
    expect(await resolveProState('tok')).toMatchObject({ legacy: false, gift: false });
  });
});
