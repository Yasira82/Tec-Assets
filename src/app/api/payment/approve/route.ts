import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.API_GATEWAY_URL
             ?? 'https://api-gateway-production-6a68.up.railway.app';

function getUserIdFromCookie(req: NextRequest): string | null {
  try {
    const raw  = req.cookies.get('tec_user')?.value;
    if (!raw) return null;
    const user = JSON.parse(decodeURIComponent(raw));
    return user?.id ?? null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const body              = await req.json();
    const { paymentId, pi_payment_id } = body;

    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

    const token  = req.cookies.get('tec_access_token')?.value;
    const userId = getUserIdFromCookie(req);

    // ── Step 1: Create payment record ─────────────────────
    const createRes = await fetch(`${GATEWAY}/api/payment/create`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        Authorization:     `Bearer ${token ?? ''}`,
        'Idempotency-Key': `create-${paymentId}`,
      },
      body: JSON.stringify({
        userId,
        amount:         1,
        currency:       'PI',
        payment_method: 'pi',
        metadata:       { source: 'assets', pi_payment_id: pi_payment_id ?? paymentId },
      }),
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) return NextResponse.json(createData, { status: createRes.status });

    const payment_id = createData?.data?.payment?.id
                    ?? createData?.data?.id
                    ?? createData?.payment?.id
                    ?? createData?.id;

    if (!payment_id) return NextResponse.json({ error: 'Failed to get payment ID' }, { status: 500 });

    // ── Step 2: Approve ───────────────────────────────────
    const approveRes = await fetch(`${GATEWAY}/api/payment/approve`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        Authorization:     `Bearer ${token ?? ''}`,
        'Idempotency-Key': `approve-${paymentId}`,
      },
      body: JSON.stringify({ payment_id, pi_payment_id: pi_payment_id ?? paymentId }),
    });

    const approveData = await approveRes.json().catch(() => ({}));
    return NextResponse.json(
      { ...approveData, payment_id },
      { status: approveRes.status },
    );
  } catch (err) {
    console.error('[approve] error:', err);
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
