import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';

    const body = await req.json();
    const { listing_id, payment_id, txid } = body;

    if (!listing_id || !payment_id) {
      return Response.json({ error: 'Missing listing_id or payment_id' }, { status: 400 });
    }

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/buy`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
          'x-request-id':  ctx.requestId,
          'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        },
        body: JSON.stringify({
          listing_id,
          payment_id,
          txid,
          buyer_id: ctx.userId,
        }),
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return Response.json(
        { error: data?.message ?? 'Purchase failed' },
        { status: res.status },
      );
    }

    return { success: true, purchase: data?.data ?? data };
  },
});
