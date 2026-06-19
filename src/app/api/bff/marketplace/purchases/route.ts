import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RawPurchase {
  id:      string;
  price:   number;
  soldAt?: string;
  asset: {
    slug:      string;
    category:  string;
    metadata?: Record<string, unknown>;
  };
}

interface RawAsset {
  id:        string;
  slug:      string;
  category:  string;
  status:    string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token       = req.cookies.get('tec_access_token')?.value ?? '';
    const headers = {
      Authorization:    `Bearer ${token}`,
      'x-request-id':   ctx.requestId,
      ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
    };

    // ✅ جيب marketplace purchases + user assets في نفس الوقت
    const [purchasesRes, assetsRes] = await Promise.all([
      fetch(
        `${GATEWAY_URL}/api/assets/marketplace/user/${encodeURIComponent(ctx.userId)}/purchases`,
        { headers, cache: 'no-store' },
      ),
      fetch(
        `${GATEWAY_URL}/api/assets/user/${encodeURIComponent(ctx.userId)}`,
        { headers, cache: 'no-store' },
      ),
    ]);

    // ── Marketplace purchases ──────────────────────────────
    const purchasesData = purchasesRes.ok ? await purchasesRes.json() : {};
    const marketplacePurchases: RawPurchase[] =
      purchasesData?.data?.purchases ?? purchasesData?.purchases ?? [];

    // ── NFT mints من assets ────────────────────────────────
    const assetsData = assetsRes.ok ? await assetsRes.json() : {};
    const userAssets: RawAsset[] = assetsData?.data ?? [];

    const nftMints = userAssets
      .filter(a => a.category === 'NFT')
      .map(a => ({
        id:      a.id,
        price:   2,              // mint fee
        soldAt:  a.createdAt,
        isMint:  true,           // ✅ عشان PurchasesTab يعرفه
        asset: {
          slug:     a.slug,
          category: 'NFT',
          metadata: a.metadata ?? {},
        },
      }));

    // ── دمج وترتيب بالتاريخ ────────────────────────────────
    const allHistory = [
      ...marketplacePurchases.map(p => ({ ...p, isMint: false })),
      ...nftMints,
    ].sort((a, b) =>
      new Date(b.soldAt ?? 0).getTime() - new Date(a.soldAt ?? 0).getTime(),
    );

    return { purchases: allHistory };
  },
});
