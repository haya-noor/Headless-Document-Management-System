/**
 * Application configuration module
 * Centralizes all environment variables and configuration settings
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Validate required environment variables
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
}

/**
 * Application configuration object
 * Contains all configuration settings with validation
 */
export const config = {
  // Server configuration
  server: {
    port: parseInt(getEnvVar('PORT', '3000')),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
    isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  },

  // Database configuration
  database: {
    url: getEnvVar('DATABASE_URL'),
  },

  // JWT configuration
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  },

  // Storage configuration
  storage: {
    provider: getEnvVar('STORAGE_PROVIDER', 'local') as 'local' | 's3' | 'gcs' | 'azure',
    local: {
      storagePath: getEnvVar('LOCAL_STORAGE_PATH', './storage'),
    },
    // Future S3 configuration (not used currently)
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || '',
      endpoint: process.env.AWS_S3_ENDPOINT, // For MinIO compatibility
    },
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(getEnvVar('MAX_FILE_SIZE', '10485760')), // 10MB default
    allowedFileTypes: getEnvVar(
      'ALLOWED_FILE_TYPES',
      'image/jpeg,image/png,image/gif,application/pdf,text/plain'
    ).split(','),
  },

  // Pagination configuration
  pagination: {
    defaultPageSize: parseInt(getEnvVar('DEFAULT_PAGE_SIZE', '10')),
    maxPageSize: parseInt(getEnvVar('MAX_PAGE_SIZE', '100')),
  },

  // Security configuration
  security: {
    bcryptRounds: 12, // Number of salt rounds for bcrypt
    downloadLinkExpiry: 3600, // Pre-signed URL expiry in seconds (1 hour)
  },
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
export const { server, database, jwt, storage, upload, pagination, security } = config;
