import { Effect, Schema as S } from "effect"
import { DatabaseError, ValidationError } from "./base.errors"
import { createRangeFilter, createPositiveFilter } from "./validation.utils"

/**
 * Pagination Module
 * 
 * Centralized pagination utilities with Effect integration.
 * All pagination-related types and functions are defined here.
 */

// ---------------------------------------------------------------------------
// Core Pagination Types
// ---------------------------------------------------------------------------

/**
 * Pagination parameters (unvalidated)
 * 
 * Basic pagination parameters from API requests.
 * Use PaginationOptions for validated version.
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

/**
 * Paginated response wrapper
 * 
 * Standard format for paginated API responses.
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * PaginationOptions schema with validation
 * 
 * Ensures pagination parameters are valid:
 * - page: >= 1
 * - limit: 1-100
 * - sortOrder: "asc" or "desc"
 */
export const PaginationOptions = S.Struct({
  page: S.Number.pipe(createPositiveFilter("page")),
  limit: S.Number.pipe(createRangeFilter(1, 100, "limit")),
  sortBy: S.optional(S.String),
  sortOrder: S.optional(S.Literal("asc", "desc"))
})

export type PaginationOptions = S.Schema.Type<typeof PaginationOptions>

/**
 * Calculate offset from page and limit
 */
export const calculateOffset = (page: number, limit: number): number => 
  (page - 1) * limit

/**
 * Calculate total pages from total items and limit
 */
export const calculateTotalPages = (total: number, limit: number): number =>
  Math.ceil(total / limit)

/**
 * Check if there is a next page
 */
export const hasNextPage = (page: number, totalPages: number): boolean =>
  page < totalPages

/**
 * Check if there is a previous page
 */
export const hasPreviousPage = (page: number): boolean =>
  page > 1

/**
 * Create pagination metadata object
 */
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
) => ({
  page,
  limit,
  total,
  totalPages: calculateTotalPages(total, limit),
  hasNext: hasNextPage(page, calculateTotalPages(total, limit)),
  hasPrev: hasPreviousPage(page),
})

/**
 * Build a paginated response from data and pagination params
 */
export const buildPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => ({
  data,
  pagination: createPaginationMeta(page, limit, total),
})

/**
 * Execute a count query and build paginated response
 * 
 * Generic helper to combine data fetching with count query
 */
export const withPaginationCount = <T>(
  data: T[],
  countEffect: Effect.Effect<number, DatabaseError>,
  params: PaginationParams
): Effect.Effect<PaginatedResponse<T>, DatabaseError> =>
  Effect.gen(function* (_) {
    const total = yield* _(countEffect)
    return buildPaginatedResponse(data, params.page, params.limit, total)
  })

/**
 * Validate pagination parameters
 * 
 * Ensures page and limit are positive integers using Effect Schema.
 */
export const validatePaginationParams = (
  params: Partial<PaginationParams>
): Effect.Effect<PaginationOptions, ValidationError, never> => {
  const validated = S.decodeUnknown(PaginationOptions)({
    page: params.page ?? DEFAULT_PAGINATION.page,
    limit: params.limit ?? DEFAULT_PAGINATION.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder
  })
  
  return validated.pipe(
    Effect.mapError((err) =>
      ValidationError.forField(
        "pagination",
        params,
        err && typeof err === "object" && "message" in err
          ? String((err as any).message)
          : "Invalid pagination parameters"
      )
    )
  ) as Effect.Effect<PaginationOptions, ValidationError, never>
}

/**
 * Default pagination params
 */
export const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
}

/**
 * Apply default pagination values
 */
export const withDefaults = (
  params?: Partial<PaginationParams>
): PaginationParams => ({
  ...DEFAULT_PAGINATION,
  ...params,
})

// ---------------------------------------------------------------------------
// Paginator Utility Class
// ---------------------------------------------------------------------------

/**
 * Paginator - Utility for paginating collections with Effect
 * 
 * Provides a fluent API for paginating data with proper Effect integration.
 * Handles validation, offset calculation, and response building.
 * 
 * @example
 * ```typescript
 * const paginator = new Paginator<User>()
 * 
 * const result = paginator
 *   .paginate(users)
 *   .withOptions({ page: 2, limit: 10 })
 *   .withTotal(totalCount)
 *   .build()
 * ```
 */
export class Paginator<T> {
  private data: T[] = []
  private options: PaginationOptions = DEFAULT_PAGINATION as PaginationOptions
  private totalCount: number = 0

  /**
   * Set the data to paginate
   */
  paginate(data: T[]): this {
    this.data = data
    return this
  }

  /**
   * Set pagination options with validation
   */
  withOptions(options: Partial<PaginationParams>): Effect.Effect<this, ValidationError> {
    return validatePaginationParams(options).pipe(
      Effect.map((validated) => {
        this.options = validated
        return this
      })
    )
  }

  /**
   * Set total count for pagination metadata
   */
  withTotal(total: number): this {
    this.totalCount = total
    return this
  }

  /**
   * Build the paginated response
   */
  build(): PaginatedResponse<T> {
    return buildPaginatedResponse(
      this.data,
      this.options.page,
      this.options.limit,
      this.totalCount
    )
  }

  /**
   * Build paginated response as Effect
   */
  buildEffect(): Effect.Effect<PaginatedResponse<T>, never> {
    return Effect.succeed(this.build())
  }

  /**
   * Static factory method for cleaner usage
   */
  static create<T>() {
    return new Paginator<T>()
  }

  /**
   * One-shot pagination helper
   * 
   * Convenience method for simple pagination without builder pattern.
   * 
   * @example
   * ```typescript
   * const result = Paginator.paginate(users, { page: 1, limit: 10 }, 100)
   * // Effect<PaginatedResponse<User>, ValidationError>
   * ```
   */
  static paginate<T>(
    data: T[],
    options: Partial<PaginationParams>,
    total: number
  ): Effect.Effect<PaginatedResponse<T>, ValidationError> {
    return validatePaginationParams(options).pipe(
      Effect.map((validated) =>
        buildPaginatedResponse(data, validated.page, validated.limit, total)
      )
    )
  }

  /**
   * Paginate Effect-wrapped data
   * 
   * Chains pagination after an Effect that produces data.
   * 
   * @example
   * ```typescript
   * const users = Effect.succeed([user1, user2, user3])
   * const paginated = Paginator.paginateEffect(
   *   users,
   *   { page: 1, limit: 10 },
   *   () => Effect.succeed(3)
   * )
   * ```
   */
  static paginateEffect<T, E>(
    dataEffect: Effect.Effect<T[], E>,
    options: Partial<PaginationParams>,
    countEffect: () => Effect.Effect<number, E>
  ): Effect.Effect<PaginatedResponse<T>, E | ValidationError> {
    return Effect.gen(function* (_) {
      const validated = yield* _(validatePaginationParams(options))
      const data = yield* _(dataEffect)
      const total = yield* _(countEffect())
      return buildPaginatedResponse(data, validated.page, validated.limit, total)
    })
  }
}

// ---------------------------------------------------------------------------
// Cursor-based Pagination (Advanced)
// ---------------------------------------------------------------------------

/**
 * Cursor for cursor-based pagination
 * 
 * Alternative to offset-based pagination for large datasets.
 */
export interface Cursor {
  readonly value: string
  readonly direction: "forward" | "backward"
}

/**
 * Cursor-paginated result
 */
export interface CursorPaginated<T> {
  readonly data: ReadonlyArray<T>
  readonly pageInfo: {
    readonly hasNextPage: boolean
    readonly hasPreviousPage: boolean
    readonly startCursor?: string
    readonly endCursor?: string
  }
}

/**
 * Encode cursor value
 * 
 * Base64 encode cursor for safe transport.
 */
export const encodeCursor = (value: string): string =>
  Buffer.from(value).toString("base64")

/**
 * Decode cursor value
 * 
 * Base64 decode cursor.
 */
export const decodeCursor = (cursor: string): Effect.Effect<string, ValidationError> =>
  Effect.try({
    try: () => Buffer.from(cursor, "base64").toString("utf-8"),
    catch: (err) =>
      ValidationError.forField("cursor", cursor, "Invalid cursor format")
  })

