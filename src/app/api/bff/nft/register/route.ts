import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json();

    if (!body.name || !body.imageUrl || !body.paymentId) {
      return Response.json({ error: 'name, imageUrl, paymentId required' }, { status: 400 });
    }

    // ✅ سجل الـ file في storage DB
    await fetch(`${GATEWAY_URL}/api/storage/files`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({
        key:      body.key,
        filename: body.name,
        mimeType: body.mimeType ?? 'image/jpeg',
        size:     body.size    ?? 0,
        metadata: { type: 'nft', userId: ctx.userId },
      }),
    });

    // ✅ سجل الـ NFT كـ asset
    const slug = `nft-${ctx.userId.slice(0, 8)}-${Date.now()}`;

    const res = await fetch(`${GATEWAY_URL}/api/assets/provision`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        'x-request-id':   ctx.requestId,
      },
      body: JSON.stringify({
        transactionId: body.paymentId,
        userId:        ctx.userId,
        category:      'NFT',
        slug,
        metadata: {
          name:        body.name,
          description: body.description ?? '',
          imageUrl:    body.imageUrl,
          key:         body.key,
        },
      }),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  },
});
