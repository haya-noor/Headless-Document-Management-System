import { Schema as S } from "effect"

/**
 * RevokeAccess Response DTO Schema
 * 
 * Response schema for the revokeAccess endpoint.
 * Returns success status and revocation details.
 */
export const RevokeAccessResponseSchema = S.Struct({
  success: S.Boolean,
  documentId: S.String,
  revokedFrom: S.String
})

export type RevokeAccessResponse = S.Schema.Type<typeof RevokeAccessResponseSchema>
export type RevokeAccessResponseEncoded = S.Schema.Encoded<typeof RevokeAccessResponseSchema>

