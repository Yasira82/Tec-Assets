import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token       = req.cookies.get('tec_access_token')?.value ?? '';
    const internalKey = process.env.INTERNAL_SECRET ?? '';

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/marketplace/user/${encodeURIComponent(ctx.userId)}/purchases`,
      {
        headers: {
          Authorization:    `Bearer ${token}`,
          'x-request-id':   ctx.requestId,
          'x-internal-key': internalKey,
        },
        cache: 'no-store',
      },
    );

    if (!res.ok) return { purchases: [] };

    const data = await res.json();
    return { purchases: data?.data?.purchases ?? [] };
  },
});
