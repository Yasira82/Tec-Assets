import { createHandler, GATEWAY_URL, gatewayGet } from '@/lib/bff/createHandler';
import { shownInAssets } from '@/lib/tradable';

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

const estimateValue = (a: RawAsset, activeListing?: RawListing): number => {
  if (activeListing?.price) return activeListing.price;
  const category = a.category?.toLowerCase();
  if (category === 'domain') {
    const name = a.slug.replace('.pi', '');
    if (name.length <= 3) return 5;
    if (name.length <= 5) return 3;
    if (name.length <= 9) return 2;
    return 1;
  }
  if (category === 'nft') return 2;
  return 0;
};

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token       = req.cookies.get('tec_access_token')?.value ?? '';
    const headers = {
      Authorization:    `Bearer ${token}`,
      'x-request-id':   ctx.requestId,
      ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
    };

    console.log('[BFF assets/list] userId:', ctx.userId);

    const [assetsRes, listingsRes] = await Promise.all([
      gatewayGet(`${GATEWAY_URL}/api/assets/user/${encodeURIComponent(ctx.userId)}`, {
        headers, cache: 'no-store',
      }),
      gatewayGet(`${GATEWAY_URL}/api/assets/marketplace/user/${encodeURIComponent(ctx.userId)}/listings`, {
        headers, cache: 'no-store',
      }),
    ]);

    console.log('[BFF assets/list] assetsRes status:', assetsRes.status);

    if (!assetsRes.ok) {
      console.error('[BFF assets/list] failed:', assetsRes.status);
      return { data: [], total: 0 };
    }

    const raw = await assetsRes.json();
    console.log('[BFF assets/list] raw count:', raw?.data?.length ?? 0, 'raw:', JSON.stringify(raw).slice(0, 200));

    const listingsData  = listingsRes.ok ? await listingsRes.json() : {};
    const userListings: RawListing[] = listingsData?.data?.listings ?? [];

    // A property is recorded in asset-service but lives in TEC Estate (lib/tradable).
    const assets = (raw?.data ?? []).filter((a: RawAsset) => shownInAssets(a.category)).map((a: RawAsset) => {
      const activeListing = userListings.find(
        l => l.assetId === a.id && l.status === 'ACTIVE',
      );
      return {
        id:            a.id,
        name:          (a.metadata?.name as string) ?? a.slug, // ✅ الاسم الحقيقي
        asset_type:    a.category?.toLowerCase() ?? 'domain',
        value:         estimateValue(a, activeListing),
        currency:      'PI',
        status:        a.status?.toLowerCase() ?? 'active',
        created_at:    a.createdAt,
        listing_id:    activeListing?.id    ?? null,
        listing_price: activeListing?.price ?? null,
        metadata:      a.metadata ?? {},
      };
    });

    console.log('[BFF assets/list] returning:', assets.length, 'assets');

    return { data: assets, total: assets.length };
  },
});
