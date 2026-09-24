import { describe, it, expect } from 'vitest';
import { readFollowUp } from '@/lib/purchase-followup';

// 409 used to be read as "already done — success". It now means the payment was
// refused after π moved (sold first, underpaid): showing success there hides a refund.

describe('readFollowUp', () => {
  it('200/201 is delivered', async () => {
    expect(await readFollowUp(Response.json({}, { status: 200 }))).toEqual({ state: 'done' });
    expect(await readFollowUp(Response.json({}, { status: 201 }))).toEqual({ state: 'done' });
  });

  it('202 is pending — the event delivers it', async () => {
    expect(await readFollowUp(Response.json({ status: 'pending' }, { status: 202 }))).toEqual({ state: 'pending' });
  });

  it('409 with an outcome is a refusal that names the refund', async () => {
    const f = await readFollowUp(Response.json({ outcome: 'REJECTED_NOT_AVAILABLE' }, { status: 409 }));
    expect(f.state).toBe('rejected');
    expect(f).toMatchObject({ message: expect.stringContaining('refund') });
  });

  it('anything else is a failed call, with the server\'s message', async () => {
    expect(await readFollowUp(Response.json({ error: 'Bad gateway' }, { status: 502 })))
      .toEqual({ state: 'failed', message: 'Bad gateway' });
  });
});
