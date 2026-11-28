import { UnauthorizedError } from '../../utils/validators';
import type { TokenVerifier } from './token-verifier';

export type AuthContext = { sub: string };

export async function authenticate(
  request: Request,
  verifier: TokenVerifier,
): Promise<AuthContext> {
  const header = request.headers.get('authorization');
  if (!header) throw new UnauthorizedError('Missing Authorization header');

  const [scheme, token, ...extra] = header.trim().split(/\s+/);
  if (scheme.toLowerCase() !== 'bearer' || !token || extra.length > 0) {
    throw new UnauthorizedError('Malformed Authorization header');
  }

  // The verifier decides 401 (bad token) vs anything else (our problem);
  // errors pass through untouched.
  const { sub } = await verifier.verify(token);
  return { sub };
}
