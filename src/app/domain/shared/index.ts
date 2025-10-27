/**
 * Shared Domain Exports
 * 
 * Central export point for all shared domain utilities, types, and base classes.
 */

// Base entity and serialization
export {
  BaseEntity,
  type SerializedEntity,
} from "./base.entity"

// Errors
export {
  DomainError,
  ValidationError,
  NotFoundError,
  AlreadyExistsError,
  ConflictError,
  BusinessRuleViolationError,
  DatabaseError,
  RepositoryError,
  type RepositoryErrorType,
  type MutationErrorType,
  type QueryErrorType,
  isDomainError,
  isValidationError,
  isNotFoundError,
  isConflictError,
  isDatabaseError,
  getErrorMessage,
  toDomainError,
} from "./base.errors"

// Pagination
// export {
//   PaginationParams,
//   PaginatedResponse,
//   PaginationOptions,
//   calculateOffset,
//   calculateTotalPages,
//   hasNextPage,
//   hasPreviousPage,
//   createPaginationMeta,
//   buildPaginatedResponse,
//   withPaginationCount,
//   validatePaginationParams,
//   DEFAULT_PAGINATION,
//   withDefaults,
//   Paginator,
//   type Cursor,
//   type CursorPaginated,
//   encodeCursor,
//   decodeCursor,
// } from "./pagination"

// API interfaces
// export {
//   ApiResponse,
// } from "./api.interface"

// Base repository
export {
  BaseRepository,
  type RepositoryEffect,
  type QueryEffect,
  type MutationEffect,
} from "./base.repository"

// Schema utilities
export {
  Optional,
  BaseEntitySchema,
  BaseEntityRowSchema,
} from "./schema.utils"
