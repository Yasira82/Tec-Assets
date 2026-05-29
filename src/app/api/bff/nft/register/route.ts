import { createHandler, GATEWAY_URL } from '@/lib/bff/createHandler';

interface RegisterBody {
  name:         string;
  description?: string;
  imageUrl:     string;
  key?:         string;
  mimeType?:    string;
  paymentId:    string;
  txid?:        string;
}

const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export const POST = createHandler({
  requireAuth: true,
  handler: async ({ ctx, req }) => {
    const token = req.cookies.get('tec_access_token')?.value ?? '';
    const body  = await req.json() as RegisterBody;

    if (!body.name || !body.imageUrl || !body.paymentId) {
      return Response.json(
        { error: 'name, imageUrl, paymentId required' },
        { status: 400 },
      );
    }

    // ✅ سجل الـ file في storage DB
    if (body.key) {
      await fetch(`${GATEWAY_URL}/api/storage/files`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          key:      body.key,
          filename: body.name,
          mimeType: body.mimeType ?? 'image/jpeg',
          size:     0,
          metadata: { type: 'nft', userId: ctx.userId },
        }),
      }).catch(() => {});
    }

    // ✅ transactionId لازم UUID — لو paymentId مش UUID نولّد واحد جديد
    const transactionId = isUUID(body.paymentId)
      ? body.paymentId
      : crypto.randomUUID();

    const slug = `nft-${ctx.userId.slice(0, 8)}-${Date.now()}`;

    const res = await fetch(`${GATEWAY_URL}/api/assets/provision`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        Authorization:    `Bearer ${token}`,
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
        'x-request-id':   ctx.requestId,
      },
      body: JSON.stringify({
        transactionId,
        userId:   ctx.userId,
        category: 'NFT',
        slug,
        metadata: {
          name:        body.name,
          description: body.description ?? '',
          imageUrl:    body.imageUrl,
          key:         body.key ?? '',
          mimeType:    body.mimeType ?? 'image/jpeg',
          txid:        body.txid ?? '',
          paymentId:   body.paymentId,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[NFT register] asset provision failed:', JSON.stringify(data));
      return Response.json(
        { error: 'Failed to register NFT asset' },
        { status: res.status },
      );
    }

    return Response.json({ success: true, data });
  },
});
