import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json();

    if (!body.slug || !body.paymentId) {
      return Response.json({ error: 'slug and paymentId required' }, { status: 400 });
    }

    // ✅ تأكد إن الـ slug ينتهي بـ .pi
    const slug = body.slug.toLowerCase().trim();
    if (!slug.endsWith('.pi')) {
      return Response.json({ error: 'Domain must end with .pi' }, { status: 400 });
    }

    const res = await fetch(`${GATEWAY_URL}/api/assets/provision`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        'x-request-id': ctx.requestId,
      },
      body: JSON.stringify({
        transactionId: body.paymentId,
        userId:        ctx.userId,
        category:      'DOMAIN',
        slug,
        metadata: {
          extension: '.pi',
          addedBy:   ctx.userId,
        },
      }),
    });

    const data = await res.json();
    return data;
  },
});
