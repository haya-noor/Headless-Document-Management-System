import { Schema as S } from "effect"

/**
 * CreateDocument Response DTO Schema
 * 
 * Response schema for the createDocument endpoint.
 * Returns the created document entity.
 */
export const CreateDocumentResponseSchema = S.Struct({
  id: S.String,
  title: S.String,
  description: S.optional(S.String),
  tags: S.Array(S.String),
  createdAt: S.String,
  updatedAt: S.String
})

export type CreateDocumentResponse = S.Schema.Type<typeof CreateDocumentResponseSchema>
export type CreateDocumentResponseEncoded = S.Schema.Encoded<typeof CreateDocumentResponseSchema>

