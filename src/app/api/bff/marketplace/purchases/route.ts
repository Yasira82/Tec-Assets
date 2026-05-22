import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RawPurchase {
  id:       string;
  assetId:  string;
  price:    number;
  title?:   string;
  soldAt?:  string;
  asset?: {
    slug:      string;
    category:  string;
    metadata?: Record<string, unknown>;
  };
}

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/user/${encodeURIComponent(ctx.userId)}/purchases`,
      {
        cache: 'no-store',
        headers: {
          Authorization:    `Bearer ${token}`,
          'x-request-id':   ctx.requestId,
          'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        },
      },
    );

    if (!res.ok) return { purchases: [] };

    const raw       = await res.json();
    const purchases = (raw?.data?.purchases ?? raw?.data ?? []).map((p: RawPurchase) => ({
      id:       p.id,
      asset_id: p.assetId,
      price:    p.price,
      title:    p.title ?? p.asset?.slug ?? 'Unknown Asset',
      sold_at:  p.soldAt ?? '',
      metadata: p.asset?.metadata ?? {},
    }));

    return { purchases };
  },
});
