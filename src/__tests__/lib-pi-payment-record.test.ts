import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPaymentRecord, createU2APayment, PaymentResult } from '@/lib/pi-payment';

const mockFetch = vi.fn();
global.fetch = mockFetch;

type PiCallbacks = {
  onReadyForServerApproval:   (piPaymentId: string) => Promise<void> | void;
  onReadyForServerCompletion: (piPaymentId: string, txid: string) => Promise<void> | void;
  onCancel: () => void;
  onError:  (err: Error) => void;
};

const getPi = () => (window as any).Pi;

describe('createPaymentRecord (src/lib/pi-payment.ts)', () => {
  beforeEach(() => {
    document.cookie = 'tec_access_token=test-token; tec_csrf=test-csrf';
  });

  it('returns nested payment id on success', async () => {
    // C-76: mock the backend create endpoint FIRST
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ data: { payment: { id: 'pay-internal-1' } } }),
    });
    const id = await createPaymentRecord(2, 'listing-1', 'Buy X');
    expect(id).toBe('pay-internal-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/bff/payment/create', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    const call = mockFetch.mock.calls[0][1];
    expect(call.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(call.body)).toEqual({
      amount: 2, product_id: 'listing-1', memo: 'Buy X', source: 'assets',
    });
  });

  it('falls back to top-level id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ id: 'flat-id' }),
    });
    expect(await createPaymentRecord(1, 'p', 'm')).toBe('flat-id');
  });

  it('returns null when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({}) });
    expect(await createPaymentRecord(1, 'p', 'm')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    expect(await createPaymentRecord(1, 'p', 'm')).toBeNull();
  });

  it('returns null when payload has no id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    expect(await createPaymentRecord(1, 'p', 'm')).toBeNull();
  });

  it('omits Authorization header when no token cookie', async () => {
    document.cookie = 'tec_csrf=test-csrf';
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'x' }) });
    await createPaymentRecord(1, 'p', 'm');
    const call = mockFetch.mock.calls[0][1];
    expect(call.headers.Authorization).toBeUndefined();
  });
});

describe('createU2APayment (src/lib/pi-payment.ts)', () => {
  let savedPi: unknown;

  beforeEach(() => {
    document.cookie = 'tec_access_token=test-token; tec_csrf=test-csrf';
    savedPi = (window as any).Pi;
    (window as any).Pi = { authenticate: vi.fn(), createPayment: vi.fn() };
  });

  afterEach(() => {
    (window as any).Pi = savedPi;
  });

  it('fails when Pi SDK missing', async () => {
    delete (window as any).Pi;
    const res = await createU2APayment(1, 'memo', {}, 'int-1');
    expect(res).toEqual({ status: 'error', success: false, message: 'Pi SDK not ready' });
  });

  it('fails when Pi.authenticate rejects', async () => {
    getPi().authenticate.mockRejectedValueOnce(new Error('denied'));
    const res = await createU2APayment(1, 'memo', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toContain('Pi auth failed');
    expect(res.message).toContain('denied');
  });

  it('resolves incomplete payment via callback during authenticate', async () => {
    getPi().authenticate.mockImplementationOnce(
      async (_scopes: string[], cb: (p: unknown) => Promise<void>) => {
        await cb({ identifier: 'pi-incomplete-1' });
      },
    );
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => { cbs.onCancel(); },
    );
    const res = await createU2APayment(1, 'memo', {}, 'int-1');
    expect(res.status).toBe('cancelled');
    expect(mockFetch).toHaveBeenCalledWith('/api/bff/payment/resolve-incomplete',
      expect.objectContaining({ method: 'POST' }));
  });

  it('completes successfully through approve + complete callbacks', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/bff/payment/approve')  return { ok: true, status: 200, json: async () => ({}) };
      if (url === '/api/bff/payment/complete') return { ok: true, status: 200, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({}) };
    });
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerApproval('pi-1');
        await cbs.onReadyForServerCompletion('pi-1', 'tx-9');
      },
    );
    const res = await createU2APayment(3, 'Buy thing', { source: 'assets' }, 'int-77');
    expect(res).toEqual({
      status: 'completed', success: true, paymentId: 'int-77', txid: 'tx-9',
    });
    const approveBody = JSON.parse(
      mockFetch.mock.calls.find(c => c[0] === '/api/bff/payment/approve')![1].body,
    );
    expect(approveBody).toEqual({ payment_id: 'int-77', pi_payment_id: 'pi-1' });
    mockFetch.mockReset();
  });

  it('fails when approve returns error', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 422,
      json: async () => ({ error: { message: 'approve rejected' } }),
    });
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerApproval('pi-1');
      },
    );
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toBe('approve rejected');
  });

  it('fails when approve fetch throws', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    mockFetch.mockRejectedValueOnce(new Error('net down'));
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerApproval('pi-1');
      },
    );
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toContain('net down');
  });

  it('fails when complete returns error', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 409, json: async () => ({ error: { message: 'already done' } }),
    });
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerCompletion('pi-1', 'tx');
      },
    );
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toBe('already done');
  });

  it('fails when complete fetch throws', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    getPi().createPayment.mockImplementationOnce(
      async (_d: unknown, cbs: PiCallbacks) => {
        await cbs.onReadyForServerCompletion('pi-1', 'tx');
      },
    );
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toContain('boom');
  });

  it('resolves cancelled on onCancel', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => cbs.onCancel(),
    );
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res).toEqual({ status: 'cancelled', success: false });
  });

  it('resolves error on onError callback', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => cbs.onError(new Error('pi exploded')),
    );
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toBe('pi exploded');
  });

  it('resolves error when createPayment throws synchronously', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    getPi().createPayment.mockImplementationOnce(() => { throw new Error('sync fail'); });
    const res = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('error');
    expect(res.message).toContain('sync fail');
  });

  it('only settles once (first result wins)', async () => {
    getPi().authenticate.mockResolvedValueOnce({});
    getPi().createPayment.mockImplementationOnce(
      (_d: unknown, cbs: PiCallbacks) => {
        cbs.onCancel();
        cbs.onError(new Error('late'));
      },
    );
    const res: PaymentResult = await createU2APayment(1, 'm', {}, 'int-1');
    expect(res.status).toBe('cancelled');
  });
});
