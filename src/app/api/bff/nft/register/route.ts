import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as {
      name:        string;
      description: string;
      imageUrl:    string;
      key:         string;
      mimeType:    string;
      paymentId:   string;
      txid:        string;
    };

    if (!body.name || !body.imageUrl || !body.paymentId) {
      return Response.json({ error: 'name, imageUrl, paymentId required' }, { status: 400 });
    }

    const slug = `nft-${ctx.userId.slice(0, 8)}-${Date.now()}`;

    const res = await fetch(`${GATEWAY_URL}/api/assets/provision`, {
      method: 'POST',
      cache:  'no-store',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-request-id':   ctx.requestId,
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({
        userId:        ctx.userId,        // ✅ من الـ JWT
        category:      'NFT',
        slug,
        transactionId: body.paymentId,   // ✅ idempotency key
        metadata: {
          name:        body.name,
          description: body.description,
          imageUrl:    body.imageUrl,
          key:         body.key,
          mimeType:    body.mimeType,
          piPaymentId: body.paymentId,
        },
      }),
    });

    // ✅ 409 = الـ NFT اتسجّل قبل كده بنفس الـ payment — معناه نجاح
    if (res.status === 409) {
      return Response.json({ success: true, cached: true });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[BFF nft/register] provision failed:', res.status, data);
      return Response.json({ error: 'Failed to register NFT' }, { status: res.status });
    }

    return Response.json({ success: true, data });
  },
});
