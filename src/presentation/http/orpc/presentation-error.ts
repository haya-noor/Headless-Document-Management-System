import { ParseResult } from "effect"

// Domain base errors
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AlreadyExistsError,
  BusinessRuleViolationError,
  DatabaseError,
  RepositoryError
} from "@/app/domain/shared/base.errors"

// Document errors
import {
  DocumentNotFoundError,
  DocumentValidationError
} from "@/app/domain/document/errors"

// Document version errors
import {
  DocumentVersionNotFoundError,
  DocumentVersionValidationError
} from "@/app/domain/d-version/errors"

// User errors
import {
  UserNotFoundError,
  UserValidationError,
  UserRoleError
} from "@/app/domain/user/errors"

// Access policy errors
import {
  AccessPolicyNotFoundError,
  AccessPolicyValidationError
} from "@/app/domain/access-policy/errors"

// Download token errors
import {
  DownloadTokenNotFoundError,
  DownloadTokenValidationError,
  DownloadTokenAlreadyUsedError
} from "@/app/domain/download-token/errors"

// Custom oRPC error class for Effect-based RPC
export class ORPCError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly data?: any
  ) {
    super(data?.message || "RPC Error")
    this.name = "ORPCError"
  }
}

export function mapToORPCError(error: unknown): ORPCError {
  // Context errors and other ORPCErrors are thrown directly
  if (error instanceof ORPCError) {
    return error
  }

  // Document not found
  if (error instanceof DocumentNotFoundError) {
    return new ORPCError("NOT_FOUND", 404, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      id: error.id
    })
  }

  // Document version not found
  if (error instanceof DocumentVersionNotFoundError) {
    return new ORPCError("NOT_FOUND", 404, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      id: error.id
    })
  }

  // User not found
  if (error instanceof UserNotFoundError) {
    return new ORPCError("NOT_FOUND", 404, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      id: error.id
    })
  }

  // Access policy not found
  if (error instanceof AccessPolicyNotFoundError) {
    return new ORPCError("NOT_FOUND", 404, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      id: error.id
    })
  }

  // Download token not found
  if (error instanceof DownloadTokenNotFoundError) {
    return new ORPCError("NOT_FOUND", 404, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      id: error.id
    })
  }

  // Generic not found
  if (error instanceof NotFoundError) {
    return new ORPCError("NOT_FOUND", 404, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      id: error.id
    })
  }

  // ValidationError - generic validation failures
  if (error instanceof ValidationError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      field: error.field,
      value: error.value,
      details: error.details
    })
  }

  // DocumentValidationError
  if (error instanceof DocumentValidationError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      field: error.field,
      value: error.value,
      details: error.details
    })
  }

  // DocumentVersionValidationError
  if (error instanceof DocumentVersionValidationError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      field: error.field,
      value: error.value,
      details: error.details
    })
  }

  // UserValidationError
  if (error instanceof UserValidationError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      field: error.field,
      value: error.value,
      details: error.details
    })
  }

  // AccessPolicyValidationError
  if (error instanceof AccessPolicyValidationError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      field: error.field,
      value: error.value,
      details: error.details
    })
  }

  // DownloadTokenValidationError
  if (error instanceof DownloadTokenValidationError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      field: error.field,
      value: error.value,
      details: error.details
    })
  }

  // BusinessRuleViolationError - map to appropriate status by code
  if (error instanceof BusinessRuleViolationError) {
    // ACCESS_DENIED → forbidden
    if (error.code === "ACCESS_DENIED") {
      return new ORPCError("FORBIDDEN", 403, {
        message: error.message,
        code: error.code,
        details: error.context
      })
    }
    // APPLICATION_ERROR → generic server failure (boundary collapsed unknown/infra)
    if (error.code === "APPLICATION_ERROR") {
      return new ORPCError("INTERNAL_SERVER_ERROR", 500, {
        message: "An internal error occurred",
        code: error.code
      })
    }
    
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error.code,
      details: error.context
    })
  }

  // UserRoleError
  if (error instanceof UserRoleError) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: error.message,
      code: error._tag,
      details: error.context
    })
  }

  // Effect ParseResult.ParseError (Schema validation errors)
  if (ParseResult.isParseError(error)) {
    return new ORPCError("BAD_REQUEST", 400, {
      message: "Schema validation failed",
      code: "SCHEMA_VALIDATION_ERROR",
      details: error.message
    })
  }

  // AlreadyExistsError
  if (error instanceof AlreadyExistsError) {
    return new ORPCError("CONFLICT", 409, {
      message: error.message,
      code: error._tag,
      resource: error.resource,
      field: error.field,
      value: error.value
    })
  }

  // ConflictError
  if (error instanceof ConflictError) {
    return new ORPCError("CONFLICT", 409, {
      message: error.message,
      code: error._tag,
      field: error.field,
      constraint: error.constraint,
      details: error.details
    })
  }

  // DownloadTokenAlreadyUsedError - semantic PRECONDITION_FAILED
  if (error instanceof DownloadTokenAlreadyUsedError) {
    return new ORPCError("PRECONDITION_FAILED", 412, {
      message: error.message,
      code: error._tag,
      field: error.field,
      details: error.details
    })
  }

  // DatabaseError → never expose DB internals (query/cause/operation)
  if (error instanceof DatabaseError) {
    // Don't expose internal database details to clients for security
    return new ORPCError("INTERNAL_SERVER_ERROR", 500, {
      message: "A database error occurred",
      code: error._tag
    })
  }

  // RepositoryError
  if (error instanceof RepositoryError) {
    return new ORPCError("INTERNAL_SERVER_ERROR", 500, {
      message: "A repository error occurred",
      code: error.code
    })
  }

  // Fallback for unexpected errors
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return new ORPCError("INTERNAL_SERVER_ERROR", 500, {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    details: errorMessage
  })
}

export const mapError = mapToORPCError
