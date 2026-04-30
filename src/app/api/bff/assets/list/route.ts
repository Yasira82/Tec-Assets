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

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token       = req.cookies.get('tec_access_token')?.value ?? '';
    const internalKey = process.env.INTERNAL_SECRET ?? '';

    const headers = {
      Authorization:    `Bearer ${token}`,
      'x-request-id':   ctx.requestId,
      'x-internal-key': internalKey,
    };

    // ✅ جيب الـ assets والـ listings مع بعض
    const [assetsRes, listingsRes] = await Promise.all([
      fetch(`${GATEWAY_URL}/api/assets/user/${encodeURIComponent(ctx.userId)}`, {
        headers, cache: 'no-store',
      }),
      fetch(`${GATEWAY_URL}/api/assets/marketplace/user/${encodeURIComponent(ctx.userId)}/listings`, {
        headers, cache: 'no-store',
      }),
    ]);

    if (!assetsRes.ok) {
      console.error('[BFF] assets/list failed:', assetsRes.status);
      return { data: [], total: 0 };
    }

    const raw          = await assetsRes.json();
    const listingsData = listingsRes.ok ? await listingsRes.json() : {};
    const userListings: RawListing[] = listingsData?.data?.listings ?? [];

    const assets = (raw?.data ?? []).map((a: RawAsset) => {
      const activeListing = userListings.find(
        l => l.assetId === a.id && l.status === 'ACTIVE'
      );
      return {
        id:            a.id,
        name:          a.slug,
        asset_type:    a.category?.toLowerCase() ?? 'domain',
        value:         0,
        currency:      'PI',
        status:        a.status?.toLowerCase() ?? 'active',
        created_at:    a.createdAt,
        listing_id:    activeListing?.id    ?? null,
        listing_price: activeListing?.price ?? null,
      };
    });

    return { data: assets, total: assets.length };
  },
});
