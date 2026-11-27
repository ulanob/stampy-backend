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

  it('maps any verifier failure to a generic UnauthorizedError', async () => {
    const verifier: TokenVerifier = {
      verify: vi.fn().mockRejectedValue(new Error('JWT expired')),
    };
    const err = await authenticate(requestWith('Bearer abc'), verifier).catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe('Invalid or expired token');
  });
});
