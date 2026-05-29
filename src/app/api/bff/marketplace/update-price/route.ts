import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const PATCH = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as { listingId: string; price: number };

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/${body.listingId}/price`,
      {
        method: 'PATCH',
        cache:  'no-store',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
          'x-request-id':  ctx.requestId,
        },
        body: JSON.stringify({
          sellerId: ctx.userId,
          price:    body.price,
        }),
      },
    );

    const data = await res.json().catch(() => ({}));
    console.log('[marketplace/update-price] status:', res.status, JSON.stringify(data));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  },
});
