import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify }                 from 'jose';

const GATEWAY_URL   = process.env.API_GATEWAY_URL
  ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL
  ?? 'https://api-gateway-production-6a68.up.railway.app';

const R2_PUBLIC_URL = 'https://pub-fe60d4ae820b4c5cb91064081595e666.r2.dev';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

export async function POST(req: NextRequest) {
  const token = req.cookies.get('tec_access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
      { algorithms: ['HS256'] },
    );
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: { filename?: string; mimeType?: string; data?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { filename, mimeType, data, size } = body;

  if (!filename || !mimeType || !data) {
    return NextResponse.json({ error: 'filename, mimeType, data required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'Only images allowed (jpeg, png, gif, webp)' }, { status: 400 });
  }

  if (size && size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 4MB)' }, { status: 400 });
  }

  // ✅ تحويل base64 → binary
  const base64 = data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  // Step 1: Get presigned URL
  const urlRes = await fetch(`${GATEWAY_URL}/api/storage/upload-url`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({ filename, mimeType, size: buffer.length, folder: 'nfts' }),
  });

  if (!urlRes.ok) {
    const err = await urlRes.text();
    console.error('[NFT] storage error:', err);
    return NextResponse.json({ error: 'Storage service error' }, { status: 500 });
  }

  const urlData   = await urlRes.json();
  const uploadUrl = urlData.data?.uploadUrl;
  const key       = urlData.data?.key;

  if (!uploadUrl || !key) {
    console.error('[NFT] no uploadUrl:', JSON.stringify(urlData));
    return NextResponse.json({ error: 'No upload URL from storage' }, { status: 500 });
  }

  // Step 2: Upload to R2 server-side
  const r2Res = await fetch(uploadUrl, {
    method:  'PUT',
    body:    buffer,
    headers: { 'Content-Type': mimeType },
  });

  if (!r2Res.ok) {
    console.error('[NFT] R2 error:', r2Res.status, await r2Res.text());
    return NextResponse.json({ error: `Upload failed: ${r2Res.status}` }, { status: 500 });
  }

  const publicUrl = `${R2_PUBLIC_URL}/${key}`;
  return NextResponse.json({ publicUrl, key });
}
