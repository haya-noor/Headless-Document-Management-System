import { Effect, Option, Schema as S, Clock } from "effect"
import { BaseEntity, IEntity } from "@/app/domain/shared/base.entity"
import { DocumentSchema } from "./schema"
import { DocumentGuards } from "./guards"
import { DocumentValidationError } from "./errors"
import { DocumentSchemaId, DocumentSchemaVersionId, UserId } from "@/app/domain/shared/uuid"
import { ValidationError, BusinessRuleViolationError } from "@/app/domain/shared/errors"

/**
 * IDocumentSchema — Aggregate contract
 */
export interface IDocumentSchema extends IEntity<DocumentSchemaId> {
  readonly ownerId: UserId
  readonly title: string
  readonly description: Option.Option<string>
  readonly tags: Option.Option<readonly string[]>
  readonly currentVersionId: DocumentSchemaVersionId
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>
}

/**
 * DocumentSchemaEntity — Aggregate root for document domain
 *
 * Responsible for managing document metadata and its relationship
 * to its current DocumentSchemaVersion. The DocumentSchemaVersionEntity remains
 * immutable, while DocumentSchemaEntity tracks the active version pointer.
 */
export class DocumentSchemaEntity extends BaseEntity<DocumentSchemaId> implements IDocumentSchema {
  readonly id: DocumentSchemaId
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>
  readonly ownerId: UserId
  readonly title: string
  readonly description: Option.Option<string>
  readonly tags: Option.Option<readonly string[]>
  readonly currentVersionId: DocumentSchemaVersionId

  private constructor(data: any) {
    super()
    this.id = data.id
    this.ownerId = data.ownerId
    this.title = data.title
    this.description = Option.fromNullable(data.description)
    this.tags = Option.fromNullable(data.tags)
    this.currentVersionId = data.currentVersionId
    this.createdAt = data.createdAt
    this.updatedAt = Option.fromNullable(data.updatedAt)
  }

  /** Factory for validated entity creation */
  static create(input: unknown): Effect.Effect<DocumentSchemaEntity, DocumentValidationError, never> {
    return S.decodeUnknown(DocumentSchema)(input).pipe(
      Effect.map((data) => new DocumentSchemaEntity(data)),
      Effect.mapError((err) => new DocumentValidationError("DocumentSchema", input, (err as any).message)),
      Effect.provideService(Clock.Clock, Clock.Clock)
    )
  }

  // ------------------------------------------------------------
  // Derived Properties
  // ------------------------------------------------------------

  get descriptionOrEmpty(): string {
    return Option.getOrElse(this.description, () => "")
  }

  get tagsOrEmpty(): readonly string[] {
    return Option.getOrElse(this.tags, () => [])
  }

  get hasTags(): boolean {
    return this.tagsOrEmpty.length > 0
  }

  get hasDescription(): boolean {
    return Option.isSome(this.description)
  }

  get isModified(): boolean {
    return Option.isSome(this.updatedAt)
  }

  get tagCount(): number {
    return this.tagsOrEmpty.length
  }

  // ------------------------------------------------------------
  // Domain Operations
  // ------------------------------------------------------------

  /** Rename the document */
  rename(newTitle: string): Effect.Effect<DocumentSchemaEntity, DocumentValidationError, never> {
    if (!DocumentGuards.isValidTitle(newTitle)) {
      return Effect.fail(new DocumentValidationError("title", newTitle, "Title is invalid"))
    }

    const updated = {
      ...this.toSerialized(),
      title: newTitle,
      updatedAt: new Date().toISOString()
    }

    return DocumentSchemaEntity.create(updated)
  }

  /** Update or clear document description */
  updateDescription(newDescription: string | null | undefined): Effect.Effect<DocumentSchemaEntity, DocumentValidationError, never> {
    const desc = newDescription ?? null
    if (desc !== null && !DocumentGuards.isValidDescription(desc)) {
      return Effect.fail(new DocumentValidationError("description", desc, "Invalid description"))
    }

    const updated = {
      ...this.toSerialized(),
      description: desc,
      updatedAt: new Date().toISOString()
    }

    return DocumentSchemaEntity.create(updated)
  }

  /** Add one or more new tags, ensuring uniqueness */
  addTags(newTags: string[]): Effect.Effect<DocumentSchemaEntity, ValidationError | BusinessRuleViolationError, never> {
    const current = this.tagsOrEmpty

    return DocumentGuards.prepareTagsForAddition(current, newTags).pipe(
      Effect.flatMap((merged) =>
        DocumentSchemaEntity.create({
          ...this.toSerialized(),
          tags: merged,
          updatedAt: new Date().toISOString()
        })
      )
    )
  }

  /** Remove tags while keeping validation consistent */
  removeTags(tagsToRemove: string[]): Effect.Effect<DocumentSchemaEntity, ValidationError, never> {
    const current = this.tagsOrEmpty
    if (current.length === 0) return Effect.succeed(this)

    return DocumentGuards.prepareTagsForRemoval(current, tagsToRemove).pipe(
      Effect.flatMap((remaining) =>
        DocumentSchemaEntity.create({
          ...this.toSerialized(),
          tags: remaining.length > 0 ? remaining : null,
          updatedAt: new Date().toISOString()
        })
      )
    )
  }

  /**
   * Update the document to reference a new current version.
   *
   * This operation belongs here (not in DocumentSchemaVersionEntity),
   * because the DocumentSchema aggregate root controls which version
   * is currently active.
   */
  updateCurrentVersion(newVersionId: DocumentSchemaVersionId): Effect.Effect<DocumentSchemaEntity, ValidationError, never> {
    const updated = {
      ...this.toSerialized(),
      currentVersionId: newVersionId,
      updatedAt: new Date().toISOString()
    }
    return DocumentSchemaEntity.create(updated)
  }

  /**
   * Domain serialization helper
   *
   * Builds a plain object representation of this DocumentSchemaEntity
   * compatible with the DocumentSchema.
   *
   * Uses BaseEntity.serialize() for id, createdAt, updatedAt.
   */
  private toSerialized(): S.Schema.Type<typeof DocumentSchema> {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      updatedAt: Option.getOrNull(this.updatedAt)?.toISOString(),
      ownerId: this.ownerId,
      title: this.title,
      description: Option.getOrNull(this.description),
      tags: Option.getOrNull(this.tags),
      currentVersionId: this.currentVersionId
    }
  }

  /** Required by BaseEntity */
  isActive(): boolean {
    return true
  }
}
