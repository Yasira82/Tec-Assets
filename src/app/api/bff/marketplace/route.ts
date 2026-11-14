import { piAmount } from '@/lib/pi-amount';
import { createHandler, GATEWAY_URL, gatewayGet } from '@/lib/bff/createHandler';

interface RawListing {
  id:           string;
  assetId:      string;
  sellerId:     string;
  price:        number | string;   // a decimal string once the column is DECIMAL(20,8) (C-71 §3)
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

    const res = await gatewayGet(
      `${GATEWAY_URL}/api/assets/marketplace${query ? `?${query}` : ''}`,
      {
        cache: 'no-store',
        headers: {
          Authorization:    `Bearer ${token}`,
          'x-request-id':   ctx.requestId,
          ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
        },
      },
    );

    if (!res.ok) return { listings: [], total: 0 };

    const raw      = await res.json();
    const listings = (raw?.data ?? raw?.listings ?? [])
      .filter((l: RawListing) => l.status === 'ACTIVE')
      .map((l: RawListing) => ({
        id:          l.id,
        asset_id:    l.assetId,
        seller_id:   l.sellerId,
        price:       piAmount(l.price),   // a decimal string from the service (C-71 §3) → a number here (ADR-009)
        currency:    l.currency    ?? 'PI',
        status:      l.status?.toLowerCase() ?? 'active',
        title:       l.title       ?? l.asset?.slug ?? 'Unknown Asset',
        description: l.description ?? '',
        category:    l.asset?.category?.toLowerCase() ?? 'domain',
        created_at:  l.createdAt,
        metadata:    l.asset?.metadata ?? {},       // ✅ NFT images
      }))
      // A listing with no readable price cannot be bought — it is not shown (never as 0π).
      .filter((l: { price: number | null }) => l.price !== null);

    return { listings, total: listings.length };
  },
});
