import { Effect, Option } from "effect"
import { DocumentVersionEntity } from "./entity"
import { DocumentVersionId, DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DatabaseError, ConflictError } from "@/app/domain/shared/base.errors"
import { DocumentVersionValidationError, DocumentVersionNotFoundError } from "./errors"
import { BaseRepository } from "@/app/domain/shared/base.repository"
import { PaginatedResponse, PaginationParams } from "../shared"

/**
 * DocumentVersion-specific filter for repository queries
 */
export interface DocumentVersionFilter {
  readonly documentId?: DocumentId
  readonly version?: number
  readonly uploadedBy?: UserId
  readonly mimeType?: string
  readonly minSize?: number
  readonly maxSize?: number
}

/**
 * Document Version Repository Interface
 * 
 * Defines all persistence operations for DocumentVersion entities.
 * Versions are immutable - primarily read operations with limited writes.
 */
export abstract class DocumentVersionRepository extends BaseRepository<
  DocumentVersionEntity,
  DocumentVersionNotFoundError,
  DocumentVersionValidationError | ConflictError
> {
  protected readonly entityName = "DocumentVersion"

  // ---------------------------------------------------------------------------
  // Domain-specific read operations
  // ---------------------------------------------------------------------------

  /**
   * Find all versions for a specific document
   */
  abstract findByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<DocumentVersionEntity[], DatabaseError, never>

  /**
   * Find a specific version number for a document
   */
  abstract findByDocumentIdAndVersion(
    documentId: DocumentId,
    version: number
  ): Effect.Effect<Option.Option<DocumentVersionEntity>, DatabaseError, never>

  /**
   * Find the latest version for a document
   */
  abstract findLatestByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<Option.Option<DocumentVersionEntity>, DatabaseError, never>

  /**
   * Find versions with pagination
   */
  abstract findManyPaginated(
    pagination: PaginationParams,
    filter?: DocumentVersionFilter
  ): Effect.Effect<PaginatedResponse<DocumentVersionEntity>, DatabaseError, never>

  /**
   * Get the next version number for a document
   */
  abstract getNextVersionNumber(
    documentId: DocumentId
  ): Effect.Effect<number, DatabaseError, never>
}

