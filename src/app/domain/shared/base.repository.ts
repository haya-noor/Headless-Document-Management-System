import { Effect, Option } from "effect"
import { DatabaseError } from "./base.errors"
import { PaginationParams, PaginatedResponse } from "./api.interface"

/**
 * Base Repository Module
 * 
 * Abstract repository pattern with Effect integration.
 * Provides type-safe CRUD operations and common repository patterns.
 */

// ---------------------------------------------------------------------------
// Type Aliases
// ---------------------------------------------------------------------------

/**
 * RepositoryEffect<T, E>
 * 
 * Type alias for Effect-based repository operations.
 * All repository methods should return this type.
 * 
 * @template T - Success type (entity or result)
 * @template E - Error type (domain-specific errors)
 * 
 * @example
 * ```typescript
 * findById(id: string): RepositoryEffect<Option<User>, DatabaseError>
 * save(user: User): RepositoryEffect<User, ValidationError | ConflictError>
 * ```
 */
export type RepositoryEffect<T, E = never> = Effect.Effect<T, E, never>

/**
 * QueryEffect<T>
 * 
 * Type alias for read operations (queries).
 * Returns data with only DatabaseError as error channel.
 */
export type QueryEffect<T> = RepositoryEffect<T, DatabaseError>

/**
 * MutationEffect<T, E>
 * 
 * Type alias for write operations (mutations).
 * Returns data with domain-specific errors + DatabaseError.
 */
export type MutationEffect<T, E> = RepositoryEffect<T, E | DatabaseError>

// ---------------------------------------------------------------------------
// Base Repository Abstract Class
// ---------------------------------------------------------------------------

/**
 * BaseRepository<TEntity, TNotFoundError, TMutationError>
 * 
 * Abstract base class for all domain repositories.
 * Provides common CRUD operations with type-safe Effect signatures.
 * 
 * @template TEntity - The domain entity type
 * @template TNotFoundError - Domain-specific not found error
 * @template TMutationError - Domain-specific mutation errors (validation, conflict, etc.)
 * 
 * @example
 * ```typescript
 * export abstract class UserRepository extends BaseRepository<
 *   UserEntity,
 *   UserNotFoundError,
 *   UserValidationError | UserAlreadyExistsError
 * > {
 *   protected readonly entityName = "User"
 *   
 *   // Domain-specific methods
 *   abstract findByEmail(email: string): QueryEffect<Option<UserEntity>>
 * }
 * ```
 */
export abstract class BaseRepository<
  TEntity,
  TNotFoundError,
  TMutationError
> {
  /**
   * Entity name for error messages
   * Must be defined by concrete implementations
   */
  protected abstract readonly entityName: string

  /**
   * Find an entity by its unique ID
   * 
   * @param id - Entity identifier
   * @returns Effect with Option of entity (Some if found, None if not)
   */
  abstract findById(
    id: string
  ): QueryEffect<Option.Option<TEntity>>

  /**
   * Check if an entity exists by ID
   * 
   * @param id - Entity identifier
   * @returns Effect with boolean (true if exists)
   */
  abstract exists(
    id: string
  ): QueryEffect<boolean>

  /**
   * Save an entity (insert or update)
   * 
   * Implements upsert pattern - creates if new, updates if exists.
   * Error boundary: All mutation errors are domain-specific.
   * 
   * @param entity - Domain entity to save
   * @returns Effect with saved entity or mutation/database errors
   */
  abstract save(
    entity: TEntity
  ): MutationEffect<TEntity, TMutationError>

  /**
   * Delete an entity by ID
   * 
   * @param id - Entity identifier
   * @returns Effect with boolean (true if deleted, false if not found)
   */
  abstract delete(
    id: string
  ): RepositoryEffect<boolean, TNotFoundError | DatabaseError>

  /**
   * Count entities matching a filter
   * 
   * @param filter - Optional filter criteria
   * @returns Effect with count
   */
  abstract count(
    filter?: unknown
  ): QueryEffect<number>

  // ---------------------------------------------------------------------------
  // Helper Methods (Optional overrides)
  // ---------------------------------------------------------------------------

  /**
   * Batch insert multiple entities
   * 
   * Optional method for bulk operations.
   * Concrete repositories can override for optimized batch inserts.
   * 
   * @param entities - Array of entities to insert
   * @returns Effect with inserted entities
   */
  batchInsert?(
    entities: TEntity[]
  ): MutationEffect<TEntity[], TMutationError>

  /**
   * Batch delete multiple entities by IDs
   * 
   * Optional method for bulk operations.
   * 
   * @param ids - Array of entity identifiers
   * @returns Effect with count of deleted entities
   */
  batchDelete?(
    ids: string[]
  ): QueryEffect<number>

  /**
   * Soft delete (mark as inactive)
   * 
   * Optional method for entities that support soft deletion.
   * 
   * @param id - Entity identifier
   * @returns Effect with boolean (true if soft deleted)
   */
  softDelete?(
    id: string
  ): RepositoryEffect<boolean, TNotFoundError | DatabaseError>

  /**
   * Restore soft-deleted entity
   * 
   * Optional method for entities that support soft deletion.
   * 
   * @param id - Entity identifier
   * @returns Effect with restored entity
   */
  restore?(
    id: string
  ): MutationEffect<TEntity, TMutationError>
}

// ---------------------------------------------------------------------------
// Repository Helpers
// ---------------------------------------------------------------------------

/**
 * Helper to convert Option.Option<T> to T with NotFoundError
 * 
 * Useful pattern for converting findById (returns Option) to getById (returns T or error).
 * 
 * @example
 * ```typescript
 * const getById = (id: string) =>
 *   pipe(
 *     repository.findById(id),
 *     Effect.flatMap(unwrapOrNotFound(() => new UserNotFoundError(id)))
 *   )
 * ```
 */
export const unwrapOrNotFound = <T, E>(
  createError: () => E
) => (option: Option.Option<T>): Effect.Effect<T, E> =>
  Option.match(option, {
    onNone: () => Effect.fail(createError()),
    onSome: (value) => Effect.succeed(value)
  })

/**
 * Helper to check existence and fail if not found
 * 
 * @example
 * ```typescript
 * pipe(
 *   repository.exists(id),
 *   Effect.flatMap(failIfNotFound(id, () => new UserNotFoundError(id))),
 *   Effect.flatMap(() => /* continue with operation *\/)
 * )
 * ```
 */
export const failIfNotFound = <E>(
  id: string,
  createError: () => E
) => (exists: boolean): Effect.Effect<void, E> =>
  exists
    ? Effect.succeed(void 0)
    : Effect.fail(createError())

/**
 * Helper to check non-existence and fail if exists
 * 
 * Useful for preventing duplicate creation.
 * 
 * @example
 * ```typescript
 * pipe(
 *   repository.exists(id),
 *   Effect.flatMap(failIfExists(() => new UserAlreadyExistsError(email))),
 *   Effect.flatMap(() => /* continue with creation *\/)
 * )
 * ```
 */
export const failIfExists = <E>(
  createError: () => E
) => (exists: boolean): Effect.Effect<void, E> =>
  exists
    ? Effect.fail(createError())
    : Effect.succeed(void 0)
