/**
 * User domain errors — extending shared repository/domain errors
 * UserEmailInvalidError covered in shared 
 * UserNameInvalidError -> schema level validation error using UserGuards.validName
 */

import { RepositoryError, ValidationError, ConflictError } from "@/app/domain/shared/errors"
import { BusinessRuleViolationError } from "@/app/domain/shared/errors"
import { ParseResult } from "effect"

export class UserNotFoundError extends RepositoryError {
  readonly tag = "UserNotFoundError" as const
  constructor(public readonly field: string, public readonly value: unknown, details?: string) {
    super(`User not found for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`, "USER_NOT_FOUND")
  }
}

export class UserValidationError extends ValidationError {
  readonly tag = "UserValidationError" as const
  constructor(public readonly field: string, public readonly value: unknown, details?: string) {
    super(`User validation failed for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`)
  }
  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "User") {
    return new UserValidationError(field, input, error.message)
  }
}

export class UserAlreadyExistsError extends ConflictError {
  readonly tag = "UserAlreadyExistsError" as const
  constructor(field: string, value: unknown, details?: string) {
    super(`User already exists for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`, field)
  }
}

export class UserInactiveError extends BusinessRuleViolationError {
  constructor(context?: Record<string, unknown>) {
    super("USER_INACTIVE", "User is inactive", context)
  }
}

export class UserRoleError extends BusinessRuleViolationError {
  constructor(context?: Record<string, unknown>) {
    super("USER_ROLE_ERROR", "Invalid role assignment", context)
  }
}


export type UserErrorType =
  | UserNotFoundError
  | UserValidationError
  | UserAlreadyExistsError
  | UserInactiveError
  | UserRoleError
