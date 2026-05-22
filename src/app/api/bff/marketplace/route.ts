import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RawListing {
  id:           string;
  assetId:      string;
  sellerId:     string;
  price:        number;
  currency:     string;
  status:       string;
  title?:       string;
  description?: string;
  createdAt:    string;
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
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace${query ? `?${query}` : ''}`,
      {
        cache: 'no-store',
        headers: {
          Authorization:    `Bearer ${token}`,
          'x-request-id':   ctx.requestId,
          'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        },
      },
    );

    if (!res.ok) return { listings: [], total: 0 };

    const raw      = await res.json();
    const listings = (raw?.listings ?? raw?.data ?? [])
      .filter((l: RawListing) => l.status === 'ACTIVE')
      .map((l: RawListing) => ({
        id:          l.id,
        asset_id:    l.assetId,
        seller_id:   l.sellerId,
        price:       l.price,
        currency:    (l.currency ?? 'PI') as 'PI',
        status:      l.status?.toLowerCase() ?? 'active',
        title:       l.title       ?? l.asset?.slug ?? 'Unknown Asset',
        description: l.description ?? '',
        category:    l.asset?.category?.toLowerCase() ?? 'digital_asset',
        created_at:  l.createdAt,
        metadata:    l.asset?.metadata ?? {},
      }));

    return { listings, total: listings.length };
  },
});
