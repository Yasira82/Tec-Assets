import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

/**
 * POST /api/bff/assets/mint-as-nft — the follow-up after Pi reports a domain→NFT
 * mint as paid.
 *
 * Two things were wrong here. The route read `assetId` and `userId` from the body
 * while the app sends `asset_id` and no user at all, so every call answered 400 and
 * no paid mint ever completed through it. And had it worked, the user would have
 * been whoever the body named. The user now comes from the verified session, and the
 * asset-service mints only against the payment's own `payment.completed.v1` —
 * answering 202 "pending" until that event has arrived, and minting from the event
 * itself if this call never comes.
 */
export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json().catch(() => ({})) as {
      asset_id?:      string;
      assetId?:       string;
      transactionId?: string;
    };
    const assetId       = String(body.asset_id ?? body.assetId ?? '').trim();
    const transactionId = String(body.transactionId ?? '').trim();

    if (!assetId || !transactionId) {
      return Response.json({ error: 'asset_id and transactionId required' }, { status: 400 });
    }

    const res = await fetch(`${GATEWAY_URL}/api/assets/${encodeURIComponent(assetId)}/mint-as-nft`, {
      method:  'POST',
      cache:   'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        'x-request-id': ctx.requestId,
        ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
      },
      body: JSON.stringify({ userId: ctx.userId, transactionId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) console.error('[BFF mint-as-nft] failed:', res.status, JSON.stringify(data));
    return Response.json(data, { status: res.status });
  },
});
