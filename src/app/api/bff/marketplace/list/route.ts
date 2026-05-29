import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as {
      assetId:     string;
      price:       number;
      title:       string;
      description: string;
    };

    const res = await fetch(`${GATEWAY_URL}/api/assets/marketplace/list`, {
      method: 'POST',
      cache:  'no-store',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-request-id':   ctx.requestId,
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({
        assetId:     body.assetId,
        sellerId:    ctx.userId,
        price:       body.price,
        title:       body.title,
        description: body.description,
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log('[marketplace/list] status:', res.status, JSON.stringify(data));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  },
});
