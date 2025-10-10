/**
 * DocumentAccess domain errors
 * Defines all domain-specific errors for document access operations
 */

import { Data } from 'effect';

/**
 * Base document access error class
 */
export class DocumentAccessError extends Data.TaggedError('DocumentAccessError')<{
  readonly message: string;
  readonly code: string;
}> {}

/**
 * Document access denied error
 */
export class DocumentAccessDeniedError extends Data.TaggedError('DocumentAccessDeniedError')<{
  readonly documentId: string;
  readonly userId: string;
  readonly requiredAction: string;
  readonly message: string;
}> {}

/**
 * Document access evaluation error
 */
export class DocumentAccessEvaluationError extends Data.TaggedError('DocumentAccessEvaluationError')<{
  readonly documentId: string;
  readonly userId: string;
  readonly message: string;
}> {}

/**
 * Document access policy error
 */
export class DocumentAccessPolicyError extends Data.TaggedError('DocumentAccessPolicyError')<{
  readonly documentId: string;
  readonly userId: string;
  readonly policyId: string;
  readonly message: string;
}> {}

/**
 * Document access user error
 */
export class DocumentAccessUserError extends Data.TaggedError('DocumentAccessUserError')<{
  readonly userId: string;
  readonly message: string;
}> {}

/**
 * Document access permission error
 */
export class DocumentAccessPermissionError extends Data.TaggedError('DocumentAccessPermissionError')<{
  readonly documentId: string;
  readonly userId: string;
  readonly permission: string;
  readonly message: string;
}> {}

/**
 * Document access validation error
 */
export class DocumentAccessValidationError extends Data.TaggedError('DocumentAccessValidationError')<{
  readonly field: string;
  readonly value: unknown;
  readonly message: string;
}> {}

/**
 * Document access configuration error
 */
export class DocumentAccessConfigurationError extends Data.TaggedError('DocumentAccessConfigurationError')<{
  readonly message: string;
}> {}
