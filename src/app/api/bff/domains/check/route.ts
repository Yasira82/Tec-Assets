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

    try {
      const res = await fetch(
        `${GATEWAY_URL}/api/assets/${encodeURIComponent(fullSlug)}`,
        { cache: 'no-store' },
      );

      const data = await res.json();

      // ✅ لو data.data موجود = asset موجود = taken
      // ✅ لو 404 أو مفيش data = available
      const exists = res.ok && data?.data != null;

      return Response.json({
        slug:      fullSlug,
        available: !exists,
      });
    } catch {
      // ✅ لو error = افترض available
      return Response.json({ slug: fullSlug, available: true });
    }
  },
});
