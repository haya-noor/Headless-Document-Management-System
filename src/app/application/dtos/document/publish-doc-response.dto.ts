import { Schema as S } from "effect"

/**
 * PublishDocument Response DTO Schema
 * 
 * Response schema for the publishDocument endpoint.
 * Returns the published document ID, status, and timestamp.
 */
export const PublishDocumentResponseSchema = S.Struct({
  id: S.String,
  publishStatus: S.String,
  updatedAt: S.String
})

export type PublishDocumentResponse = S.Schema.Type<typeof PublishDocumentResponseSchema>
export type PublishDocumentResponseEncoded = S.Schema.Encoded<typeof PublishDocumentResponseSchema>

