import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';

    const body = await req.json();

    if (!body.filename || !body.mimeType || !body.size) {
      return Response.json({ error: 'filename, mimeType, size required' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(body.mimeType)) {
      return Response.json({ error: 'Only images allowed (jpeg, png, gif, webp)' }, { status: 400 });
    }

    if (body.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

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

    // ✅ log الـ status
    console.log('[NFT BFF] storage status:', res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[NFT BFF] storage error:', errText);
      return Response.json({ error: errText ?? 'Upload failed' }, { status: res.status });
    }

    const data = await res.json();
    console.log('[NFT BFF] storage response:', JSON.stringify(data));

    if (!data.data?.uploadUrl) {
      console.error('[NFT BFF] no uploadUrl in response:', JSON.stringify(data));
      return Response.json({ error: 'No upload URL from storage service' }, { status: 500 });
    }

    // ✅ احسب publicUrl من الـ key
    const key       = data.data.key;
    const publicUrl = key
      ? `${process.env.R2_PUBLIC_URL ?? ''}/${key}`
      : null;

    return Response.json({
      uploadUrl: data.data.uploadUrl,
      publicUrl,
      key,
    });
  },
});
