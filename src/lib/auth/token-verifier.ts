import { CognitoJwtVerifier } from 'aws-jwt-verify';

export type VerifiedToken = { sub: string };

export type TokenVerifier = {
  verify(token: string): Promise<VerifiedToken>;
};

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
      const payload = await verifier.verify(token);
      return { sub: payload.sub };
    },
  };
}
