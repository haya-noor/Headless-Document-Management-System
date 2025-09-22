/**
 * Pagination configuration
 * Contains all pagination-related configuration settings
 */

import { getEnvVar } from './utils';

export const paginationConfig = {
  defaultPageSize: parseInt(getEnvVar('DEFAULT_PAGE_SIZE', '10')),
  maxPageSize: parseInt(getEnvVar('MAX_PAGE_SIZE', '100')),
} as const;
