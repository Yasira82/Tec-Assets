import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createU2APayment } from '@/lib-client/pi/pi-payment';

const mockFetch = vi.fn();
global.fetch = mockFetch;

type PiCallbacks = {
  onReadyForServerApproval:   (paymentId: string) => Promise<void> | void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => Promise<void> | void;
  onCancel: (paymentId: string) => void;
  onError:  (error: unknown) => void;
};

const getPi = () => (window as any).Pi;

describe('createU2APayment (src/lib-client/pi/pi-payment.ts)', () => {
  let savedPi: unknown;

  beforeEach(() => {
    document.cookie = 'tec_access_token=test-token; tec_csrf=test-csrf';
    savedPi = (window as any).Pi;
    (window as any).Pi = { authenticate: vi.fn(), createPayment: vi.fn() };
    delete (window as any).__tec_payment_id;
  });

  afterEach(() => {
    (window as any).Pi = savedPi;
    delete (window as any).__tec_payment_id;
  });

  it('fails when Pi SDK missing', async () => {
    delete (window as any).Pi;
    const res = await createU2APayment(2, 'memo');
    expect(res).toEqual({ success: false, status: 'failed', message: 'Open in Pi Browser' });
  });

  it('completes: approve stores db payment id, complete uses it', async () => {
    // C-76 backend-first: approve endpoint mocked before Pi callbacks fire
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/payment/approve') {
        return { ok: true, status: 200, json: async () => ({ payment_id: 'db-pay-1' }) };
      }
      if (url === '/api/payment/complete') {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerApproval('pi-pay-1');
        await cbs.onReadyForServerCompletion('pi-pay-1', 'tx-1');
      },
    );
    const res = await createU2APayment(2, 'Mint NFT', { source: 'assets' });
    expect(res).toEqual({ success: true, status: 'completed', txid: 'tx-1', paymentId: 'pi-pay-1' });

    const completeBody = JSON.parse(
      mockFetch.mock.calls.find(c => c[0] === '/api/payment/complete')![1].body,
    );
    expect(completeBody).toEqual({ paymentId: 'db-pay-1', txid: 'tx-1' });
    const approveCall = mockFetch.mock.calls.find(c => c[0] === '/api/payment/approve')![1];
    expect(approveCall.headers['x-csrf-token']).toBe('test-csrf');
    mockFetch.mockReset();
  });

  it('approve failure logs and continues (no resolve)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let captured: PiCallbacks | null = null;
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => { captured = cbs; },
    );
    const promise = createU2APayment(1, 'm');
    // wait for createPayment registration
    await vi.waitFor(() => expect(captured).not.toBeNull());
    await captured!.onReadyForServerApproval('pi-1');
    // payment not settled yet — cancel it to resolve
    captured!.onCancel('pi-1');
    const res = await promise;
    expect(res.status).toBe('cancelled');
  });

  it('approve network error is swallowed', async () => {
    mockFetch.mockRejectedValueOnce(new Error('net'));
    let captured: PiCallbacks | null = null;
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => { captured = cbs; },
    );
    const promise = createU2APayment(1, 'm');
    await vi.waitFor(() => expect(captured).not.toBeNull());
    await captured!.onReadyForServerApproval('pi-1');
    captured!.onError(new Error('later error'));
    const res = await promise;
    expect(res).toEqual({ success: false, status: 'failed', message: 'later error' });
  });

  it('complete failure resolves failed with backend message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 409, json: async () => ({ message: 'dup tx' }),
    });
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerCompletion('pi-1', 'tx-1');
      },
    );
    const res = await createU2APayment(1, 'm');
    expect(res).toEqual({ success: false, status: 'failed', message: 'dup tx' });
  });

  it('complete failure without message uses default', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 500, json: async () => { throw new Error('not json'); },
    });
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerCompletion('pi-1', 'tx-1');
      },
    );
    const res = await createU2APayment(1, 'm');
    expect(res.message).toBe('Completion failed');
  });

  it('complete network error resolves Network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerCompletion('pi-1', 'tx-1');
      },
    );
    const res = await createU2APayment(1, 'm');
    expect(res).toEqual({ success: false, status: 'failed', message: 'Network error' });
  });

  it('onCancel resolves cancelled', async () => {
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => cbs.onCancel('pi-1'),
    );
    const res = await createU2APayment(1, 'm');
    expect(res).toEqual({ success: false, status: 'cancelled' });
  });

  it('onError with non-Error resolves generic message', async () => {
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => cbs.onError('string err'),
    );
    const res = await createU2APayment(1, 'm');
    expect(res).toEqual({ success: false, status: 'failed', message: 'Payment error' });
  });
});
