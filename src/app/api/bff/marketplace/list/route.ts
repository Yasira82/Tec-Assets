import { NextRequest, NextResponse } from 'next/server';
import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json();

    if (!body.assetId || !body.price || body.price <= 0) {
      return Response.json(
        { error: 'assetId and price required' },
        { status: 400 },
      );
    }

    const res = await fetch(`${GATEWAY_URL}/api/assets/marketplace/list`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        'x-request-id': ctx.requestId,
      },
      body: JSON.stringify({
        assetId:     body.assetId,
        sellerId:    ctx.userId,
        price:       Number(body.price),
        title:       body.title,
        description: body.description,
      }),
    });

    const data = await res.json();
    return data;
  },
});
