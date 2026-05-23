import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as {
      payment_id:     string;
      transaction_id?: string;
      txid?:           string;
      pi_payment_id?:  string;
    };

    const txid = body.transaction_id ?? body.txid ?? '';

    const res = await fetch(`${GATEWAY_URL}/api/payment/complete`, {
      method: 'POST',
      cache:  'no-store',
      headers: {
        'Content-Type':    'application/json',
        Authorization:     `Bearer ${token}`,
        'x-request-id':    ctx.requestId,
        'x-internal-key':  process.env.INTERNAL_SECRET ?? '',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        payment_id:     body.payment_id,
        transaction_id: txid,
        ...(body.pi_payment_id ? { pi_payment_id: body.pi_payment_id } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  },
});
