/**
 * Checksum value object
 * Encapsulates file checksum with validation
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * Checksum value object schema
 * Validates SHA-256 format (64 hex characters)
 * 
 * schema.pattern = validates the string against a regular expression
 * schema.brand = adds a brand(tag) to the string to distinguish it from other strings
 */
export const ChecksumSchema = Schema.String.pipe(
  Schema.filter(
    (value) => /^[a-f0-9]{64}$/i.test(value),
    { message: () => 'Invalid SHA-256 checksum format' }
  ),
  Schema.brand('Checksum')
);

export type Checksum = Schema.Schema.Type<typeof ChecksumSchema>;

/**
 * Checksum value object class
 * Provides static factory methods and validation
 */
export class ChecksumVO {
  private constructor(private readonly value: string) {}

  /**
   * For Decoding checksum from string to checksumVO
   * 
   * when used:
   * Input must be a string 
   * Used when you’re certain the data is already a string 
   * (e.g., from DB or user input field).
   * 
   * Schema.decodeUnknown(ChecksumSchema)(value)

    If value is valid: returns an Effect that succeeds with a plain string 
    (the checksum string).

    If value is invalid: returns an Effect that fails with Schema.ParseError.

    Effect.map(checksum => new ChecksumVO(checksum))
    Takes the validated string checksum and wraps it in the ChecksumVO constructor.
    and returns a new ChecksumVO instance.
    If the string is invalid, the Effect will fail with Schema.ParseError.


    Effect.Effect<success, failure, requirements>
    over here requirements is never: means the effect doesn’t depend on any external environment
   * 
   */
  static fromString(value: string): Effect.Effect<ChecksumVO, any, never> {
    return Schema.decodeUnknown(ChecksumSchema)(value).pipe(
      Effect.map(checksum => new ChecksumVO(checksum))
    );
  }

  /**
   * Decoding checksum from unknown(received from db or api, external source) value 
   * to checksumVO
   * Create Checksum from unknown 
   * 
   * Input can be anything (unknown).
     Used for untrusted input (e.g., raw JSON from an API, user form data).
   */
  static fromUnknown(value: unknown): Effect.Effect<ChecksumVO, any, never> {
    return Schema.decodeUnknown(ChecksumSchema)(value).pipe(
      Effect.map(checksum => new ChecksumVO(checksum))
    );
  }

  /**
   * Get the string value (raw value)
   * Sometimes you need the checksum as a plain string 
   * (e.g., passing to another function or hashing again).
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Encode to string for persistence
   */
  encode(): string {
    return this.value;
  }

  /**
   * Check equality with another Checksum
   * to check if two checksums are the same indicating that the file already exists
   */
  equals(other: ChecksumVO): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   * Converts the VO into a human-readable string.
   */
  toString(): string {
    return this.value;
  }
}
