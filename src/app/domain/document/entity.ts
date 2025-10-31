import { Effect, Option, Schema as S, ParseResult } from "effect"
import { BaseEntity } from "@/app/domain/shared/base.entity"
import { DocumentSchema } from "./schema"
import { DocumentGuards } from "./guards"
import { DocumentValidationError } from "./errors"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import { ValidationError, BusinessRuleViolationError } from "@/app/domain/shared/base.errors"
import { serializeWith } from "@/app/domain/shared/schema.utils"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type DocumentType = S.Schema.Type<typeof DocumentSchema>
export type SerializedDocument = S.Schema.Encoded<typeof DocumentSchema>

/**
 * DocumentSchemaEntity — Aggregate root for document domain
 *
 * Responsible for managing document metadata and its relationship
 * to its current DocumentVersion. The DocumentVersion remains
 * immutable, while DocumentSchemaEntity tracks the active version pointer.
 */
export class DocumentSchemaEntity extends BaseEntity<DocumentId, DocumentValidationError> {
  readonly id!: DocumentId
  readonly createdAt!: Date
  readonly updatedAt!: Date
  readonly ownerId!: UserId
  readonly title!: string
  readonly description!: Option.Option<string>
  readonly tags!: Option.Option<readonly string[]>
  readonly currentVersionId!: DocumentVersionId

  private constructor(data: DocumentType) {
    super()
    this.id = data.id as DocumentId
    this.ownerId = data.ownerId as UserId
    this.title = data.title
    this.description = Option.fromNullable(data.description)
    this.tags = Option.fromNullable(data.tags)
    this.currentVersionId = data.currentVersionId as DocumentVersionId
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /** Factory for validated entity creation */
  static create(input: unknown): Effect.Effect<DocumentSchemaEntity, DocumentValidationError, never> {
    return S.decodeUnknown(DocumentSchema)(input).pipe(
      Effect.map((data) => new DocumentSchemaEntity(data)),
      Effect.mapError((error) => 
        DocumentValidationError.forField(
          "DocumentSchema",
          input,
          error && typeof error === 'object' && 'message' in error
            ? (error as ParseResult.ParseError).message ?? "Validation failed"
            : String(error)
        )
      )
    ) as Effect.Effect<DocumentSchemaEntity, DocumentValidationError, never>
  }

  /**
   * Serialize entity using Effect Schema encoding
   * 
   * Automatically handles:
   * - Option types → T | undefined (manually unwrapped before encoding)
   * - Branded types → primitives
   * - Date objects → kept as Date for database operations
   * 
   * Note: S.encode does not automatically unwrap Option types, so we manually
   * unwrap them before encoding to ensure proper serialization.
   * 
   * @returns Effect with serialized document data
   */
  serialized(): Effect.Effect<SerializedDocument, ParseResult.ParseError> {
    // Manually unwrap Option types before encoding
    // S.encode doesn't unwrap Option types when entity has Option fields
    const dataForEncoding = {
      ...(this as unknown as DocumentType),
      description: Option.getOrUndefined(this.description),
      tags: Option.getOrUndefined(this.tags)
    }
    return serializeWith(DocumentSchema, dataForEncoding as DocumentType)
  }
}
