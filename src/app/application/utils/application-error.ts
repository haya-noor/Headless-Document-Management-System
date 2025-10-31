import { Effect as E } from "effect"
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AlreadyExistsError,
  BusinessRuleViolationError,
  DatabaseError
} from "@/app/domain/shared/base.errors"

/**
 * Application error boundary: collapse arbitrary errors from domain/infrastructure
 * into a controlled set that the presentation layer will later map to transport errors.
 */
export function toApplicationError(error: unknown):
  | ValidationError
  | NotFoundError
  | ConflictError
  | AlreadyExistsError
  | BusinessRuleViolationError
  | DatabaseError {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof AlreadyExistsError ||
    error instanceof BusinessRuleViolationError ||
    error instanceof DatabaseError
  ) {
    return error
  }

  // Collapse unknowns into a generic application-level business error
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  return BusinessRuleViolationError.withContext(
    "APPLICATION_ERROR",
    `An application error occurred: ${errorMessage}`,
    { cause: errorMessage, stack: errorStack, error: String(error) }
  )
}

/** Utility to attach boundary at end of an Effect chain */
export const withAppErrorBoundary = <A, E1, R>(eff: E.Effect<A, E1, R>) =>
  E.mapError(eff, toApplicationError)


