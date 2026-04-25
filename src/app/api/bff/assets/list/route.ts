import { createHandler } from '@/lib/bff/createHandler';

export const GET = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token      = req.cookies.get('tec_access_token')?.value ?? '';
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL
                    ?? 'https://api-gateway-production-6a68.up.railway.app';

    const res = await fetch(
      `${gatewayUrl}/api/assets?userId=${encodeURIComponent(ctx.userId)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-request-id':  ctx.requestId,
        },
        cache: 'no-store',
      },
    );

    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  },
});
