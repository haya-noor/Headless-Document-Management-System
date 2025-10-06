/**
 * User domain guards
 * Provides validation and type guards for user operations
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { UserIdVO, DateTimeVO } from '../value-objects';
import { UserValidationError } from '../errors/user.errors';
import { UserRole } from '../entities/user';

/**
 * User email schema
 * ^[^\s@]+@[^\s@]+\.[^\s@]+$
 * The ^ character asserts the position at the start of the string.
 * [^\s@] matches any character that is not a space or an @.
 * + matches one or more occurrences of the preceding character.
 * @ matches a literal @.
 * [^\s@] matches any character that is not a space or an @.
 * + matches one or more occurrences of the preceding character.
 * . matches a literal .
 * [^\s@] matches any character that is not a space or an @.
 * + matches one or more occurrences of the preceding character.
 * $ character asserts the position at the end of the string.
 */
export const UserEmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.maxLength(255)
);

export type UserEmail = Schema.Schema.Type<typeof UserEmailSchema>;

/**
 * User name schema
 */
export const UserNameSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(100)
);

export type UserName = Schema.Schema.Type<typeof UserNameSchema>;

/**
 * User role schema
 */
export const UserRoleSchema = Schema.Literal('admin', 'user');

/**
 * Guard functions for user validation
 */
export const UserGuards = {
  /**
   * Validate user ID
   */
  isValidUserId: (value: unknown): Effect.Effect<UserIdVO, UserValidationError, never> => {
    return UserIdVO.fromUnknown(value).pipe(
      Effect.mapError(() => new UserValidationError({
        field: 'id',
        value,
        message: 'Invalid user ID format'
      }))
    );
  },

  /**
   * Validate user email
   */
  isValidEmail: (value: unknown): Effect.Effect<UserEmail, UserValidationError, never> => {
    return Schema.decodeUnknown(UserEmailSchema)(value).pipe(
      Effect.mapError(() => new UserValidationError({
        field: 'email',
        value,
        message: 'Invalid email format'
      }))
    );
  },

  /**
   * Validate user name
   */
  isValidName: (value: unknown): Effect.Effect<UserName, UserValidationError, never> => {
    return Schema.decodeUnknown(UserNameSchema)(value).pipe(
      Effect.mapError(() => new UserValidationError({
        field: 'name',
        value,
        message: 'Invalid name format'
      }))
    );
  },

  /**
   * Validate user role
   */
  isValidRole: (value: unknown): Effect.Effect<UserRole, UserValidationError, never> => {
    return Schema.decodeUnknown(UserRoleSchema)(value).pipe(
      Effect.map(role => role as UserRole),
      Effect.mapError(() => new UserValidationError({
        field: 'role',
        value,
        message: 'Invalid role format'
      }))
    );
  },

  /**
   * Validate date time
   */
  isValidDateTime: (value: unknown): Effect.Effect<DateTimeVO, UserValidationError, never> => {
    return DateTimeVO.fromUnknown(value).pipe(
      Effect.mapError(() => new UserValidationError({
        field: 'dateTime',
        value,
        message: 'Invalid date time format'
      }))
    );
  },

  /**
   * Check if user is active
   */
  isUserActive: (isActive: boolean): boolean => {
    return isActive;
  },

  /**
   * Check if user is admin
   */
  isAdmin: (role: string): boolean => {
    return role === 'admin';
  },
};
