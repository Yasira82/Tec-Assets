import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';

    const body = await req.json();

    if (!body.filename || !body.mimeType || !body.size) {
      return Response.json({ error: 'filename, mimeType, size required' }, { status: 400 });
    }

    // ✅ تحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(body.mimeType)) {
      return Response.json({ error: 'Only images allowed (jpeg, png, gif, webp)' }, { status: 400 });
    }

    // ✅ حد أقصى 10MB
    if (body.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // ✅ جيب presigned URL من storage service
    const res = await fetch(`${GATEWAY_URL}/api/storage/upload-url`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        'x-request-id': ctx.requestId,
      },
      body: JSON.stringify({
        filename: body.filename,
        mimeType: body.mimeType,
        size:     body.size,
        folder:   'nfts',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err?.message ?? 'Upload failed' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({
      uploadUrl: data.data?.uploadUrl,
      publicUrl: data.data?.publicUrl,
      key:       data.data?.key,
    });
  },
});
