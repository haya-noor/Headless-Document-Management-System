/**
 * Server configuration
 * Contains all server-related configuration settings
 */

import { getEnvVar } from './utils';

export const serverConfig = {
  port: parseInt(getEnvVar('PORT', '3002')),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
} as const;
