/**
 * AccessPolicy domain errors
 * Defines all domain-specific errors for access policy operations
 */

import { Data } from 'effect';

/**
 * Base access policy error class
 */
export class AccessPolicyError extends Data.TaggedError('AccessPolicyError')<{
  readonly message: string;
  readonly code: string;
}> {}

/**
 * Access policy not found error
 */
export class AccessPolicyNotFoundError extends Data.TaggedError('AccessPolicyNotFoundError')<{
  readonly policyId: string;
  readonly message: string;
}> {}

/**
 * Access policy validation error
 */
export class AccessPolicyValidationError extends Data.TaggedError('AccessPolicyValidationError')<{
  readonly field: string;
  readonly value: unknown;
  readonly message: string;
}> {}

/**
 * Access policy already exists error
 */
export class AccessPolicyAlreadyExistsError extends Data.TaggedError('AccessPolicyAlreadyExistsError')<{
  readonly name: string;
  readonly message: string;
}> {}

/**
 * Access policy inactive error
 * inactive policy means it is not applied to any subject or resource
 */
export class AccessPolicyInactiveError extends Data.TaggedError('AccessPolicyInactiveError')<{
  readonly policyId: string;
  readonly message: string;
}> {}

/**
 * Access policy creation error
 */
export class AccessPolicyCreationError extends Data.TaggedError('AccessPolicyCreationError')<{
  readonly name: string;
  readonly message: string;
}> {}

/**
 * Access policy update error
 */
export class AccessPolicyUpdateError extends Data.TaggedError('AccessPolicyUpdateError')<{
  readonly policyId: string;
  readonly message: string;
}> {}

/**
 * Access policy deletion error
 */
export class AccessPolicyDeletionError extends Data.TaggedError('AccessPolicyDeletionError')<{
  readonly policyId: string;
  readonly message: string;
}> {}

/**
 * Access policy priority error
 * This error is raised when the priority of a policy is not valid
 */
export class AccessPolicyPriorityError extends Data.TaggedError('AccessPolicyPriorityError')<{
  readonly policyId: string;
  readonly priority: number;
  readonly message: string;
}> {}

/**
 * Access policy subject error
 * This error is raised when the subject(user or role) of a policy is not valid
 */
export class AccessPolicySubjectError extends Data.TaggedError('AccessPolicySubjectError')<{
  readonly policyId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly message: string;
}> {}

/**
 * Access policy resource error
 * This error is raised when the resource(document or user) of a policy is not valid
 */
export class AccessPolicyResourceError extends Data.TaggedError('AccessPolicyResourceError')<{
  readonly policyId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly message: string;
}> {}
