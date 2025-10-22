import { Schema as S, Effect } from "effect"

/**
 * Validation Utils
 * 
 * Reusable validation building blocks for Effect Schema.
 * Provides common validation patterns used across domain entities.
 */

// ---------------------------------------------------------------------------
// String Validation Filters
// ---------------------------------------------------------------------------

/**
 * Factory for non-empty string validation
 * 
 * Creates a filter that ensures a string is not empty or only whitespace.
 * 
 * @param fieldName - Name of the field for error messages
 * @returns Schema filter for non-empty strings
 * 
 * @example
 * ```typescript
 * const ValidName = S.String.pipe(createNotEmptyFilter("name"))
 * ```
 */
export const createNotEmptyFilter = (fieldName: string = "field") =>
  S.filter(
    (value: string) => value.trim().length > 0,
    {
      message: () => `${fieldName} must not be empty`
    }
  )

/**
 * Non-empty string schema
 * 
 * Generic non-empty string validation.
 */
export const NonEmptyString = S.String.pipe(
  createNotEmptyFilter("value"),
  S.brand("NonEmptyString")
)
export type NonEmptyString = S.Schema.Type<typeof NonEmptyString>

/**
 * Trimmed string schema
 * 
 * Automatically trims whitespace from strings.
 */
export const TrimmedString = S.String.pipe(
  S.transform(
    S.String,
    {
      decode: (str) => str.trim(),
      encode: (str) => str
    }
  )
)

// ---------------------------------------------------------------------------
// Length Validation Filters
// ---------------------------------------------------------------------------

/**
 * Factory for string length range validation
 * 
 * @param min - Minimum length (inclusive)
 * @param max - Maximum length (inclusive)
 * @param fieldName - Field name for error messages
 * @returns Schema filter for length validation
 * 
 * @example
 * ```typescript
 * const ValidUsername = S.String.pipe(createLengthFilter(3, 20, "username"))
 * ```
 */
export const createLengthFilter = (
  min: number,
  max: number,
  fieldName: string = "field"
) =>
  S.filter(
    (value: string) => value.length >= min && value.length <= max,
    {
      message: () => `${fieldName} must be between ${min} and ${max} characters`
    }
  )

/**
 * Factory for minimum length validation
 * 
 * @param min - Minimum length (inclusive)
 * @param fieldName - Field name for error messages
 * @returns Schema filter for minimum length
 */
export const createMinLengthFilter = (
  min: number,
  fieldName: string = "field"
) =>
  S.filter(
    (value: string) => value.length >= min,
    {
      message: () => `${fieldName} must be at least ${min} characters`
    }
  )

/**
 * Factory for maximum length validation
 * 
 * @param max - Maximum length (inclusive)
 * @param fieldName - Field name for error messages
 * @returns Schema filter for maximum length
 */
export const createMaxLengthFilter = (
  max: number,
  fieldName: string = "field"
) =>
  S.filter(
    (value: string) => value.length <= max,
    {
      message: () => `${fieldName} must be at most ${max} characters`
    }
  )

// ---------------------------------------------------------------------------
// Pattern Validation Filters
// ---------------------------------------------------------------------------

/**
 * Factory for regex pattern validation
 * 
 * @param pattern - Regular expression to match
 * @param fieldName - Field name for error messages
 * @param description - Human-readable description of the pattern
 * @returns Schema filter for pattern matching
 * 
 * @example
 * ```typescript
 * const ValidSlug = S.String.pipe(
 *   createPatternFilter(/^[a-z0-9-]+$/, "slug", "lowercase alphanumeric with hyphens")
 * )
 * ```
 */
export const createPatternFilter = (
  pattern: RegExp,
  fieldName: string = "field",
  description?: string
) =>
  S.filter(
    (value: string) => pattern.test(value),
    {
      message: () =>
        description
          ? `${fieldName} must be ${description}`
          : `${fieldName} has invalid format`
    }
  )

// ---------------------------------------------------------------------------
// Number Validation Filters
// ---------------------------------------------------------------------------

/**
 * Factory for positive number validation
 * 
 * @param fieldName - Field name for error messages
 * @returns Schema filter for positive numbers
 */
export const createPositiveFilter = (fieldName: string = "value") =>
  S.filter(
    (value: number) => value > 0,
    {
      message: () => `${fieldName} must be positive`
    }
  )

/**
 * Factory for non-negative number validation
 * 
 * @param fieldName - Field name for error messages
 * @returns Schema filter for non-negative numbers
 */
export const createNonNegativeFilter = (fieldName: string = "value") =>
  S.filter(
    (value: number) => value >= 0,
    {
      message: () => `${fieldName} must be non-negative`
    }
  )

/**
 * Factory for number range validation
 * 
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param fieldName - Field name for error messages
 * @returns Schema filter for range validation
 */
export const createRangeFilter = (
  min: number,
  max: number,
  fieldName: string = "value"
) =>
  S.filter(
    (value: number) => value >= min && value <= max,
    {
      message: () => `${fieldName} must be between ${min} and ${max}`
    }
  )

// ---------------------------------------------------------------------------
// Array Validation Filters
// ---------------------------------------------------------------------------

/**
 * Factory for non-empty array validation
 * 
 * @param fieldName - Field name for error messages
 * @returns Schema filter for non-empty arrays
 */
export const createNonEmptyArrayFilter = <T>(fieldName: string = "array") =>
  S.filter(
    (value: T[]) => value.length > 0,
    {
      message: () => `${fieldName} must not be empty`
    }
  )

/**
 * Factory for array length validation
 * 
 * @param min - Minimum length
 * @param max - Maximum length
 * @param fieldName - Field name for error messages
 * @returns Schema filter for array length
 */
export const createArrayLengthFilter = <T>(
  min: number,
  max: number,
  fieldName: string = "array"
) =>
  S.filter(
    (value: T[]) => value.length >= min && value.length <= max,
    {
      message: () => `${fieldName} must have between ${min} and ${max} items`
    }
  )

// ---------------------------------------------------------------------------
// Nullable/Optional Helpers
// ---------------------------------------------------------------------------

/**
 * Optional schema wrapper
 * 
 * Makes a schema optional (can be undefined).
 * Wrapper around S.optional for consistency.
 * 
 * @param schema - The schema to make optional
 * @returns Optional schema
 * 
 * @example
 * ```typescript
 * const UserSchema = S.Struct({
 *   id: UserId,
 *   name: S.String,
 *   bio: Optional(S.String)  // bio can be undefined
 * })
 * ```
 */
export const Optional = <A, I, R>(schema: S.Schema<A, I, R>) => S.optional(schema)

/**
 * Nullable schema wrapper
 * 
 * Makes a schema nullable (can be null).
 * 
 * @param schema - The schema to make nullable
 * @returns Nullable schema
 */
export const Nullable = <A, I, R>(schema: S.Schema<A, I, R>) => S.NullOr(schema)

/**
 * OptionalNullable schema wrapper
 * 
 * Makes a schema both optional and nullable (can be undefined or null).
 * 
 * @param schema - The schema to make optional and nullable
 * @returns Optional and nullable schema
 */
export const OptionalNullable = <A, I, R>(schema: S.Schema<A, I, R>) =>
  Optional(Nullable(schema))

// ---------------------------------------------------------------------------
// Validation Effect Helpers
// ---------------------------------------------------------------------------

/**
 * Validate data against a schema
 * 
 * Convenience function for schema validation returning Effect.
 * 
 * @param schema - Effect Schema to validate against
 * @param data - Data to validate
 * @returns Effect with validated data or error
 * 
 * @example
 * ```typescript
 * const result = validate(UserSchema, userData)
 * // Effect<User, ParseError, never>
 * ```
 */
export const validate = <A, I>(schema: S.Schema<A, I>, data: unknown) =>
  S.decodeUnknown(schema)(data)

/**
 * Validate data synchronously
 * 
 * Throws on validation error.
 * 
 * @param schema - Effect Schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws ParseError if validation fails
 */
export const validateSync = <A, I>(schema: S.Schema<A, I>, data: unknown): A =>
  S.decodeUnknownSync(schema)(data)

// ---------------------------------------------------------------------------
// Custom Validation Combinators
// ---------------------------------------------------------------------------

/**
 * Create a custom validation filter
 * 
 * Generic factory for creating custom validation filters.
 * 
 * @param predicate - Validation function
 * @param errorMessage - Error message or message factory
 * @returns Schema filter
 * 
 * @example
 * ```typescript
 * const IsEven = createCustomFilter(
 *   (n: number) => n % 2 === 0,
 *   "must be even"
 * )
 * ```
 */
export const createCustomFilter = <T>(
  predicate: (value: T) => boolean,
  errorMessage: string | ((value: T) => string)
) =>
  S.filter(predicate, {
    message:
      typeof errorMessage === "string"
        ? () => errorMessage
        : (value: T) => errorMessage(value as T)
  })

/**
 * Compose multiple filters
 * 
 * Applies multiple validation filters in sequence.
 * 
 * @param filters - Array of schema filters to compose
 * @returns Composed filter
 * 
 * @example
 * ```typescript
 * const ValidPassword = S.String.pipe(
 *   composeFilters([
 *     createMinLengthFilter(8, "password"),
 *     createPatternFilter(/[A-Z]/, "password", "contain uppercase letter")
 *   ])
 * )
 * ```
 */
export const composeFilters = <A, I, R>(
  filters: Array<(schema: S.Schema<A, I, R>) => S.Schema<A, I, R>>
) => (schema: S.Schema<A, I, R>) =>
  filters.reduce((acc, filter) => filter(acc), schema)

