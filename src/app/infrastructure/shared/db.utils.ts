/**
 * Shared database utilities
 * For pagination and filtering helpers
 */

export const applyPagination = (query: any, { page, limit }: { page: number; limit: number }) => {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  };
  
  export const calculatePaginationMeta = (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  });
  