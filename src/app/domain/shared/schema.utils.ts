import { Schema as S, Effect, ParseResult } from "effect"

/**
 * Optional helper - wraps a schema to make it optional (undefined allowed)
 * Usage: Optional(WorkspaceId) instead of S.optional(WorkspaceId)
 */
export const Optional = <A, I, R>(schema: S.Schema<A, I, R>) => S.optional(schema)

/**
 * BaseEntitySchema factory (for domain entities)
 * 
 * Creates a base schema with common entity fields (id, createdAt, updatedAt)
 * that can be extended by domain-specific schemas.
 * 
 * Uses S.Date which serializes to ISO string.
 * All timestamps are mandatory - updatedAt is set to createdAt initially.
 * 
 * @param idSchema - The branded ID schema for the entity (e.g., UserId, DocumentId)
 * @returns A schema with id, createdAt, and updatedAt fields
 * 
 * @example
 * ```typescript
 * export const UserSchema = S.extend(
 *   BaseEntitySchema(UserId),
 *   S.Struct({
 *     email: EmailAddress,
 *     firstName: S.String
 *   })
 * )
 * ```
 */
export const BaseEntitySchema = <A, I, R>(idSchema: S.Schema<A, I, R>) =>
  S.Struct({
    id: idSchema,
    createdAt: S.Date,
    updatedAt: S.Date
  })

/**
 * BaseEntityRowSchema factory (for database rows)
 * 
 * Creates a base schema for database row representation.
 * Uses S.DateFromSelf to keep Date objects (no serialization to strings).
 * All timestamps are mandatory.
 * 
 * @param idSchema - The ID schema (usually S.String for raw DB)
 * @returns A schema with id, createdAt, and updatedAt fields
 * 
 * @example
 * ```typescript
 * export const UserRow = S.extend(
 *   BaseEntityRowSchema(S.String),
 *   S.Struct({
 *     email: S.String,
 *     firstName: S.String
 *   })
 * )
 * ```
 */
export const BaseEntityRowSchema = <A, I, R>(idSchema: S.Schema<A, I, R>) =>
  S.Struct({
    id: idSchema,
    createdAt: S.DateFromSelf,
    updatedAt: S.DateFromSelf
  })

/**
 * serializeWith - Generic helper for entity serialization
 * 
 * Encodes an entity instance using its schema.
 * Automatically handles:
 * - Option types → T | undefined
 * - Branded types → primitives
 * - Date objects → ISO strings (when using S.Date)
 * 
 * @param schema - The Effect Schema to use for encoding
 * @param entity - The entity instance to serialize
 * @returns Effect with serialized data or ParseError
 * 
 * @example
 * ```typescript
 * class UserEntity {
 *   serialized() {
 *     return serializeWith(UserSchema, this as unknown as UserType)
 *   }
 * }
 * ```
 */
export const serializeWith = <A, I>(
  schema: S.Schema<A, I, never>,
  entity: A
): Effect.Effect<S.Schema.Encoded<S.Schema<A, I, never>>, ParseResult.ParseError> => {
  return S.encode(schema)(entity)
}

