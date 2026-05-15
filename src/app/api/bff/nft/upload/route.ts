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
  // ── Auth ──────────────────────────────────────────────
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

  // ── Read FormData (file + metadata) ───────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only images allowed (jpeg, png, gif, webp)' },
      { status: 400 },
    );
  }

  const MAX_SIZE = 4 * 1024 * 1024; // 4MB (Vercel serverless limit)
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 4MB)' }, { status: 400 });
  }

  // ── Step 1: Get presigned URL from storage service ────
  const urlRes = await fetch(`${GATEWAY_URL}/api/storage/upload-url`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size:     file.size,
      folder:   'nfts',
    }),
  });

  if (!urlRes.ok) {
    const errText = await urlRes.text();
    console.error('[NFT] storage url error:', errText);
    return NextResponse.json({ error: 'Storage service error' }, { status: 500 });
  }

  const urlData  = await urlRes.json();
  const uploadUrl = urlData.data?.uploadUrl;
  const key       = urlData.data?.key;

  if (!uploadUrl || !key) {
    console.error('[NFT] no uploadUrl:', JSON.stringify(urlData));
    return NextResponse.json({ error: 'No upload URL from storage' }, { status: 500 });
  }

  // ── Step 2: Upload to R2 server-side (no CORS issues) ─
  const fileBuffer = await file.arrayBuffer();

  const r2Res = await fetch(uploadUrl, {
    method:  'PUT',
    body:    fileBuffer,
    headers: { 'Content-Type': file.type },
  });

  if (!r2Res.ok) {
    const r2Err = await r2Res.text();
    console.error('[NFT] R2 upload error:', r2Res.status, r2Err);
    return NextResponse.json(
      { error: `R2 upload failed: ${r2Res.status}` },
      { status: 500 },
    );
  }

  const publicUrl = `${R2_PUBLIC_URL}/${key}`;
  console.log('[NFT] upload success:', publicUrl);

  return NextResponse.json({ publicUrl, key });
}
