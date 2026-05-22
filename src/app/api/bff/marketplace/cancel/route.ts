import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const PATCH = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as { listingId: string };

    if (!body.listingId) {
      return Response.json({ error: 'listingId required' }, { status: 400 });
    }

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/${encodeURIComponent(body.listingId)}/cancel`,
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
          sellerId: ctx.userId,           // ✅ من الـ JWT — مش من الـ body
        }),
      },
    );

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  },
});
