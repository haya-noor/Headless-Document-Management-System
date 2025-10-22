import { Schema as S } from "effect"
import { DocumentGuards } from "./guards"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import { BaseEntitySchema } from "@/app/domain/shared/schema.utils"
import { Optional } from "@/app/domain/shared/validation.utils"

/** 
 * Document Schema
 * 
 * Domain model for a Document entity (aggregate root).
 * Uses S.extend to combine BaseEntitySchema with domain-specific fields.
 * 
 * Note: Document is the aggregate root that tracks document metadata
 * and references the current DocumentVersion. The actual file content
 * and version-specific data are managed by DocumentVersionEntity.
 */
export const DocumentSchema = S.extend(
  BaseEntitySchema(DocumentId),
  S.Struct({
    ownerId: UserId,
    title: DocumentGuards.ValidTitle,
    description: Optional(DocumentGuards.ValidDescription),
    tags: Optional(DocumentGuards.ValidTagList),
    currentVersionId: DocumentVersionId
  })
)

/**
 * Runtime type with proper Option<T> handling for optional fields
 */
export type DocumentType = S.Schema.Type<typeof DocumentSchema>

/**
 * Serialized type for external APIs (DTOs, JSON responses)
 * Optional fields are represented as T | undefined in serialized form
 */
export type SerializedDocument = S.Schema.Encoded<typeof DocumentSchema>

/**
 * Smart constructor with validation
 * 
 * Validates and decodes unknown input into DocumentType.
 * Returns Effect with validated data or ParseError.
 */
export const makeDocument = (input: unknown) => S.decodeUnknown(DocumentSchema)(input)

/**
 * CreateDocument Input Schema
 * 
 * Used for document creation requests (typically from API/controllers).
 * Contains the minimal required information to create a new document.
 */
export const CreateDocumentSchema = S.Struct({
  uploadedBy: UserId,
  filename: S.String.pipe(S.minLength(1), S.maxLength(255)),
  mimeType: S.String.pipe(S.minLength(3), S.maxLength(100)),
  size: S.Number.pipe(S.greaterThan(0)),
  checksum: S.optional(S.String.pipe(S.minLength(64), S.maxLength(64))),
  tags: S.optional(DocumentGuards.ValidTagList),
  metadata: S.optional(S.Unknown),
})

export type CreateDocumentInput = S.Schema.Type<typeof CreateDocumentSchema>
