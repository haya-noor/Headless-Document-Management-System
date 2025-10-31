import { Schema as S } from "effect"

/**
 * CreateDownloadToken Response DTO Schema
 * 
 * Response schema for the createDownloadToken endpoint.
 * Returns the created download token entity.
 */
export const CreateDownloadTokenResponseSchema = S.Struct({
  id: S.String,
  token: S.String,
  documentId: S.String,
  issuedTo: S.String,
  expiresAt: S.DateFromSelf,
  createdAt: S.String,
  updatedAt: S.String
})

export type CreateDownloadTokenResponse = S.Schema.Type<typeof CreateDownloadTokenResponseSchema>
export type CreateDownloadTokenResponseEncoded = S.Schema.Encoded<typeof CreateDownloadTokenResponseSchema>

