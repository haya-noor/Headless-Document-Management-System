import { ValidationError, BusinessRuleViolationError, RepositoryError } from "../shared/errors"
import { ParseResult, Schema as S } from "effect"

/**
 * Document domain errors — all reuse shared base classes
 */
export class DocumentNotFoundError extends RepositoryError {
  readonly tag = "DocumentNotFoundError" as const

  constructor(field: string, value: unknown, details?: string) {
    const valueStr = safeStringify(value)
    const message = `Document not found for ${field}: ${valueStr}${details ? ` - ${details}` : ""}`
    super(message, "DOCUMENT_NOT_FOUND")
  }
}

export class DocumentValidationError extends ValidationError {
  readonly tag = "DocumentValidationError" as const

  constructor(field: string, value: unknown, details?: string) {
    const valueStr = safeStringify(value)
    const message = `Invalid document field ${field}: ${valueStr}${details ? ` - ${details}` : ""}`
    super(message, field)
  }

  /** Declarative Schema error formatter 
   * safeStringify is used to avoid circular references 
  */
  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "Document") {
    const formatted = safeStringify(error)
    return new DocumentValidationError(field, input, formatted)
  }
}

function safeStringify(value: unknown): string {
  try {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  } catch {
    return "[unable to stringify]"
  }
}

/** Union of all possible domain errors */
export type DocumentErrorType =
  | DocumentNotFoundError
  | DocumentValidationError
  | BusinessRuleViolationError
