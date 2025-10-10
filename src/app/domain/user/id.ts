/**
 * UserId value object
 * Encapsulates user ID with validation and branded types
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * UserId schema with UUID validation
 */
export const UserIdSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand('UserId')
);

export type UserId = Schema.Schema.Type<typeof UserIdSchema>;

/**
 * UserId value object class
 * Immutable wrapper for user ID with validation
 */
export class UserIdVO {
  private readonly _value: UserId;

  private constructor(value: UserId) {
    this._value = value;
  }

  /**
   * Get the string value
   */
  getValue(): string {
    return this._value;
  }

  /**
   * Create UserIdVO from string
   */
  static fromString(value: string): Effect.Effect<UserIdVO, any, never> {
    return Schema.decodeUnknown(UserIdSchema)(value).pipe(
      Effect.map(validatedValue => new UserIdVO(validatedValue))
    );
  }

  /**
   * Create UserIdVO from unknown value
   */
  static fromUnknown(value: unknown): Effect.Effect<UserIdVO, any, never> {
    return Schema.decodeUnknown(UserIdSchema)(value).pipe(
      Effect.map(validatedValue => new UserIdVO(validatedValue))
    );
  }

  /**
   * Generate a new UserIdVO
   */
  static generate(): UserIdVO {
    const crypto = require('crypto');
    const uuid = crypto.randomUUID();
    return new UserIdVO(uuid as UserId);
  }

  /**
   * Check equality with another UserIdVO
   */
  equals(other: UserIdVO): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this._value;
  }
}
