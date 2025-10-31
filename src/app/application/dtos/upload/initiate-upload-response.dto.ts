import { Schema as S } from "effect"

/**
 * InitiateUpload Response DTO Schema
 * 
 * Response schema for the initiateUpload endpoint.
 * Returns a presigned URL that can be used to upload a file directly to storage.
 */
export const InitiateUploadResponseSchema = S.Struct({
  url: S.String,
  expiresIn: S.Number
})

export type InitiateUploadResponse = S.Schema.Type<typeof InitiateUploadResponseSchema>
export type InitiateUploadResponseEncoded = S.Schema.Encoded<typeof InitiateUploadResponseSchema>

