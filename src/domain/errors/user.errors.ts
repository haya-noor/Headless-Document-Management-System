/**
 * User domain errors
 * Defines all domain-specific errors for user operations
 */

import { Data } from 'effect';

/**
 * Base user error class
 */
export class UserError extends Data.TaggedError('UserError')<{
  readonly message: string;
  readonly code: string;
}> {}

/**
 * User not found error
 */
export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  readonly userId: string;
  readonly message: string;
}> {}

/**
 * User validation error
 */
export class UserValidationError extends Data.TaggedError('UserValidationError')<{
  readonly field: string;
  readonly value: unknown;
  readonly message: string;
}> {}

/**
 * User already exists error
 */
export class UserAlreadyExistsError extends Data.TaggedError('UserAlreadyExistsError')<{
  readonly email: string;
  readonly message: string;
}> {}

/**
 * User inactive error
 */
export class UserInactiveError extends Data.TaggedError('UserInactiveError')<{
  readonly userId: string;
  readonly message: string;
}> {}

/**
 * User role error
 * requiredRole: the role that is required for the user
 * actualRole: the role that the user has
 */
export class UserRoleError extends Data.TaggedError('UserRoleError')<{
  readonly userId: string;
  readonly requiredRole: string;
  readonly actualRole: string;
  readonly message: string;
}> {}

/**
 * User creation error
 */
export class UserCreationError extends Data.TaggedError('UserCreationError')<{
  readonly email: string;
  readonly message: string;
}> {}

/**
 * User update error
 */
export class UserUpdateError extends Data.TaggedError('UserUpdateError')<{
  readonly userId: string;
  readonly message: string;
}> {}

/**
 * User deletion error
 */
export class UserDeletionError extends Data.TaggedError('UserDeletionError')<{
  readonly userId: string;
  readonly message: string;
}> {}
