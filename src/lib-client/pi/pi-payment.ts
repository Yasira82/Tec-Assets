import { PiPaymentData, PiPaymentCallbacks } from '@/types/pi.types';

export interface PaymentResult {
  success:    boolean;
  status:     'completed' | 'cancelled' | 'failed';
  txid?:      string;
  paymentId?: string;
  message?:   string;
}

const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)tec_csrf=([^;]*)/);
  return match ? match[1] : '';
};

const getW = (): Record<string, unknown> =>
  window as unknown as Record<string, unknown>;

// ✅ نفس Commerce بالظبط — Pi.createPayment مباشرة
export const createU2APayment = (
  amount:   number,
  memo:     string,
  metadata: Record<string, unknown> = {},
): Promise<PaymentResult> => {
  return new Promise(async (resolve) => {
    if (!window.Pi || !(window as any).__TEC_PI_READY) {
  resolve({
    success: false,
    status: 'failed',
    message: 'Pi SDK not ready',
  });
  return;
    }

    // ✅ Pi.createPayment مباشرة
    const paymentData: PiPaymentData = { amount, memo, metadata };

    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: async (paymentId: string) => {
        try {
          const res = await fetch('/api/payment/approve', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
            body: JSON.stringify({ paymentId, pi_payment_id: paymentId }),
          });
          if (!res.ok) { console.error('[Payment] Approve failed:', res.status); return; }
          const data = await res.json().catch(() => ({}));
          if (data.payment_id) getW().__tec_payment_id = data.payment_id;
        } catch (e) { console.error('[Payment] Approve error:', e); }
      },

      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        try {
          const dbPaymentId = (getW().__tec_payment_id as string) ?? paymentId;
          const res = await fetch('/api/payment/complete', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
            body: JSON.stringify({ paymentId: dbPaymentId, txid }),
          });
          if (res.ok) {
            resolve({ success: true, status: 'completed', txid, paymentId: dbPaymentId });
          } else {
            const data = await res.json().catch(() => ({}));
            resolve({ success: false, status: 'failed', message: (data as any)?.message ?? 'Completion failed' });
          }
        } catch {
          resolve({ success: false, status: 'failed', message: 'Network error' });
        }
      },

      onCancel: (_paymentId: string) => resolve({ success: false, status: 'cancelled' }),

      onError: (error: unknown) => {
        const msg = error instanceof Error ? error.message : 'Payment error';
        resolve({ success: false, status: 'failed', message: msg });
      },
    };

    try {
      window.Pi.createPayment(paymentData, callbacks);
    } catch (err) {
      resolve({ success: false, status: 'failed', message: String(err) });
    }
  });
};
