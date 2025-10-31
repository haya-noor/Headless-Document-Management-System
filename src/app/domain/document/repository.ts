import { Effect, Option } from "effect"
import { DocumentSchemaEntity } from "./entity"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DatabaseError, ConflictError } from "@/app/domain/shared/base.errors"
import { DocumentValidationError, DocumentNotFoundError } from "./errors"
import { BaseRepository } from "@/app/domain/shared/base.repository"
import { PaginatedResponse, PaginationParams } from "../shared/pagination"
// PaginationParams and PaginatedResponse imports removed – they do not exist

/**
 * Document-specific filter for repository queries
 */
export interface DocumentFilter {
  readonly ownerId?: UserId
  readonly title?: string
  readonly tags?: string[]
  readonly isActive?: boolean
}

/**
 * Document Repository Interface
 * 
 * Defines all persistence operations for Document entities.
 * Implementation lives in infrastructure layer.
 */
export abstract class DocumentRepository extends BaseRepository<
  DocumentSchemaEntity,
  DocumentNotFoundError,
  DocumentValidationError | ConflictError
> {
  protected readonly entityName = "Document"

  // ---------------------------------------------------------------------------
  // Domain-specific read operations
  // ---------------------------------------------------------------------------

  /**
   * Find multiple documents matching the given filter
   */
  abstract findMany(
    filter?: DocumentFilter
  ): Effect.Effect<DocumentSchemaEntity[], DatabaseError, never>

  /**
   * Find documents with pagination support
   */
  abstract findManyPaginated(
    pagination: PaginationParams,
    filter?: DocumentFilter
  ): Effect.Effect<PaginatedResponse<DocumentSchemaEntity>, DatabaseError, never>

  /**
   * Find documents by checksum (for duplicate detection)
   */
  abstract findByChecksum(
    checksum: string
  ): Effect.Effect<DocumentSchemaEntity[], DatabaseError, never>

  /**
   * Get document statistics
   */
  abstract getStats(): Effect.Effect<{
    totalDocuments: number
    totalSize: number
    documentsByOwner: Record<string, number>
  }, DatabaseError, never>
}

