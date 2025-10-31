import { Schema as S } from "effect"

/**
 * UpdateDocument Response DTO Schema
 * 
 * Response schema for the updateDocument endpoint.
 * Returns the updated document ID and timestamp.
 */
export const UpdateDocumentResponseSchema = S.Struct({
  id: S.String,
  updatedAt: S.String
})

export type UpdateDocumentResponse = S.Schema.Type<typeof UpdateDocumentResponseSchema>
export type UpdateDocumentResponseEncoded = S.Schema.Encoded<typeof UpdateDocumentResponseSchema>

