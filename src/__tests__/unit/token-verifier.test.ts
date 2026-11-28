import { describe, it, expect, vi } from 'vitest';
import {
  JwtParseError,
  JwtExpiredError,
  JwtInvalidSignatureError,
  KidNotFoundInJwksError,
  FetchError,
  NonRetryableFetchError,
  ParameterValidationError,
  JwksValidationError,
} from 'aws-jwt-verify/error';
import { UnauthorizedError } from '../../utils/validators';
import { createCognitoTokenVerifier } from '../../lib/auth/token-verifier';

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: { create: () => ({ verify: verifyMock }) },
}));

describe('createCognitoTokenVerifier', () => {
  const verifier = createCognitoTokenVerifier({ userPoolId: 'pool', clientId: 'client' });

  it('returns the sub for a valid token', async () => {
    verifyMock.mockResolvedValue({ sub: 'abc' });
    await expect(verifier.verify('t')).resolves.toEqual({ sub: 'abc' });
  });

  it.each([
    ['JwtParseError', () => new JwtParseError('malformed')],
    ['JwtInvalidSignatureError', () => new JwtInvalidSignatureError('bad sig')],
    ['JwtExpiredError (claim error)', () => new JwtExpiredError('expired', 1)],
    ['KidNotFoundInJwksError', () => new KidNotFoundInJwksError('unknown kid')],
  ])('maps %s to UnauthorizedError', async (_name, makeError) => {
    verifyMock.mockRejectedValue(makeError());
    await expect(verifier.verify('t')).rejects.toThrow(UnauthorizedError);
  });

  it.each([
    ['FetchError', () => new FetchError('https://jwks.example', 'network down')],
    ['NonRetryableFetchError', () => new NonRetryableFetchError('https://jwks.example', '404')],
    ['ParameterValidationError', () => new ParameterValidationError('bad config')],
    ['JwksValidationError', () => new JwksValidationError('malformed jwks')],
    ['a plain Error', () => new Error('boom')],
  ])('lets %s through unchanged (500, not 401)', async (_name, makeError) => {
    const original = makeError();
    verifyMock.mockRejectedValue(original);

    const error = await verifier.verify('t').catch((e) => e);
    expect(error).toBe(original);
    expect(error).not.toBeInstanceOf(UnauthorizedError);
  });
});
