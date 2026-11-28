import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  JwtParseError,
  JwtInvalidSignatureError,
  JwtInvalidSignatureAlgorithmError,
  JwtInvalidClaimError, // abstract base: expiry, issuer, client_id, token_use, ...
  JwtWithoutValidKidError,
  KidNotFoundInJwksError,
  WaitPeriodNotYetEndedJwkError,
} from 'aws-jwt-verify/error';
import { UnauthorizedError } from '../../utils/validators';

export type VerifiedToken = { sub: string };

export type TokenVerifier = {
  /** Throws UnauthorizedError if the token is bad; any other error is our problem (500). */
  verify(token: string): Promise<VerifiedToken>;
};

// Errors that mean "the caller's token is bad". Deliberately NOT included:
// FetchError / NonRetryableFetchError (JWKS outage; FetchError extends JwtBaseError),
// ParameterValidationError (our config), JwksValidationError / JwkValidationError
// (malformed JWKS), NotSupportedError. Those propagate as 500s.
const TOKEN_ERROR_CLASSES: Array<abstract new (...args: never[]) => Error> = [
  JwtParseError,
  JwtInvalidSignatureError,
  JwtInvalidSignatureAlgorithmError,
  JwtInvalidClaimError,
  JwtWithoutValidKidError,
  KidNotFoundInJwksError,
  WaitPeriodNotYetEndedJwkError,
];

function isTokenError(err: unknown): boolean {
  return TOKEN_ERROR_CLASSES.some((ErrorClass) => err instanceof ErrorClass);
}

export function createCognitoTokenVerifier(config: {
  userPoolId: string;
  clientId: string;
}): TokenVerifier {
  // Verifies signature (cached JWKS), issuer, expiry, token_use and client_id.
  const verifier = CognitoJwtVerifier.create({
    userPoolId: config.userPoolId,
    tokenUse: 'access',
    clientId: config.clientId,
  });

  return {
    async verify(token) {
      try {
        const payload = await verifier.verify(token);
        return { sub: payload.sub };
      } catch (err) {
        // Deliberately generic: don't reveal why verification failed.
        if (isTokenError(err)) throw new UnauthorizedError('Invalid or expired token');
        throw err;
      }
    },
  };
}
