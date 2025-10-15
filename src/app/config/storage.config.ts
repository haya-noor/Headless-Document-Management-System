/**
 * Storage configuration
 * Defines storage provider settings and options
 */

export const storageConfig = {
  provider: (process.env.STORAGE_PROVIDER as 'local' | 's3' | 'gcs' | 'azure') || 'local',
  local: {
    basePath: process.env.LOCAL_STORAGE_PATH || 'local-storage',
  },
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  gcs: {
    bucket: process.env.GCS_BUCKET || '',
    projectId: process.env.GCS_PROJECT_ID || '',
    keyFilename: process.env.GCS_KEY_FILENAME || '',
  },
  azure: {
    accountName: process.env.AZURE_ACCOUNT_NAME || '',
    accountKey: process.env.AZURE_ACCOUNT_KEY || '',
    containerName: process.env.AZURE_CONTAINER_NAME || '',
  },
} as const;
