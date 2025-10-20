/**
 * storage.config.ts → Runtime values from .env (actual configuration data)
 * 
 * Storage configuration (contains environment variables for storage providers)
 * Defines storage provider settings and options
 * Defines storage type (e.g., local, cloud).
 * Supplies credentials and settings for each provider.
 * 
 * Used by:
 * - src/app/infrastructure/storage/storage.factory.ts (for provider selection)
 * - src/app/infrastructure/storage/local-storage.ts (for local storage path)
 */

import { getEnvVar } from './utils';
import type { StorageConfig } from '../storage/storage.interface';

export const storageConfig: StorageConfig = {
  provider: getEnvVar('STORAGE_PROVIDER', 'local') as 'local' | 's3' | 'gcs' | 'azure',
  local: {
    storagePath: getEnvVar('LOCAL_STORAGE_PATH', 'local-storage'),
  },
  s3: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    region: getEnvVar('S3_REGION', 'us-east-1'),
    bucket: process.env.S3_BUCKET || '',
    endpoint: process.env.S3_ENDPOINT || '', // For MinIO or other S3-compatible services
  },
  gcs: {
    projectId: process.env.GCS_PROJECT_ID || '',
    keyFilename: process.env.GCS_KEY_FILENAME || '',
    bucket: process.env.GCS_BUCKET || '',
  },
  azure: {
    connectionString: process.env.AZURE_CONNECTION_STRING || '',
    containerName: process.env.AZURE_CONTAINER_NAME || '',
  },
};
