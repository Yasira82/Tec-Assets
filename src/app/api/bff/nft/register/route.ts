import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RegisterBody {
  name?:      string;
  key?:       string;
  mimeType?:  string;
  paymentId?: string;
}

const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/**
 * POST /api/bff/nft/register — the follow-up after Pi reports an NFT mint as paid.
 *
 * This used to call `/api/assets/provision` with whatever the browser sent, and when
 * the payment id was not a UUID it made one up — so an NFT could be registered with
 * no payment at all. Now it asks the asset-service to CLAIM the payment: the NFT's
 * name and image travel inside the payment's own product id, and the asset-service
 * registers it only once `payment.completed.v1` has confirmed that payment was made,
 * by this user, for at least the mint fee. Until then the answer is 202 "pending",
 * and the asset-service delivers it from the event even if this call never comes.
 */
export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json().catch(() => ({})) as RegisterBody;
    const paymentId = String(body.paymentId ?? '').trim();

    if (!isUUID(paymentId)) {
      return Response.json({ error: 'paymentId (the TEC payment id) required' }, { status: 400 });
    }

    // Record the uploaded file in storage — bookkeeping for the image, not the NFT.
    if (body.key) {
      await fetch(`${GATEWAY_URL}/api/storage/files`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          key:      body.key,
          filename: body.name ?? body.key,
          mimeType: body.mimeType ?? 'image/jpeg',
          size:     0,
          metadata: { type: 'nft', userId: ctx.userId },
        }),
      }).catch(() => {});
    }

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/purchases/${encodeURIComponent(paymentId)}/claim`,
      {
        method:  'POST',
        cache:   'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
          'x-request-id': ctx.requestId,
          ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
        },
        body: JSON.stringify({ userId: ctx.userId }),   // from the verified JWT, never the body
      },
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) console.error('[NFT register] claim failed:', res.status, JSON.stringify(data));
    return Response.json(data, { status: res.status });
  },
});
