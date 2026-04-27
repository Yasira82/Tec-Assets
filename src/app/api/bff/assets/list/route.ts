import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

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
    const token = req.cookies.get('tec_access_token')?.value ?? '';

    // ✅ الـ route الصح
    const res = await fetch(
      `${GATEWAY_URL}/api/assets/user/${encodeURIComponent(ctx.userId)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-request-id':  ctx.requestId,
        },
        cache: 'no-store',
      },
    );

    if (!res.ok) return { data: [], total: 0 };

    const raw    = await res.json();
    const assets = (raw?.data ?? []).map((a: RawAsset) => ({
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
