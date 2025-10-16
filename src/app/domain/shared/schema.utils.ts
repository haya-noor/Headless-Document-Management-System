import { Schema as S, Option } from "effect"

/**
 * Creates an optional schema that can be null or undefined
 */
export const Optional = <A, I, R>(schema: S.Schema<A, I, R>) => 
  S.optional(schema)

/**
 * Creates a base entity schema with common fields
 */
export const BaseEntitySchema = <TId>(idSchema: S.Schema<TId>) =>
  S.Struct({
    id: idSchema,
    createdAt: S.DateFromString,
    updatedAt: S.optional(S.DateFromString)
  })
