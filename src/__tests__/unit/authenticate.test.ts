import { describe, it, expect, vi } from 'vitest';
import { authenticate } from '../../lib/auth/authenticate';
import type { TokenVerifier } from '../../lib/auth/token-verifier';
import { UnauthorizedError } from '../../utils/validators';

function requestWith(authorization?: string): Request {
  return new Request('http://localhost/test', {
    headers: authorization ? { authorization } : {},
  });
}

function verifierReturning(sub: string): TokenVerifier {
  return { verify: vi.fn().mockResolvedValue({ sub }) };
}

describe('authenticate', () => {
  it('returns the sub for a valid bearer token', async () => {
    const verifier = verifierReturning('user-sub-1');
    const result = await authenticate(requestWith('Bearer abc.def.ghi'), verifier);
    expect(result).toEqual({ sub: 'user-sub-1' });
    expect(verifier.verify).toHaveBeenCalledWith('abc.def.ghi');
  });

  it('accepts a case-insensitive scheme', async () => {
    const result = await authenticate(requestWith('bearer abc'), verifierReturning('s'));
    expect(result.sub).toBe('s');
  });

  it('rejects a missing header without calling the verifier', async () => {
    const verifier = verifierReturning('s');
    await expect(authenticate(requestWith(), verifier)).rejects.toThrow(UnauthorizedError);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it.each(['abc', 'Basic abc', 'Bearer', 'Bearer a b'])(
    'rejects malformed header %j',
    async (header) => {
      const verifier = verifierReturning('s');
      await expect(authenticate(requestWith(header), verifier)).rejects.toThrow(UnauthorizedError);
      expect(verifier.verify).not.toHaveBeenCalled();
    },
  );

  it('lets an UnauthorizedError from the verifier propagate with its message', async () => {
    const rejection = new UnauthorizedError('Invalid or expired token');
    const verifier: TokenVerifier = { verify: vi.fn().mockRejectedValue(rejection) };

    const err = await authenticate(requestWith('Bearer abc'), verifier).catch((e) => e);
    expect(err).toBe(rejection);
  });

  it('does not convert unexpected verifier failures into 401s (the verifier owns 401 vs 500)', async () => {
    const outage = new Error('JWKS fetch failed');
    const verifier: TokenVerifier = { verify: vi.fn().mockRejectedValue(outage) };

    const err = await authenticate(requestWith('Bearer abc'), verifier).catch((e) => e);
    expect(err).toBe(outage);
    expect(err).not.toBeInstanceOf(UnauthorizedError);
  });
});
