/**
 * JWT configuration
 * Contains all JWT-related configuration settings
 */

function getJWTEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
}

export const jwtConfig = {
  secret: getJWTEnvVar('JWT_SECRET'),
  expiresIn: getJWTEnvVar('JWT_EXPIRES_IN', '24h'),
} as const;
