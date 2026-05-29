import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const DELETE = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token   = req.cookies.get('tec_access_token')?.value ?? '';
    const url     = new URL(req.url);
    const assetId = url.searchParams.get('assetId');

    if (!assetId) {
      return Response.json(
        { error: 'assetId required' },
        { status: 400 },
      );
    }

    const res = await fetch(`${GATEWAY_URL}/api/assets/${assetId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-request-id':   ctx.requestId,
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({ userId: ctx.userId }),
    });

    const data = await res.json().catch(() => ({}));
    console.log('[assets/delete] status:', res.status, JSON.stringify(data));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  },
});
