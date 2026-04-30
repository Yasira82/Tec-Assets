import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const GET = createHandler({
  requireAuth: false,
  handler: async ({ req }) => {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();

    if (!slug) {
      return Response.json({ error: 'slug required' }, { status: 400 });
    }

    const fullSlug = slug.endsWith('.pi') ? slug : `${slug}.pi`;

    const res = await fetch(
      `${GATEWAY_URL}/api/assets/${encodeURIComponent(fullSlug)}`,
      { cache: 'no-store' },
    );

    // ✅ لو 404 = متاح — لو 200 = مش متاح
    return Response.json({
      slug:      fullSlug,
      available: res.status === 404,
    });
  },
});
