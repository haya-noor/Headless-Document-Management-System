/**
 * Storage configuration (contains environment variables for storage providers)
 * Defines storage provider settings and options
 * Defines storage type (e.g., local, cloud).
  Supplies credentials and settings for each provider.
 * 
 * Used by:
 * - src/app/infrastructure/storage/storage.factory.ts (for provider selection)
 * - src/app/infrastructure/storage/local-storage.ts (for local storage path)
 */

import { getEnvVar } from './utils';

export const storageConfig = {
  provider: (getEnvVar('STORAGE_PROVIDER', 'local') as 'local' | 's3' | 'gcs' | 'azure'),
  local: {
    storagePath: getEnvVar('LOCAL_STORAGE_PATH', 'local-storage'),
  },
  s3: {
    accessKeyId: getEnvVar('S3_ACCESS_KEY_ID', ''),
    secretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY', ''),
    region: getEnvVar('S3_REGION', 'us-east-1'),
    bucket: getEnvVar('S3_BUCKET', ''),
    endpoint: getEnvVar('S3_ENDPOINT', ''), // For MinIO or other S3-compatible services
  },
  gcs: {
    projectId: getEnvVar('GCS_PROJECT_ID', ''),
    keyFilename: getEnvVar('GCS_KEY_FILENAME', ''),
    bucket: getEnvVar('GCS_BUCKET', ''),
  },
  azure: {
    connectionString: getEnvVar('AZURE_CONNECTION_STRING', ''),
    containerName: getEnvVar('AZURE_CONTAINER_NAME', ''),
  },
} as const;
