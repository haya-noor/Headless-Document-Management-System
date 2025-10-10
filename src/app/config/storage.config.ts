/**
 * Storage configuration
 * Contains all storage-related configuration settings
 */

import { getEnvVar } from './utils';

export const storageConfig = {
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
} as const;
