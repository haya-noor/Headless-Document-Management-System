/**
 * Effect-based Base Repository Interface
 * Defines generic CRUD operations using Effect for all repositories
 * 
 * A shared base interface for all repositories to avoid code duplication 
 * It defines how every repository should behave, the error types they return, 
 * and the shapes of CRUD operations (create, read, update, delete) 
 * 
 */

import { Effect, Data, Option } from 'effect';
import { PaginationParams, PaginatedResponse } from './api.interface';

/**
 * Repository error types
 */
export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  message: string;
  cause?: unknown;
}> {}

export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  message: string;
  resource: string;
  id: string;
}> {}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}


export class ValidationError extends RepositoryError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}

export class ConflictError extends RepositoryError {
  constructor(message: string, field?: string) {
    super(message, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}


/**
 * Generic Effect-based repository interface for CRUD operations
 * @template T - Entity type
 * @template CreateDTO - Data transfer object for creation
 * @template UpdateDTO - Data transfer object for updates
 * @template FilterDTO - Data transfer object for filtering
 */
export interface Repository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>, FilterDTO = any> {
  /**
   * Find entity by ID
   * @param {string} id - Entity unique identifier
   * @returns {Promise<Option.Option<T>>} Option.Some(entity) if found, Option.None if not found
   */
  findById(id: string): Promise<Option.Option<T>>;

  /**
   * Find multiple entities with optional filtering
   * @param {FilterDTO} filters - Optional filters to apply
   * @returns {Effect.Effect<T[], DatabaseError>} Array of entities or error
   */
  findMany(filters?: FilterDTO): Effect.Effect<T[], DatabaseError>;

  /**
   * Find entities with pagination
   * @param {PaginationParams} pagination - Pagination parameters
   * @param {FilterDTO} filters - Optional filters to apply
   * @returns {Effect.Effect<PaginatedResponse<T>, DatabaseError>} Paginated response or error
   */
  findManyPaginated(
    pagination: PaginationParams,
    filters?: FilterDTO
  ): Effect.Effect<PaginatedResponse<T>, DatabaseError>;

  /**
   * Find single entity by filters
   * @param {FilterDTO} filters - Filters to apply
   * @returns {Effect.Effect<T, NotFoundError | DatabaseError>} Entity or error
   */
  findOne(filters: FilterDTO): Effect.Effect<T, NotFoundError | DatabaseError>;

  /**
   * Create new entity
   * @param {CreateDTO} data - Data for entity creation
   * @returns {Effect.Effect<T, ValidationError | ConflictError | DatabaseError>} Created entity or error
   */
  create(data: CreateDTO): Effect.Effect<T, ValidationError | ConflictError | DatabaseError>;

  /**
   * Create multiple entities
   * @param {CreateDTO[]} data - Array of data for entity creation
   * @returns {Effect.Effect<T[], ValidationError | ConflictError | DatabaseError>} Array of created entities or error
   */
  createMany(data: CreateDTO[]): Effect.Effect<T[], ValidationError | ConflictError | DatabaseError>;

  /**
   * Update entity by ID
   * @param {string} id - Entity unique identifier
   * @param {UpdateDTO} data - Data for entity update
   * @returns {Promise<Option.Option<T>>} Option.Some(updated entity) if found, Option.None if not found
   */
  update(id: string, data: UpdateDTO): Promise<Option.Option<T>>;

  /**
   * Update multiple entities by filters
   * @param {FilterDTO} filters - Filters to identify entities to update
   * @param {UpdateDTO} data - Data for entity update
   * @returns {Effect.Effect<number, ValidationError | DatabaseError>} Number of updated entities or error
   */
  updateMany(filters: FilterDTO, data: UpdateDTO): Effect.Effect<number, ValidationError | DatabaseError>;

  /**
   * Delete entity by ID
   * @param {string} id - Entity unique identifier
   * @returns {Effect.Effect<boolean, NotFoundError | DatabaseError>} True if entity was deleted or error
   */
  delete(id: string): Effect.Effect<boolean, NotFoundError | DatabaseError>;

  /**
   * Soft delete entity by ID (if supported)
   * @param {string} id - Entity unique identifier
   * @returns {Effect.Effect<boolean, NotFoundError | DatabaseError>} True if entity was soft deleted or error
   */
  softDelete?(id: string): Effect.Effect<boolean, NotFoundError | DatabaseError>;

  /**
   * Delete multiple entities by filters
   * @param {FilterDTO} filters - Filters to identify entities to delete
   * @returns {Effect.Effect<number, DatabaseError>} Number of deleted entities or error
   */
  deleteMany(filters: FilterDTO): Effect.Effect<number, DatabaseError>;

  /**
   * Check if entity exists by ID
   * @param {string} id - Entity unique identifier
   * @returns {Effect.Effect<boolean, DatabaseError>} True if entity exists or error
   */
  exists(id: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Count entities with optional filtering
   * @param {FilterDTO} filters - Optional filters to apply
   * @returns {Effect.Effect<number, DatabaseError>} Number of entities or error
   */
  count(filters?: FilterDTO): Effect.Effect<number, DatabaseError>;
}

/**
 * Repository error union type
 */
export type RepositoryErrorType = 
  | NotFoundError 
  | ValidationError 
  | ConflictError 
  | DatabaseError;
