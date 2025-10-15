import { ValidationError, RepositoryError } from "../shared/errors"
import { ParseResult } from "effect"

/**
 * AccessPolicy domain error definitions
 * Reuses shared error base classes
 */

export class AccessPolicyNotFoundError extends RepositoryError {
  readonly tag = "AccessPolicyNotFoundError" as const
  constructor(field: string, value: unknown, details?: string) {
    super(`Access policy not found for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`, "ACCESS_POLICY_NOT_FOUND")
  }
}

export class AccessPolicyValidationError extends ValidationError {
  readonly tag = "AccessPolicyValidationError" as const
  constructor(field: string, value: unknown, details?: string) {
    super(`Invalid access policy field ${field}: ${String(value)}${details ? ` - ${details}` : ""}`, field)
  }

  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "AccessPolicy") {
    return new AccessPolicyValidationError(field, input, error.message)
  }
}

/** Unified error type */
export type AccessPolicyErrorType = AccessPolicyNotFoundError | AccessPolicyValidationError
