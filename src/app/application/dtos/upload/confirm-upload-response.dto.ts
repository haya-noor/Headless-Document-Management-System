import { Schema as S } from "effect"

/**
 * ConfirmUpload Response DTO Schema
 * 
 * Response schema for the confirmUpload endpoint.
 * Returns the created document version entity after upload confirmation.
 */
export const ConfirmUploadResponseSchema = S.Struct({
  id: S.String,
  documentId: S.String,
  storageKey: S.String,
  checksum: S.String,
  uploadedBy: S.String,
  createdAt: S.String
})

export type ConfirmUploadResponse = S.Schema.Type<typeof ConfirmUploadResponseSchema>
export type ConfirmUploadResponseEncoded = S.Schema.Encoded<typeof ConfirmUploadResponseSchema>

