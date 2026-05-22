import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as {
      listing_id: string;
      payment_id: string;
      txid?:      string;
    };

    if (!body.listing_id || !body.payment_id) {
      return Response.json(
        { error: 'listing_id and payment_id required' },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/${encodeURIComponent(body.listing_id)}/buy`,
      {
        method: 'POST',
        cache:  'no-store',
        headers: {
          'Content-Type':   'application/json',
          Authorization:    `Bearer ${token}`,
          'x-request-id':   ctx.requestId,
          'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        },
        body: JSON.stringify({
          buyerId:   ctx.userId,       // ✅ من الـ JWT — مش من الـ body
          paymentId: body.payment_id,
        }),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[BFF marketplace/buy] failed:', res.status, data);
    }

    return Response.json(data, { status: res.status });
  },
});
