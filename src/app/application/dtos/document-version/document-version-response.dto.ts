import { Schema as S } from "effect"

/**
 * DocumentVersion Response DTO Schema
 * 
 * Response schema for document version operations.
 */
export const DocumentVersionResponseSchema = S.Struct({
  id: S.String,
  documentId: S.String,
  version: S.Number,
  filename: S.String,
  mimeType: S.String,
  size: S.Number,
  storageKey: S.String,
  storageProvider: S.String,
  checksum: S.optional(S.String),
  tags: S.optional(S.Array(S.String)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  uploadedBy: S.String,
  createdAt: S.String
})

export type DocumentVersionResponse = S.Schema.Type<typeof DocumentVersionResponseSchema>
export type DocumentVersionResponseEncoded = S.Schema.Encoded<typeof DocumentVersionResponseSchema>
