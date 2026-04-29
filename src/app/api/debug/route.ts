import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('tec_access_token')?.value;
  const user  = req.cookies.get('tec_user')?.value;

  let userId = null;
  if (token && process.env.JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET),
        { algorithms: ['HS256'] },
      );
      userId = payload.sub;
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    tokenExists: !!token,
    userCookie:  user ? JSON.parse(decodeURIComponent(user)) : null,
    userId,
  });
}
