/**
 * DateTime value object
 * Encapsulates date/time with validation and timezone handling
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * DateTime value object schema
 * Validates ISO 8601 date string format
 * schema.pattern: 
 * Ensures it matches ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ).
 * 
 * schema.transform: 
Adds bi-directional transformation:
Decode (input → internal): Convert string → Date object.
Encode (internal → output): Convert Date object → ISO string.

schema.brand: '
add DateTime brand/tag to distinguish it from other strings
 */
export const DateTimeSchema = Schema.String.pipe(
  Schema.filter(
    (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value),
    { message: () => 'Invalid ISO 8601 date format' }
  ),
  Schema.brand('DateTime')
);

export type DateTime = Schema.Schema.Type<typeof DateTimeSchema>;

/**
 * DateTime value object class
 * Provides static factory methods and validation
 */
export class DateTimeVO {
  private constructor(private readonly value: Date) {}

  // Factory Methods
  /**
   * Create DateTime from Date object
   * Convert the Date → ISO string (date.toISOString()).

  Validate the ISO string against DateTimeSchema (ensures it’s in correct format).

  If valid → wrap original Date in DateTimeVO.

  Use when: 
  you already have a Date (e.g., from new Date() or DB
   */
  static fromDate(date: Date): Effect.Effect<DateTimeVO, any, never> {
    return Schema.decodeUnknown(DateTimeSchema)(date.toISOString()).pipe(
      Effect.map(() => new DateTimeVO(date))
    );
  }

  /**
   * Create DateTime from ISO string
   * Validate the string with DateTimeSchema.
   * Use when: 
   * you’re given a date string (e.g., from API request, JSON).
   */
  static fromISOString(isoString: string): Effect.Effect<DateTimeVO, any, never> {
    return Schema.decodeUnknown(DateTimeSchema)(isoString).pipe(
      Effect.map(dateString => new DateTimeVO(new Date(dateString)))
    );
  }

  /**
   * Create DateTime from unknown value could be any value (string, number, object, etc)
   * from external source like db or api
   */
  static fromUnknown(value: unknown): Effect.Effect<DateTimeVO, any, never> {
    return Schema.decodeUnknown(DateTimeSchema)(value).pipe(
      Effect.map(dateString => new DateTimeVO(new Date(dateString)))
    );
  }

  /**
   * Create current DateTime
   */
  static now(): Effect.Effect<DateTimeVO, never, never> {
    return Effect.succeed(new DateTimeVO(new Date()));
  }

  /**
   * Get the Date value
   */
  getValue(): Date {
    return this.value;
  }

  /**
   * Get ISO string representation
   */
  toISOString(): string {
    return this.value.toISOString();
  }

  /**
   * Encode to string for persistence
   */
  encode(): string {
    return this.value.toISOString();
  }

  /**
   * Check equality with another DateTime
   */
  equals(other: DateTimeVO): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  /**
   * Check if this date is before another
   */
  isBefore(other: DateTimeVO): boolean {
    return this.value < other.value;
  }

  /**
   * Check if this date is after another
   */
  isAfter(other: DateTimeVO): boolean {
    return this.value > other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value.toISOString();
  }
}
