import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

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
    return res.json();
  },
});
