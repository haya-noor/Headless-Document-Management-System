import { ValidationError, ConflictError, NotFoundError } from "@/app/domain/shared/base.errors"
import { ParseResult } from "effect"

/** DocumentVersion domain-specific error definitions */

export class DocumentVersionNotFoundError extends NotFoundError {
  readonly tag = "DocumentVersionNotFoundError" as const
  
  static forResource(resource: string, id: string) {
    return new DocumentVersionNotFoundError({ 
      resource, 
      id, 
      message: `Document version with id '${id}' not found` 
    })
  }
}

export class DocumentVersionValidationError extends ValidationError {
  readonly tag = "DocumentVersionValidationError" as const

  static forField(field: string, value: unknown, details?: string) {
    const valueStr = value === null ? "null" : value === undefined ? "undefined" : typeof value === "string" ? value : JSON.stringify(value)
    return new DocumentVersionValidationError({
      field,
      value,
      message: `Document version validation failed for ${field}: ${valueStr}${details ? ` - ${details}` : ""}`
    })
  }

  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "DocumentVersion") {
    return DocumentVersionValidationError.forField(field, input, error.message)
  }
}

export class DocumentVersionAlreadyExistsError extends ConflictError {
  readonly tag = "DocumentVersionAlreadyExistsError" as const
  
  static forField(field: string, value: unknown) {
    return new DocumentVersionAlreadyExistsError({
      message: `Document version already exists for ${field}: ${String(value)}`,
      field,
      details: { value }
    })
  }
}

/** Unified type */
export type DocumentVersionErrorType =
  | DocumentVersionNotFoundError
  | DocumentVersionValidationError
  | DocumentVersionAlreadyExistsError
