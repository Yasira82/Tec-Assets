import { NextRequest, NextResponse } from 'next/server';

const GW = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? 'https://api-gateway-production-6a68.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('tec_access_token')?.value;
    const body  = await req.json();

    const res = await fetch(`${GW}/api/payment/complete`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'x-request-id':  crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'BFF error', message: String(err) }, { status: 502 });
  }
}
