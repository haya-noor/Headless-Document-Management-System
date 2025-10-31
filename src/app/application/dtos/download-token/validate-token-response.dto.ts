import { Schema as S } from "effect"

/**
 * ValidateDownloadToken Response DTO Schema
 * 
 * Response schema for the validateDownloadToken endpoint.
 * Returns validation result with token ID and validation timestamp.
 */
export const ValidateDownloadTokenResponseSchema = S.Struct({
  success: S.Literal(true),
  tokenId: S.String,
  validatedAt: S.String
})

export type ValidateDownloadTokenResponse = S.Schema.Type<typeof ValidateDownloadTokenResponseSchema>
export type ValidateDownloadTokenResponseEncoded = S.Schema.Encoded<typeof ValidateDownloadTokenResponseSchema>

