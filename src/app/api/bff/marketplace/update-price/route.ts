import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const PATCH = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json();

    if (!body.listingId || !body.price || body.price <= 0) {
      return Response.json({ error: 'listingId and price required' }, { status: 400 });
    }

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/${body.listingId}/price`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
          'x-request-id': ctx.requestId,
        },
        body: JSON.stringify({
          sellerId: ctx.userId,
          price:    Number(body.price),
        }),
      },
    );

    const data = await res.json();
    return data;
  },
});
