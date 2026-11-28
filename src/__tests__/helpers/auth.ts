import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

let cachedToken: string | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var for auth test helper: ${name}`);
  return value;
}

function decodeSub(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  return payload.sub;
}

// One real Cognito sign-in per test file (module cache), access token only.
export async function getTestAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const client = new CognitoIdentityProviderClient({ region: requireEnv('COGNITO_REGION') });
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: requireEnv('COGNITO_APP_CLIENT_ID'),
      AuthParameters: {
        USERNAME: requireEnv('TEST_COGNITO_USERNAME'),
        PASSWORD: requireEnv('TEST_COGNITO_PASSWORD'),
      },
    }),
  );

  const token = result.AuthenticationResult?.AccessToken;
  if (!token) {
    // e.g. NEW_PASSWORD_REQUIRED means the test user's password isn't permanent
    throw new Error(
      `Cognito did not return a token (challenge: ${result.ChallengeName ?? 'none'})`,
    );
  }

  // Fail fast if the seed's sub and the real token's sub have drifted apart
  if (decodeSub(token) !== requireEnv('TEST_COGNITO_SUB')) {
    throw new Error('TEST_COGNITO_SUB does not match the sub in the minted token');
  }

  cachedToken = token;
  return token;
}

export async function authHeader(): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await getTestAccessToken()}` };
}
