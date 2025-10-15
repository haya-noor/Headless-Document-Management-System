/**
 * Application configuration module
 * Centralizes all configuration settings by importing domain-specific configs
 */

// Import all domain-specific configurations
import { serverConfig } from './server.config';
import { databaseConfig } from './database.config';
import { jwtConfig } from './jwt.config';
import { uploadConfig } from './upload.config';
import { paginationConfig } from './pagination.config';
import { securityConfig } from './security.config';
import { storageConfig } from './storage.config';

/**
 * Unified application configuration object
 * Contains all configuration settings organized by domain
 */
export const config = {
  server: serverConfig,
  database: databaseConfig,
  jwt: jwtConfig,
  upload: uploadConfig,
  pagination: paginationConfig,
  security: securityConfig,
  storage: storageConfig,
} as const;

/**
 * Validate configuration on startup
 * Ensures all required settings are properly configured
 */
export function validateConfig(): void {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate numeric values
  if (isNaN(config.server.port)) {
    throw new Error('PORT must be a valid number');
  }

  if (isNaN(config.upload.maxFileSize)) {
    throw new Error('MAX_FILE_SIZE must be a valid number');
  }

  console.log('✅ Configuration validation passed');
}

// Export individual config sections for convenience
export const { server, database, jwt, upload, pagination, security, storage } = config;

// Re-export individual configs for direct access
export { serverConfig } from './server.config';
export { databaseConfig } from './database.config';
export { jwtConfig } from './jwt.config';
export { uploadConfig } from './upload.config';
export { paginationConfig } from './pagination.config';
export { securityConfig } from './security.config';
export { storageConfig } from './storage.config';
