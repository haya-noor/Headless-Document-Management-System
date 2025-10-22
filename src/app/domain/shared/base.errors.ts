import { Data } from "effect"

/**
 * Domain Errors Module
 * 
 * Consolidated error hierarchy with Effect integration.
 * All domain errors use Effect's Data.TaggedError for better error handling.
 */

// ---------------------------------------------------------------------------
// Base Domain Error
// ---------------------------------------------------------------------------

/**
 * DomainError - Base class for all domain errors
 * 
 * All domain-specific errors should extend this class.
 */
export abstract class DomainError extends Error {
  readonly tag: string

  constructor(
    tag: string,
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.tag = tag
    this.name = tag
    Object.setPrototypeOf(this, new.target.prototype)
  }

  toJSON() {
    return {
      tag: this.tag,
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      ...(this.cause && { cause: String(this.cause) })
    }
  }
}

// ---------------------------------------------------------------------------
// Validation Errors
// ---------------------------------------------------------------------------

/**
 * ValidationError - For validation failures
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field?: string
  readonly value?: unknown
  readonly message: string
  readonly details?: Record<string, unknown>
}> {
  static forField(field: string, value: unknown, message: string) {
    return new ValidationError({
      field,
      value,
      message: `${field}: ${message}`
    })
  }

  static forFields(errors: Record<string, string>) {
    return new ValidationError({
      message: "Multiple validation errors",
      details: errors
    })
  }
}

// ---------------------------------------------------------------------------
// Entity Not Found Errors
// ---------------------------------------------------------------------------

/**
 * NotFoundError - For missing entities
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string
  readonly id: string
  readonly message: string
}> {
  static forResource(resource: string, id: string) {
    return new NotFoundError({
      resource,
      id,
      message: `${resource} with id '${id}' not found`
    })
  }

  static forCriteria(resource: string, criteria: Record<string, unknown>) {
    const criteriaStr = Object.entries(criteria)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")
    return new NotFoundError({
      resource,
      id: criteriaStr,
      message: `${resource} not found (${criteriaStr})`
    })
  }
}

// ---------------------------------------------------------------------------
// Duplicate Entity Errors
// ---------------------------------------------------------------------------

/**
 * AlreadyExistsError - For duplicate entities
 */
export class AlreadyExistsError extends Data.TaggedError("AlreadyExistsError")<{
  readonly resource: string
  readonly field: string
  readonly value: unknown
  readonly message: string
}> {
  static forField(resource: string, field: string, value: unknown) {
    return new AlreadyExistsError({
      resource,
      field,
      value,
      message: `${resource} with ${field} '${value}' already exists`
    })
  }
}

// ---------------------------------------------------------------------------
// Conflict Errors
// ---------------------------------------------------------------------------

/**
 * ConflictError - For integrity constraint violations
 */
export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly message: string
  readonly field?: string
  readonly constraint?: string
  readonly details?: Record<string, unknown>
}> {
  static forConstraint(constraint: string, field?: string, details?: Record<string, unknown>) {
    return new ConflictError({
      message: `Constraint violation: ${constraint}`,
      field,
      constraint,
      details
    })
  }
}

// ---------------------------------------------------------------------------
// Business Rule Violations
// ---------------------------------------------------------------------------

/**
 * BusinessRuleViolationError - For business logic violations
 */
export class BusinessRuleViolationError extends Data.TaggedError("BusinessRuleViolationError")<{
  readonly code: string
  readonly message: string
  readonly context?: Record<string, unknown>
}> {
  static withContext(code: string, message: string, context: Record<string, unknown>) {
    return new BusinessRuleViolationError({
      code,
      message,
      context
    })
  }
}

// ---------------------------------------------------------------------------
// Database/Infrastructure Errors
// ---------------------------------------------------------------------------

/**
 * DatabaseError - For persistence layer failures
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly cause?: unknown
  readonly query?: string
  readonly operation?: string
}> {
  static forOperation(operation: string, cause: unknown) {
    return new DatabaseError({
      message: `Database operation '${operation}' failed`,
      operation,
      cause
    })
  }

  static forQuery(query: string, cause: unknown) {
    return new DatabaseError({
      message: "Database query failed",
      query,
      cause
    })
  }
}

// ---------------------------------------------------------------------------
// Repository Error (Legacy compatibility)
// ---------------------------------------------------------------------------

/**
 * RepositoryError - Base class for repository errors
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "RepositoryError"
  }
}

// ---------------------------------------------------------------------------
// Union Types
// ---------------------------------------------------------------------------

export type RepositoryErrorType =
  | DatabaseError
  | NotFoundError
  | ValidationError
  | ConflictError
  | AlreadyExistsError
  | BusinessRuleViolationError

export type MutationErrorType =
  | ValidationError
  | ConflictError
  | AlreadyExistsError
  | BusinessRuleViolationError

export type QueryErrorType = DatabaseError | NotFoundError

// ---------------------------------------------------------------------------
// Error Utilities
// ---------------------------------------------------------------------------

export const isDomainError = (error: unknown): error is DomainError =>
  error instanceof DomainError

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError

export const isNotFoundError = (error: unknown): error is NotFoundError =>
  error instanceof NotFoundError

export const isConflictError = (error: unknown): error is ConflictError =>
  error instanceof ConflictError

export const isDatabaseError = (error: unknown): error is DatabaseError =>
  error instanceof DatabaseError

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return String(error)
}

export const toDomainError = (error: unknown): DomainError => {
  if (isDomainError(error)) return error
  
  if (error instanceof Error) {
    return new ValidationError({
      message: error.message,
      details: { originalError: error.name }
    })
  }
  
  return new ValidationError({
    message: "An unknown error occurred",
    details: { error: String(error) }
  })
}
