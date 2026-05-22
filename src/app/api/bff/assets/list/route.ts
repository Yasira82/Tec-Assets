import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RawAsset {
  id:        string;
  slug:      string;
  category:  string;
  status:    string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface RawListing {
  id:      string;
  assetId: string;
  status:  string;
  price:   number;
}

const BASE_VALUE: Record<string, number> = {
  domain: 1, nft: 2, token: 1, badge: 1, digital_asset: 1,
};

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const headers = {
      Authorization:    `Bearer ${token}`,
      'x-request-id':   ctx.requestId,
      'x-internal-key': process.env.INTERNAL_SECRET ?? '',
    };
    const bust = Date.now();

    const [assetsRes, listingsRes] = await Promise.all([
      fetch(
        `${GATEWAY_URL}/api/assets/user/${encodeURIComponent(ctx.userId)}?_=${bust}`,
        { headers, cache: 'no-store' },
      ),
      fetch(
        `${GATEWAY_URL}/api/assets/marketplace/user/${encodeURIComponent(ctx.userId)}/listings?_=${bust}`,
        { headers, cache: 'no-store' },
      ),
    ]);

    if (!assetsRes.ok) {
      console.error('[BFF assets/list] assets fetch failed:', assetsRes.status);
      return { data: [], total: 0 };
    }

    const rawAssets   = await assetsRes.json();
    const rawListings = listingsRes.ok ? await listingsRes.json() : {};
    const listings: RawListing[] = rawListings?.data?.listings ?? [];

    const assets = (rawAssets?.data ?? []).map((a: RawAsset) => {
      const type   = a.category?.toLowerCase() ?? 'digital_asset';
      const active = listings.find(
        l => l.assetId === a.id && l.status === 'ACTIVE',
      );
      return {
        id:            a.id,
        name:          (a.metadata?.name as string) ?? a.slug,
        asset_type:    type,
        status:        a.status?.toLowerCase() ?? 'active',
        value:         active?.price ?? BASE_VALUE[type] ?? 1,
        currency:      'PI' as const,
        created_at:    a.createdAt,
        listing_id:    active?.id    ?? null,
        listing_price: active?.price ?? null,
        metadata:      a.metadata ?? {},
      };
    });

    return { data: assets, total: assets.length };
  },
});
