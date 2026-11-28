import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequireAuth } from '../../lib/auth/require-auth';
import type { TokenVerifier } from '../../lib/auth/token-verifier';
import type { UserService } from '../../services/user.service';
import { UnauthorizedError, AccountDeletedError } from '../../utils/validators';

describe('requireAuth', () => {
  const sub = 'cognito-sub-123';
  const user = { id: 'a1b2c3d4-0000-0000-0000-000000000005', auth_provider_id: sub };

  let verifier: TokenVerifier;
  let userService: UserService;

  beforeEach(() => {
    verifier = { verify: vi.fn().mockResolvedValue({ sub }) };
    userService = {
      getOrCreateUserByAuthId: vi.fn().mockResolvedValue(user),
    } as unknown as UserService;
  });

  const requestWith = (authorization?: string) =>
    new Request('http://localhost/api/v1/me', {
      headers: authorization ? { authorization } : {},
    });

  const requireAuth = () => createRequireAuth(verifier, userService);

  it('verifies the token, resolves the user from the sub, and returns it', async () => {
    const result = await requireAuth()(requestWith('Bearer good'));

    expect(verifier.verify).toHaveBeenCalledWith('good');
    expect(userService.getOrCreateUserByAuthId).toHaveBeenCalledWith(sub);
    expect(result).toBe(user);
  });

  it('throws UnauthorizedError without touching the service when the header is missing', async () => {
    await expect(requireAuth()(requestWith())).rejects.toThrow(UnauthorizedError);
    expect(userService.getOrCreateUserByAuthId).not.toHaveBeenCalled();
  });

  it('propagates UnauthorizedError from the verifier without touching the service', async () => {
    (verifier.verify as any).mockRejectedValue(new UnauthorizedError());

    await expect(requireAuth()(requestWith('Bearer bad'))).rejects.toThrow(UnauthorizedError);
    expect(userService.getOrCreateUserByAuthId).not.toHaveBeenCalled();
  });

  it('does not convert unexpected verifier failures into 401s', async () => {
    const outage = new Error('JWKS fetch failed');
    (verifier.verify as any).mockRejectedValue(outage);

    await expect(requireAuth()(requestWith('Bearer t'))).rejects.toBe(outage);
  });

  it('propagates AccountDeletedError from the user service', async () => {
    (userService.getOrCreateUserByAuthId as any).mockRejectedValue(new AccountDeletedError());

    await expect(requireAuth()(requestWith('Bearer t'))).rejects.toThrow(AccountDeletedError);
  });
});
