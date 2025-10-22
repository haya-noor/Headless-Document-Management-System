import { NotFoundError, ValidationError, ConflictError } from "@/app/domain/shared/base.errors"
import { ParseResult } from "effect"

/** Token not found */
export class DownloadTokenNotFoundError extends NotFoundError {
  readonly tag = "DownloadTokenNotFoundError" as const
  
  static forResource(resource: string, id: string) {
    return new DownloadTokenNotFoundError({ 
      resource, 
      id, 
      message: `Download token with id '${id}' not found` 
    })
  }
}

/** Token validation failure */
export class DownloadTokenValidationError extends ValidationError {
  readonly tag = "DownloadTokenValidationError" as const

  static forField(field: string, value: unknown, details?: string) {
    return new DownloadTokenValidationError({
      field,
      value,
      message: `Download token validation failed for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`
    })
  }

  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "DownloadToken") {
    return DownloadTokenValidationError.forField(field, input, error.message)
  }
}

/** Token already used */
export class DownloadTokenAlreadyUsedError extends ConflictError {
  readonly tag = "DownloadTokenAlreadyUsedError" as const
  
  static forField(field: string, value: unknown) {
    return new DownloadTokenAlreadyUsedError({
      message: `Download token already used for ${field}: ${String(value)}`,
      field,
      details: { value }
    })
  }
}

export type DownloadTokenErrorType =
  | DownloadTokenNotFoundError
  | DownloadTokenValidationError
  | DownloadTokenAlreadyUsedError
