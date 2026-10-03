import { NextRequest, NextResponse } from 'next/server';
import { checkAssetQuota } from '@/lib/server/asset-quota';

// GET /api/bff/assets/quota — may this user create one more asset? Read by the
// NFT upload screen BEFORE it sends anyone to pay, so a FREE user at the cap is
// told why on this screen instead of meeting a refusal mid-payment (Mode 2) or
// on the Hub's page (Mode 1). It is advice only: payment/create here and the
// Hub's /api/payment/create enforce the same check.
const GW = process.env.API_GATEWAY_URL ?? '';

const getUserId = (req: NextRequest): string => {
  try {
    const u = JSON.parse(decodeURIComponent(req.cookies.get('tec_user')?.value ?? ''));
    return u?.id ?? u?.sub ?? '';
  } catch { return ''; }
};

export async function GET(req: NextRequest) {
  const token  = req.cookies.get('tec_access_token')?.value ?? '';
  const userId = getUserId(req);
  if (!token || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = await checkAssetQuota(GW, token, userId);
  return NextResponse.json(
    q.allowed ? { allowed: true } : { allowed: false, plan: q.plan, limit: q.limit, owned: q.owned },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const dynamic = 'force-dynamic';
