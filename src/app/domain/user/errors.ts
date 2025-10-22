/**
 * User domain errors — extending shared repository/domain errors
 * UserEmailInvalidError covered in shared 
 * UserNameInvalidError -> schema level validation error using UserGuards.validName
 */

import { NotFoundError, ValidationError, ConflictError } from "@/app/domain/shared/base.errors"
import { BusinessRuleViolationError } from "@/app/domain/shared/base.errors"
import { ParseResult } from "effect"

export class UserNotFoundError extends NotFoundError {
  readonly tag = "UserNotFoundError" as const
  static forResource(resource: string, id: string) {
    return new UserNotFoundError({ resource, id, message: `User with id '${id}' not found` })
  }
}

export class UserValidationError extends ValidationError {
  readonly tag = "UserValidationError" as const
  static forField(field: string, value: unknown, details?: string) {
    return new UserValidationError({
      field,
      value,
      message: `User validation failed for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`
    })
  }
  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "User") {
    return UserValidationError.forField(field, input, error.message)
  }
}

export class UserAlreadyExistsError extends ConflictError {
  readonly tag = "UserAlreadyExistsError" as const
  static forField(field: string, value: unknown) {
    return new UserAlreadyExistsError({
      message: `User already exists for ${field}: ${String(value)}`,
      field
    })
  }
}

export class UserInactiveError extends BusinessRuleViolationError {
  constructor(context?: Record<string, unknown>) {
    super({ code: "USER_INACTIVE", message: "User is inactive", context })
  }
}

export class UserRoleError extends BusinessRuleViolationError {
  constructor(context?: Record<string, unknown>) {
    super({ code: "USER_ROLE_ERROR", message: "Invalid role assignment", context })
  }
}


export type UserErrorType =
  | UserNotFoundError
  | UserValidationError
  | UserAlreadyExistsError
  | UserInactiveError
  | UserRoleError
