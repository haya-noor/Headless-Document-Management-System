/**
 * Database configuration
 * Contains all database-related configuration settings
 */

import { getEnvVar } from './utils';

export const databaseConfig = {
  url: getEnvVar('DATABASE_URL'),
  connectionPool: {
    max: parseInt(getEnvVar('DB_POOL_MAX', '10')), // Maximum number of connections
    idleTimeout: parseInt(getEnvVar('DB_POOL_IDLE_TIMEOUT', '20')), // Close idle connections after 20 seconds
    connectTimeout: parseInt(getEnvVar('DB_POOL_CONNECT_TIMEOUT', '10')), // Connection timeout in seconds
  },
} as const;
