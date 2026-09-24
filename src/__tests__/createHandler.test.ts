import { describe, it, expect } from 'vitest';
import { AppError, UnauthorizedError, ForbiddenError, createHandler } from '@/lib/bff/createHandler';
import { z } from 'zod';

describe('AppError', () => {
  it('creates error with default status and code', () => {
    const err = new AppError('bad request');
    expect(err.message).toBe('bad request');
    expect(err.status).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.name).toBe('AppError');
  });

  it('creates error with custom status and code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('UnauthorizedError', () => {
  it('has status 401 and UNAUTHORIZED code', () => {
    const err = new UnauthorizedError();
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('has status 403 and FORBIDDEN code', () => {
    const err = new ForbiddenError();
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('accepts custom message', () => {
    const err = new ForbiddenError('KYC_REQUIRED');
    expect(err.message).toBe('KYC_REQUIRED');
  });
});

describe('createHandler — no-auth mode', () => {
  const makeReq = (body?: unknown): Request => {
    return new Request('http://localhost/api/test', {
      method:  body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body:    body ? JSON.stringify(body) : undefined,
    });
  };

  it('calls handler and returns 200 when requireAuth is false', async () => {
    const handler = createHandler({
      requireAuth: false,
      handler:     async () => ({ ok: true }),
    });

    // @ts-expect-error — using plain Request, NextRequest has same interface
    const res = await handler(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('validates schema and returns 400 on invalid input', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const handler = createHandler({
      requireAuth: false,
      schema,
      handler:     async ({ input }) => ({ name: input.name }),
    });

    // @ts-expect-error
    const res = await handler(makeReq({ name: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('VALIDATION_ERROR');
  });

  it('returns 4xx when handler throws AppError', async () => {
    const handler = createHandler({
      requireAuth: false,
      handler:     async () => { throw new AppError('Custom error', 422, 'CUSTOM'); },
    });

    // @ts-expect-error
    const res = await handler(makeReq());
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toBe('CUSTOM');
  });

  it('returns 500 on unexpected error', async () => {
    const handler = createHandler({
      requireAuth: false,
      handler:     async () => { throw new Error('Unexpected!'); },
    });

    // @ts-expect-error
    const res = await handler(makeReq());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('INTERNAL_ERROR');
  });

  it('handles KYC required check', async () => {
    const handler = createHandler({
      requireAuth: false,
      requireKYC:  true,
      handler:     async () => ({ ok: true }),
    });

    // @ts-expect-error — ctx.kycVerified defaults to false
    const res = await handler(makeReq());
    expect(res.status).toBe(403);
  });
});

// A handler may return a Response to choose its own status. createHandler used to
// wrap it — Response.json(aResponse) serialises to `{}` with status 200 — so ten
// routes lost every status and body they meant to send: domains/check answered `{}`
// instead of `{ available }`, and a refused purchase looked like a success.
describe('createHandler — a Response from the handler is returned as-is', () => {
  it('keeps the handler\'s status and body', async () => {
    const handler = createHandler({
      requireAuth: false,
      handler: async () => Response.json({ status: 'pending' }, { status: 202 }) as unknown as never,
    });
    const res = await handler(new Request('http://localhost/api/test') as any);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ status: 'pending' });
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('still wraps a plain object as a 200 JSON body', async () => {
    const handler = createHandler({ requireAuth: false, handler: async () => ({ ok: true }) });
    const res = await handler(new Request('http://localhost/api/test') as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
