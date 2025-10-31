import { Schema as S } from "effect"

/**
 * ListDocuments Response DTO Schema
 * 
 * Response schema for the listDocuments endpoint.
 * Returns a paginated list of documents.
 */
export const ListDocumentsResponseSchema = S.Struct({
  data: S.Array(
    S.Struct({
      id: S.String,
      title: S.String,
      createdAt: S.String,
      updatedAt: S.String
    })
  ),
  pagination: S.Struct({
    page: S.Number,
    limit: S.Number,
    total: S.Number,
    totalPages: S.Number
  })
})

export type ListDocumentsResponse = S.Schema.Type<typeof ListDocumentsResponseSchema>
export type ListDocumentsResponseEncoded = S.Schema.Encoded<typeof ListDocumentsResponseSchema>

