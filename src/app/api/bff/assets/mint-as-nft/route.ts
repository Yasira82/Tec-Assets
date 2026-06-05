import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.API_GATEWAY_URL!;

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('tec_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { assetId, transactionId, userId } = body;

    if (!assetId || !transactionId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch(`${GATEWAY}/api/v1/assets/${assetId}/mint-as-nft`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, transactionId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json(data, { status: res.status });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Mint failed' }, { status: 500 });
  }
}
