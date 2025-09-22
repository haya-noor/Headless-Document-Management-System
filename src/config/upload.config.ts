/**
 * File upload configuration
 * Contains all file upload-related configuration settings
 */

import { getEnvVar } from './utils';

export const uploadConfig = {
  maxFileSize: parseInt(getEnvVar('MAX_FILE_SIZE', '10485760')), // 10MB default
  allowedFileTypes: getEnvVar(
    'ALLOWED_FILE_TYPES',
    'image/jpeg,image/png,image/gif,application/pdf,text/plain'
  ).split(','),
} as const;
