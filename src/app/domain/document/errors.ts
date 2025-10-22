import { ValidationError, BusinessRuleViolationError, NotFoundError } from "@/app/domain/shared/base.errors"
import { ParseResult, Schema as S } from "effect"

/**
 * Document domain errors — all reuse shared base classes
 */
export class DocumentNotFoundError extends NotFoundError {
  readonly tag = "DocumentNotFoundError" as const
  
  static forResource(resource: string, id: string) {
    return new DocumentNotFoundError({ 
      resource, 
      id, 
      message: `Document with id '${id}' not found` 
    })
  }
}

export class DocumentValidationError extends ValidationError {
  readonly tag = "DocumentValidationError" as const

  static forField(field: string, value: unknown, details?: string) {
    const valueStr = safeStringify(value)
    return new DocumentValidationError({
      field,
      value,
      message: `Invalid document field ${field}: ${valueStr}${details ? ` - ${details}` : ""}`
    })
  }

  /** Declarative Schema error formatter 
   * safeStringify is used to avoid circular references 
  */
  static fromParseError(input: unknown, error: ParseResult.ParseError, field = "Document") {
    const formatted = safeStringify(error)
    return DocumentValidationError.forField(field, input, formatted)
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
