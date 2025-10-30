import { Schema as S } from "effect"

/**
 * Effect Schema Composition Utilities
 * 
 * Provides reusable schema compositions for common patterns.
 * Reduces duplication and improves maintainability.
 */

/**
 * Pattern: Compose multiple field groups
 * Example: UserProfileFields = BaseFields.pipe(S.extend(ContactFields), S.extend(AddressFields))
 */
export function composeSchemas<T extends S.Schema.Any>(
  base: T,
  ...extensions: S.Schema.Any[]
): T {
  return extensions.reduce((acc, ext) => acc.pipe(S.extend(ext)), base as any)
}

/**
 * Pattern: Compose with pattern matching for conditional fields
 */
export function composeWithPattern<T>(
  base: S.Schema<T>,
  matcher: (value: T) => S.Schema.Any
): S.Schema<T> {
  return base.pipe(
    S.union(
      base.pipe(S.extend(matcher as any)), // Type-level pattern matching
      base
    )
  )
}

/**
 * Example: Document creation schema composition
 */
export const createDocumentSchemaComposition = <T extends S.Schema.Any>(
  baseFields: T,
  optionalFields: S.Schema.Any
) => {
  return baseFields.pipe(
    S.extend(optionalFields.pipe(S.partial()))
  )
}

