/**
 * Effect-based Base Repository Interface (Domain Layer)
 * 
 * This file defines the shared structure for all repositories in the domain layer.
 * 
 * It abstracts away persistence concerns, ensuring that the domain only depends
 * on pure entities and domain types — never on DTOs or infrastructure details.
 * 
 * Every concrete repository implementation (e.g., Prisma, Mongo, REST, etc.)
 * will exist in the infrastructure layer, and depend on this interface.
 */

import { Effect, Data, Option } from 'effect'
import { PaginationParams, PaginatedResponse } from './api.interface'

// --------------------
// Error Definitions
// --------------------

// Represents a general database or persistence failure (e.g., query error, connection lost)
export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  message: string
  cause?: unknown
}> {}

// Raised when an entity is not found (e.g., lookup by ID fails)
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  message: string
  resource: string
  id: string
}> {}

// Base class for all repository-related domain errors
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

// Used when validation rules inside the domain are violated
export class ValidationError extends RepositoryError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    if (field) this.message = `${field}: ${message}`
  }
}

// Raised when a unique or integrity constraint is violated (e.g., duplicate email)
export class ConflictError extends RepositoryError {
  constructor(message: string, field?: string) {
    super(message, 'CONFLICT_ERROR')
    this.name = 'ConflictError'
    if (field) this.message = `${field}: ${message}`
  }
}

// Raised when a domain or business invariant is broken (e.g., rule violation)
// 
export class BusinessRuleViolationError extends RepositoryError {
  constructor(
    code: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message, code)
    this.name = 'BusinessRuleViolationError'
  }
}

// --------------------
// Base Repository Interface (Domain Layer)
// --------------------
//
// T      → Entity type (aggregate root or domain entity)
// Filter → Optional type used for searching/filtering entities
//
// Notes:
// - The repository deals only with domain entities.
// - It does not accept DTOs or persistence models.
// - Validation and mapping from external DTOs happen in the application layer.
//
export interface Repository<T, Filter = unknown> {
  // Finds an entity by its ID. Returns Option.Some if found, Option.None if not found.
  findById(id: string): Effect.Effect<Option.Option<T>, DatabaseError>

  // Returns a list of entities matching the given filter.
  findMany(filter?: Filter): Effect.Effect<T[], DatabaseError>

  // Returns entities with pagination support.
  findManyPaginated(
    pagination: PaginationParams,
    filter?: Filter
  ): Effect.Effect<PaginatedResponse<T>, DatabaseError>

  // Saves a new or existing entity. The entity is validated by the domain itself.
  save(entity: T): Effect.Effect<T, DatabaseError | ConflictError | ValidationError>

  // Removes an entity by its ID. Returns true if deleted.
  delete(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError>

  // Optionally performs a soft delete (e.g., mark as inactive).
  softDelete?(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError>

  // Checks if an entity exists by ID.
  exists(id: string): Effect.Effect<boolean, DatabaseError>

  // Counts entities that match the given filter.
  count(filter?: Filter): Effect.Effect<number, DatabaseError>
}

// --------------------
// Union Type for Repository Errors
// --------------------
export type RepositoryErrorType =
  | DatabaseError
  | NotFoundError
  | ValidationError
  | ConflictError
  | BusinessRuleViolationError
