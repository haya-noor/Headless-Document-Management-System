import { Schema as S } from "effect"

/**
 * UploadDocument Response DTO Schema
 * 
 * Response schema for the uploadDocument endpoint.
 * Returns the created document version entity after file upload.
 */
export const UploadDocumentResponseSchema = S.Struct({
  id: S.String,
  documentId: S.String,
  storageKey: S.String,
  checksum: S.String,
  uploadedBy: S.String,
  createdAt: S.String
})

export type UploadDocumentResponse = S.Schema.Type<typeof UploadDocumentResponseSchema>
export type UploadDocumentResponseEncoded = S.Schema.Encoded<typeof UploadDocumentResponseSchema>

