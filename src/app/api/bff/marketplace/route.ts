import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RawListing {
  id:          string;
  assetId:     string;
  sellerId:    string;
  price:       number;
  currency:    string;
  status:      string;
  title?:      string;
  description?: string;
  createdAt:   string;
  asset?: {
    slug:     string;
    category: string;
    metadata?: Record<string, unknown>;
  };
}

export const GET = createHandler({
  requireAuth: true, // ✅ محتاج token عشان Gateway يقبله
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace${query ? `?${query}` : ''}`,
      {
        cache: 'no-store',
        headers: {
          Authorization:  `Bearer ${token}`,
          'x-request-id': ctx.requestId,
        },
      },
    );

    if (!res.ok) return { listings: [], total: 0 };

    const raw = await res.json();
    const listings = (raw?.data ?? raw?.listings ?? []).map((l: RawListing) => ({
      id:          l.id,
      asset_id:    l.assetId,
      seller_id:   l.sellerId,
      price:       l.price,
      currency:    l.currency ?? 'PI',
      status:      l.status?.toLowerCase() ?? 'active',
      title:       l.title ?? l.asset?.slug ?? 'Unknown Asset',
      description: l.description ?? '',
      category:    l.asset?.category?.toLowerCase() ?? 'domain',
      created_at:  l.createdAt,
    }));

    return { listings, total: listings.length };
  },
});
