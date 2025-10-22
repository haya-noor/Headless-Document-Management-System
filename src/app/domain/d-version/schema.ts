import { Schema as S } from "effect"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import { DocumentVersionGuards } from "./guards"
import { Sha256 } from "@/app/domain/refined/checksum"
import { Optional } from "@/app/domain/shared/validation.utils"

/** 
 * DocumentVersion Schema
 * 
 * Domain model for a DocumentVersion entity (immutable).
 * 
 * Note: DocumentVersion doesn't use BaseEntitySchema because versions are immutable
 * and only have createdAt (no updatedAt field).
 * 
 * Each version represents an immutable snapshot of a document's content at a point in time.
 */
export const DocumentVersionSchema = S.Struct({
  id: DocumentVersionId,
  documentId: DocumentId,
  version: DocumentVersionGuards.ValidVersion,
  filename: S.String,
  mimeType: S.String,
  size: S.Number,
  storageKey: S.String,
  storageProvider: S.Literal("local", "s3", "gcs"),
  checksum: Optional(Sha256),
  tags: Optional(DocumentVersionGuards.ValidTags),
  metadata: Optional(S.Record({ key: S.String, value: S.Unknown })),
  uploadedBy: UserId,
  createdAt: S.Date
})

/**
 * Runtime type with proper Option<T> handling for optional fields
 */
export type DocumentVersionType = S.Schema.Type<typeof DocumentVersionSchema>

/**
 * Serialized type for external APIs (DTOs, JSON responses)
 * Optional fields are represented as T | undefined in serialized form
 */
export type SerializedDocumentVersion = S.Schema.Encoded<typeof DocumentVersionSchema>

/**
 * Smart constructor with validation
 * 
 * Validates and decodes unknown input into DocumentVersionType.
 * Returns Effect with validated data or ParseError.
 */
export const makeDocumentVersion = (input: unknown) => S.decodeUnknown(DocumentVersionSchema)(input)

