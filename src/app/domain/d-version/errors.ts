import { ValidationError, ConflictError, RepositoryError } from "../shared/errors"
import { ParseResult } from "effect"

/** DocumentVersion domain-specific error definitions */

export class DocumentVersionNotFoundError extends RepositoryError {
  readonly tag = "DocumentVersionNotFoundError" as const
  constructor(public readonly field: string, public readonly value: unknown, details?: string) {
    const valueStr = value === null ? "null" : value === undefined ? "undefined" : typeof value === "string" ? value : JSON.stringify(value)
    super(`Document version not found for ${field}: ${valueStr}${details ? ` - ${details}` : ""}`, "DOCUMENT_VERSION_NOT_FOUND")
  }
}

export class DocumentVersionValidationError extends ValidationError {
  readonly tag = "DocumentVersionValidationError" as const
  constructor(public readonly field: string, public readonly value: unknown, details?: string) {
    const valueStr = value === null ? "null" : value === undefined ? "undefined" : typeof value === "string" ? value : JSON.stringify(value)
    super(`Document version validation failed for ${field}: ${valueStr}${details ? ` - ${details}` : ""}`, field)
  }
  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "DocumentVersion") {
    return new DocumentVersionValidationError(field, input, error.message)
  }
}

export class DocumentVersionAlreadyExistsError extends ConflictError {
  readonly tag = "DocumentVersionAlreadyExistsError" as const
  constructor(field: string, value: unknown, details?: string) {
    const valueStr = value === null ? "null" : value === undefined ? "undefined" : typeof value === "string" ? value : JSON.stringify(value)
    super(`Document version already exists for ${field}: ${valueStr}${details ? ` - ${details}` : ""}`, field)
  }
}

/** Unified type */
export type DocumentVersionErrorType =
  | DocumentVersionNotFoundError
  | DocumentVersionValidationError
  | DocumentVersionAlreadyExistsError
