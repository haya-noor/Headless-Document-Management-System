import { Effect, Option, ParseResult, Schema as S } from "effect"
import { DocumentVersionSchema } from "./schema"
import { DocumentVersionValidationError } from "./errors"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import { Sha256 } from "@/app/domain/refined/checksum"
import { FileKey, FileSize } from "@/app/domain/refined/metadata"
import { serializeWith } from "@/app/domain/shared/schema.utils"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type DocumentVersionType = S.Schema.Type<typeof DocumentVersionSchema>
export type SerializedDocumentVersion = S.Schema.Encoded<typeof DocumentVersionSchema>

/**
 * DocumentVersionEntity — Aggregate root for document version management
 * 
 * Represents an immutable version of a document with its content metadata.
 * Each version tracks the file's storage location, size, checksum, and optional metadata.
 * 
 * Note: Versions are immutable and don't have updatedAt field.
 */
export class DocumentVersionEntity {
  readonly id!: DocumentVersionId
  readonly createdAt!: Date
  readonly documentId!: DocumentId
  readonly version!: number
  readonly filename!: string
  readonly mimeType!: string
  readonly size!: FileSize
  readonly storageKey!: FileKey
  readonly storageProvider!: "local" 
  readonly checksum!: Option.Option<Sha256>
  readonly tags!: Option.Option<readonly string[]>
  readonly metadata!: Option.Option<Record<string, unknown>>
  readonly uploadedBy!: UserId

  private constructor(data: DocumentVersionType) {
    this.id = data.id as DocumentVersionId
    this.documentId = data.documentId as DocumentId
    this.version = data.version
    this.filename = data.filename
    this.mimeType = data.mimeType
    this.size = data.size as FileSize
    this.storageKey = data.storageKey as FileKey
    this.storageProvider = data.storageProvider as "local" 
    this.checksum = Option.fromNullable(data.checksum)
    this.tags = Option.fromNullable(data.tags)
    this.metadata = Option.fromNullable(data.metadata)
    this.uploadedBy = data.uploadedBy as UserId
    this.createdAt = data.createdAt
  }

  /** Factory method for creating validated DocumentVersionEntity */
  static create(
    input: unknown
  ): Effect.Effect<DocumentVersionEntity, DocumentVersionValidationError, never> {
    return S.decodeUnknown(DocumentVersionSchema)(input).pipe(
      Effect.map((data) => new DocumentVersionEntity(data)),
      Effect.mapError((error) => 
        DocumentVersionValidationError.forField(
          "DocumentVersion",
          input,
          error && typeof error === 'object' && 'message' in error
            ? (error as ParseResult.ParseError).message ?? "Validation failed"
            : String(error)
        )
      )
    ) as Effect.Effect<DocumentVersionEntity, DocumentVersionValidationError, never>
  }

  /**
   * Serialize entity using Effect Schema encoding
   * 
   * Automatically handles:
   * - Option types → T | undefined
   * - Branded types → primitives
   * - Date objects → kept as Date for database operations
   * 
   * Note: No updatedAt since versions are immutable.
   * 
   * @returns Effect with serialized document version data
   */
  serialized(): Effect.Effect<SerializedDocumentVersion, ParseResult.ParseError> {
    return serializeWith(DocumentVersionSchema, this as unknown as DocumentVersionType)
  }
}
