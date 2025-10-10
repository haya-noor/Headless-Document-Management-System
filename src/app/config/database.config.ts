/**
 * Database configuration
 * Contains all database-related configuration settings
 */

function getDatabaseEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
}

export const databaseConfig = {
  url: getDatabaseEnvVar('DATABASE_URL'),
  connectionPool: {
    max: 10, // Maximum number of connections
    idleTimeout: 20, // Close idle connections after 20 seconds
    connectTimeout: 10, // Connection timeout in seconds
  },
} as const;
