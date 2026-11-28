import type { User } from '../../models/user.model';
import type { UserService } from '../../services/user.service';
import { authenticate } from './authenticate';
import type { TokenVerifier } from './token-verifier';

export type RequireAuth = (request: Request) => Promise<User>;

export function createRequireAuth(verifier: TokenVerifier, userService: UserService): RequireAuth {
  return async function requireAuth(request) {
    const { sub } = await authenticate(request, verifier); // 401 on bad/missing token
    return userService.getOrCreateUserByAuthId(sub); // 403 if soft-deleted
  };
}
