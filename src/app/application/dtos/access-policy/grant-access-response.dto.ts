import { Schema as S } from "effect"

/**
 * GrantAccess Response DTO Schema
 * 
 * Response schema for the grantAccess endpoint.
 * Returns the created access policy entity.
 */
export const GrantAccessResponseSchema = S.Struct({
  id: S.String,
  subjectId: S.String,
  resourceId: S.String,
  actions: S.Array(S.String),
  createdAt: S.String,
  updatedAt: S.String
})

export type GrantAccessResponse = S.Schema.Type<typeof GrantAccessResponseSchema>
export type GrantAccessResponseEncoded = S.Schema.Encoded<typeof GrantAccessResponseSchema>

