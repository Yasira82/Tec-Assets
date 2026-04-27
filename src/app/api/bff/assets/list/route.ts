import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RawAsset {
  id:            string;
  slug:          string;
  category:      string;
  status:        string;
  metadata?:     Record<string, unknown>;
  createdAt:     string;
  transactionId: string;
}

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';

    const res = await fetch(
      `${GATEWAY_URL}/api/assets?userId=${encodeURIComponent(ctx.userId)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-request-id':  ctx.requestId,
        },
        cache: 'no-store',
      },
    );

    if (!res.ok) return { data: [], total: 0 };

    const raw = await res.json();

    // ✅ normalize field names
    const assets = (raw?.data ?? raw?.assets ?? []).map((a: RawAsset) => ({
      id:         a.id,
      name:       a.slug,
      asset_type: a.category?.toLowerCase() ?? 'domain',
      value:      0,
      currency:   'PI',
      status:     a.status?.toLowerCase() ?? 'active',
      created_at: a.createdAt,
    }));

    return { data: assets, total: assets.length };
  },
});
