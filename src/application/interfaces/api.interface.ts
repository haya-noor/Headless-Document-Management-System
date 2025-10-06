/**
 * API-related interfaces
 */

/**
 * API response wrapper
 * ApiResponse is a generic type that can be used to return any type of data
 * data return type is T because different endpoints return different types of data so we need to be able to return any type of data
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;   
  error?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
