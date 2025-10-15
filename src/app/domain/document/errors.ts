import { ValidationError, BusinessRuleViolationError, RepositoryError } from "../shared/errors"
import { ParseResult } from "effect"

/**
 * Document domain errors — all reuse shared base classes
 */

export class DocumentNotFoundError extends RepositoryError {
  readonly tag = "DocumentNotFoundError" as const
  constructor(field: string, value: unknown, details?: string) {
    super(`Document not found for ${field}: ${String(value)}${details ? ` - ${details}` : ""}`, "DOCUMENT_NOT_FOUND")
  }
}

export class DocumentValidationError extends ValidationError {
  readonly tag = "DocumentValidationError" as const
  constructor(field: string, value: unknown, details?: string) {
    let valueStr: string
    try {
      if (value === null) {
        valueStr = "null"
      } else if (value === undefined) {
        valueStr = "undefined"
      } else if (typeof value === "object") {
        valueStr = JSON.stringify(value)
      } else {
        valueStr = String(value)
      }
    } catch {
      valueStr = "[unable to stringify]"
    }
    super(`Invalid document field ${field}: ${valueStr}${details ? ` - ${details}` : ""}`, field)
  }

  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "Document"): DocumentValidationError {
    return new DocumentValidationError(field, input, error.message)
  }
}

/** Domain error union type */
export type DocumentErrorType =
  | DocumentNotFoundError
  | DocumentValidationError
  | BusinessRuleViolationError
