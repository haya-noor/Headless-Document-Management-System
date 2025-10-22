import { ValidationError, NotFoundError } from "@/app/domain/shared/base.errors"
import { ParseResult } from "effect"

/**
 * AccessPolicy domain error definitions
 * Reuses shared error base classes with static factory methods
 */

export class AccessPolicyNotFoundError extends NotFoundError {
  readonly tag = "AccessPolicyNotFoundError" as const
  
  static forResource(resource: string, id: string) {
    return new AccessPolicyNotFoundError({ 
      resource, 
      id, 
      message: `Access policy with id '${id}' not found` 
    })
  }
}

export class AccessPolicyValidationError extends ValidationError {
  readonly tag = "AccessPolicyValidationError" as const

  static forField(field: string, value: unknown, details?: string) {
    return new AccessPolicyValidationError({
      field,
      value,
      message: `Invalid access policy field ${field}: ${String(value)}${details ? ` - ${details}` : ""}`
    })
  }

  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "AccessPolicy") {
    return AccessPolicyValidationError.forField(field, input, error.message)
  }
}

/** Unified error type */
export type AccessPolicyErrorType = AccessPolicyNotFoundError | AccessPolicyValidationError
