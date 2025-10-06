/**
 * Access Policy : specifies what actions a user can perform on a resource 
 * PolicyId value object
 * Encapsulates policy ID with validation and branded types
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * PolicyId schema with UUID validation
 */
export const PolicyIdSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand('PolicyId')
);

export type PolicyId = Schema.Schema.Type<typeof PolicyIdSchema>;

/**
 * PolicyId value object class
 * Immutable wrapper for policy ID with validation
 */
export class PolicyIdVO {
  private readonly _value: PolicyId;

  private constructor(value: PolicyId) {
    this._value = value;
  }

  /**
   * Get the string value
   */
  getValue(): string {
    return this._value;
  }

  /**
   * Create PolicyIdVO from string
   */
  static fromString(value: string): Effect.Effect<PolicyIdVO, any, never> {
    return Schema.decodeUnknown(PolicyIdSchema)(value).pipe(
      Effect.map(validatedValue => new PolicyIdVO(validatedValue))
    );
  }

  /**
   * Create PolicyIdVO from unknown value
   */
  
  static fromUnknown(value: unknown): Effect.Effect<PolicyIdVO, any, never> {
    return Schema.decodeUnknown(PolicyIdSchema)(value).pipe(
      Effect.map(validatedValue => new PolicyIdVO(validatedValue))
    );
  }

  /**
   * Generate a new PolicyIdVO
   */
  static generate(): PolicyIdVO {
    const crypto = require('crypto');
    const uuid = crypto.randomUUID();
    return new PolicyIdVO(uuid as PolicyId);
  }

  /**
   * Check equality with another PolicyIdVO
   */
  equals(other: PolicyIdVO): boolean {
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
