import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as {
      amount:      number;
      product_id:  string;
      memo:        string;
      source?:     string;
    };

    const res = await fetch(`${GATEWAY_URL}/api/v1/payment/create`, {
      method: 'POST',
      cache:  'no-store',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-request-id':   ctx.requestId,
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({
        userId:         ctx.userId,          // ✅ من JWT — مش من الـ body
        amount:         body.amount,
        currency:       'PI',
        payment_method: 'pi',
        source:         body.source ?? 'assets',
        metadata: {
          product_id: body.product_id,
          memo:       body.memo,
          app_source: 'assets',
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  },
});
