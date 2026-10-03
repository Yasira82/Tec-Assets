/**
 * A paid NFT / purchase is delivered from the payment's own event, a moment after Pi
 * says "paid" — the follow-up answers 202 until then. The screen used to refresh once
 * on that 202 and the new NFT was missing until the app was reopened (owner,
 * 2026-10-03). followUntilSettled asks again until it is delivered.
 */
import { describe, it, expect, vi } from 'vitest';
import { followUntilSettled } from '@/lib/purchase-followup';

const r = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

describe('followUntilSettled', () => {
  it('asks again through 202s and returns done once delivered', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(r(202))
      .mockResolvedValueOnce(r(202))
      .mockResolvedValueOnce(r(201, { status: 'applied' }));
    expect(await followUntilSettled(send, { delayMs: 0 })).toEqual({ state: 'done' });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('a refused payment stops at once — it is a refund, not a retry', async () => {
    const send = vi.fn().mockResolvedValue(r(409, { outcome: 'REJECTED_UNDERPAID' }));
    const f = await followUntilSettled(send, { delayMs: 0 });
    expect(f.state).toBe('rejected');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('a network blip is retried, not reported', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(r(200));
    expect(await followUntilSettled(send, { delayMs: 0 })).toEqual({ state: 'done' });
  });

  it('gives up as pending after the attempts — the event still delivers it', async () => {
    const send = vi.fn().mockResolvedValue(r(202));
    expect(await followUntilSettled(send, { delayMs: 0, attempts: 4 })).toEqual({ state: 'pending' });
    expect(send).toHaveBeenCalledTimes(4);
  });

  it('waits between attempts', async () => {
    vi.useFakeTimers();
    const send = vi.fn().mockResolvedValueOnce(r(202)).mockResolvedValueOnce(r(201));
    const p = followUntilSettled(send, { delayMs: 2000 });
    await vi.advanceTimersByTimeAsync(1999);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await p).toEqual({ state: 'done' });
    vi.useRealTimers();
  });
});
