import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as {
      assetId:      string;
      price:        number;
      title?:       string;
      description?: string;
    };

    if (!body.assetId || !body.price) {
      return Response.json({ error: 'assetId and price required' }, { status: 400 });
    }

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
        sellerId:    ctx.userId,          // ✅ من الـ JWT — مش من الـ body
        price:       body.price,
        title:       body.title,
        description: body.description,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  },
});
