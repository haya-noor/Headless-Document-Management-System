import { Effect, Option, ParseResult, Schema as S } from "effect"
import { BaseEntity, IEntity } from "@/app/domain/shared/base.entity"
import { DocumentVersionSchema } from "./schema"
import { DocumentVersionValidationError } from "./errors"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/shared/uuid"
import { Sha256 } from "@/app/domain/shared/checksum"
import { ValidationError } from "@/app/domain/shared/errors"
import { FileKey, FileSize } from "@/app/domain/shared/metadata"

/**
 * IDocumentVersion — Aggregate contract
 */
export interface IDocumentVersion extends IEntity<DocumentVersionId> {
  readonly documentId: DocumentId
  readonly version: number
  readonly filename: string
  readonly mimeType: string
  readonly size: FileSize
  readonly storageKey: FileKey
  readonly storageProvider: "local" 
  readonly checksum: Option.Option<Sha256>
  readonly tags: Option.Option<string[]>
  readonly metadata: Option.Option<Record<string, unknown>>
  readonly uploadedBy: UserId
  readonly createdAt: Date
}

/**
 * Domain entity for DocumentVersion — aggregate root
 */
export class DocumentVersionEntity extends BaseEntity<DocumentVersionId> implements IDocumentVersion {
  readonly id: DocumentVersionId
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>
  readonly documentId: DocumentId
  readonly version: number
  readonly filename: string
  readonly mimeType: string
  readonly size: FileSize
  readonly storageKey: FileKey
  readonly storageProvider: "local" 
  readonly checksum: Option.Option<Sha256>
  readonly tags: Option.Option<string[]>
  readonly metadata: Option.Option<Record<string, unknown>>
  readonly uploadedBy: UserId

  private constructor(data: S.Schema.Type<typeof DocumentVersionSchema>) {
    super()
    this.id = data.id
    this.documentId = data.documentId
    this.version = data.version
    this.filename = data.filename
    this.mimeType = data.mimeType
    this.size = data.size as FileSize
    this.storageKey = data.storageKey as FileKey
    this.storageProvider = data.storageProvider as "local" 
    this.checksum = Option.fromNullable(data.checksum)
    this.tags = Option.fromNullable(data.tags as string[])
    this.metadata = Option.fromNullable(data.metadata)
    this.uploadedBy = data.uploadedBy
    this.createdAt = data.createdAt
    this.updatedAt = Option.none()
  }

  /** Factory method for creating validated DocumentVersionEntity */
  static create(
    input: unknown
  ): Effect.Effect<DocumentVersionEntity, DocumentVersionValidationError, never> {
    return S.decodeUnknown(DocumentVersionSchema)(input).pipe(
      Effect.map((data) => new DocumentVersionEntity(data)),
      Effect.mapError(
        (error) => new DocumentVersionValidationError("DocumentVersion", input, (error as ParseResult.ParseError).message)
      )
    )
  }

  /** Rule checks */
  isLatestVersion(current: number): boolean {
    return this.version === current
  }

  isNewerThan(other: number): boolean {
    return this.version > other
  }

  isOlderThan(other: number): boolean {
    return this.version < other
  }

  /** Convenience getters */
  get checksumOrNull(): Sha256 | null {
    return Option.getOrNull(this.checksum)
  }

  get tagsOrEmpty(): string[] {
    return Option.getOrElse(this.tags, () => [])
  }

  get metadataOrEmpty(): Record<string, unknown> {
    return Option.getOrElse(this.metadata, () => ({}))
  }

  get isImage(): boolean {
    return this.mimeType.startsWith("image/")
  }

  get sizeInMB(): number {
    return Math.round((this.size / 1024 / 1024) * 100) / 100
  }

  /** Required by BaseEntity */
  isActive(): boolean {
    return true // Document versions are always active
  }

  /** Domain invariant example */
  ensureStorageProviderIsValid(): Effect.Effect<void, ValidationError, never> {
    return this.storageProvider === "local" 
      ? Effect.void 
      : Effect.fail(new ValidationError("Invalid storage provider"))
  }
}
