import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.API_GATEWAY_URL
  ?? 'https://api-gateway-production-6a68.up.railway.app';

const getCsrfFromCookie = (req: NextRequest) =>
  req.cookies.get('tec_csrf')?.value ?? '';

const getToken = (req: NextRequest) =>
  req.cookies.get('tec_access_token')?.value ?? '';

export async function POST(req: NextRequest) {
  try {
    const csrf = req.headers.get('x-csrf-token') ?? '';
    if (!csrf || csrf !== getCsrfFromCookie(req)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    const body = await req.json();
    const { asset_id, recipient_username } = body;

    if (!asset_id || !recipient_username) {
      return NextResponse.json({ error: 'asset_id and recipient_username required' }, { status: 400 });
    }

    const token = getToken(req);

    const res = await fetch(`${GATEWAY}/api/assets/${asset_id}/transfer`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-request-id':   crypto.randomUUID(),
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({ recipient_username }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { message?: string }).message ?? 'Transfer failed' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Transfer error:', err);
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
  }
}
