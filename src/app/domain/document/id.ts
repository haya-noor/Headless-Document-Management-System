/**
 * DocumentId value object
 * Encapsulates document identifier with validation
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * DocumentId value object schema
 * Validates UUID format and provides encoding/decoding
 */
export const DocumentIdSchema = Schema.UUID.pipe(
  Schema.brand('DocumentId')
);

export type DocumentId = Schema.Schema.Type<typeof DocumentIdSchema>;

/**
 * DocumentId value object class
 * Provides static factory methods and validation
 */
export class DocumentIdVO {
  private constructor(private readonly value: string) {}

  /**
   * Create DocumentId from string
   */
  static fromString(value: string): Effect.Effect<DocumentIdVO, any, never> {
    return Schema.decodeUnknown(DocumentIdSchema)(value).pipe(
      Effect.map(id => new DocumentIdVO(id))
    );
  }

  /**
   * Create DocumentId from unknown value
   */
  static fromUnknown(value: unknown): Effect.Effect<DocumentIdVO, any, never> {
    return Schema.decodeUnknown(DocumentIdSchema)(value).pipe(
      Effect.map(id => new DocumentIdVO(id))
    );
  }

  /**
   * Get the string value
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
   * Check equality with another DocumentId
   */
  equals(other: DocumentIdVO): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }
}
