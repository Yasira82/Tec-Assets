import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const PATCH = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as { listingId: string; price: number };

    if (!body.listingId || !body.price || body.price <= 0) {
      return Response.json({ error: 'listingId and valid price required' }, { status: 400 });
    }

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/${encodeURIComponent(body.listingId)}/price`,
      {
        method: 'PATCH',
        cache:  'no-store',
        headers: {
          'Content-Type':   'application/json',
          Authorization:    `Bearer ${token}`,
          'x-request-id':   ctx.requestId,
          'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        },
        body: JSON.stringify({
          sellerId: ctx.userId,           // ✅ من الـ JWT
          price:    body.price,
        }),
      },
    );

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  },
});
