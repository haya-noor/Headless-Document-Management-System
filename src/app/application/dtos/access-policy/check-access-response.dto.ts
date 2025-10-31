import { Schema as S } from "effect"

/**
 * CheckAccess Response DTO Schema
 * 
 * Response schema for the checkAccess endpoint.
 * Returns whether the user has the requested permission.
 */
export const CheckAccessResponseSchema = S.Struct({
  allowed: S.Boolean
})

export type CheckAccessResponse = S.Schema.Type<typeof CheckAccessResponseSchema>
export type CheckAccessResponseEncoded = S.Schema.Encoded<typeof CheckAccessResponseSchema>

