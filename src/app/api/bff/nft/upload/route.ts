import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify }                 from 'jose';

const GATEWAY_URL = process.env.API_GATEWAY_URL
  ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL
  ?? 'https://api-gateway-production-6a68.up.railway.app';

const R2_PUBLIC_URL = 'https://pub-fe60d4ae820b4c5cb91064081595e666.r2.dev';

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

  const body = await req.json();

  if (!body.filename || !body.mimeType || !body.size) {
    return NextResponse.json({ error: 'filename, mimeType, size required' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(body.mimeType)) {
    return NextResponse.json({ error: 'Only images allowed (jpeg, png, gif, webp)' }, { status: 400 });
  }

  if (body.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const res = await fetch(`${GATEWAY_URL}/api/storage/upload-url`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: body.filename,
      mimeType: body.mimeType,
      size:     body.size,
      folder:   'nfts',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[NFT] storage error:', errText);
    return NextResponse.json({ error: 'Storage service error' }, { status: 500 });
  }

  const data = await res.json();

  const uploadUrl = data.data?.uploadUrl;
  const key       = data.data?.key;

  if (!uploadUrl || !key) {
    console.error('[NFT] no uploadUrl:', JSON.stringify(data));
    return NextResponse.json({ error: 'No upload URL from storage' }, { status: 500 });
  }

  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
