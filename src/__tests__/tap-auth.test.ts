import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateAtTap } from '@/lib/tap-auth';

type W = { Pi?: { authenticate: ReturnType<typeof vi.fn> }; __TEC_PI_AUTHENTICATED?: boolean };
const w = window as unknown as W;

describe('authenticateAtTap — a tap never waits on a sign-in Pi does not answer', () => {
  beforeEach(() => { delete w.__TEC_PI_AUTHENTICATED; vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true })); });
  afterEach(() => { delete w.Pi; vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('true when Pi signs the tab in, and remembers it', async () => {
    w.Pi = { authenticate: vi.fn().mockResolvedValue({ user: { username: 'u' } }) };
    await expect(authenticateAtTap()).resolves.toBe(true);
    expect(w.__TEC_PI_AUTHENTICATED).toBe(true);
    await authenticateAtTap();
    expect(w.Pi.authenticate).toHaveBeenCalledTimes(1);
  });

  it('false when Pi never answers — the deadline, not a hang (the 10 Nov "Mint does nothing")', async () => {
    vi.useFakeTimers();
    w.Pi = { authenticate: vi.fn(() => new Promise(() => { /* never settles */ })) };
    const p = authenticateAtTap(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(p).resolves.toBe(false);
    expect(w.__TEC_PI_AUTHENTICATED).toBeUndefined();
  });

  it('false when Pi rejects, and when there is no SDK', async () => {
    w.Pi = { authenticate: vi.fn().mockRejectedValue(new Error('denied')) };
    await expect(authenticateAtTap()).resolves.toBe(false);
    delete w.Pi;
    await expect(authenticateAtTap()).resolves.toBe(false);
  });

  it('an incomplete payment Pi reports is sent to be resolved, not dropped', async () => {
    w.Pi = { authenticate: vi.fn((_s: string[], cb: (p: unknown) => void) => { cb({ identifier: 'pi_123' }); return Promise.resolve({}); }) };
    await authenticateAtTap();
    expect(fetch).toHaveBeenCalledWith('/api/bff/payment/resolve-incomplete', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ pi_payment_id: 'pi_123' }),
    }));
  });
});
