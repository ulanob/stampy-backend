export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const cognitoConfig = {
  userPoolId: requireEnv('COGNITO_USER_POOL_ID'),
  clientId: requireEnv('COGNITO_APP_CLIENT_ID'),
};
