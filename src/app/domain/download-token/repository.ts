import { Effect, Option } from "effect"
import { DownloadTokenEntity } from "./entity"
import { DownloadTokenId, DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DatabaseError, ConflictError } from "@/app/domain/shared/base.errors"
import { DownloadTokenValidationError, DownloadTokenNotFoundError } from "./errors"
import { BaseRepository } from "@/app/domain/shared/base.repository"

/**
 * DownloadToken-specific filter for repository queries
 */
export interface DownloadTokenFilter {
  documentId?: DocumentId
  issuedTo?: UserId
  isUsed?: boolean
  isExpired?: boolean
}

/**
 * Download Token Repository Interface
 * 
 * Defines all persistence operations for DownloadToken entities.
 * Manages temporary download access tokens with expiration.
 */
export abstract class DownloadTokenRepository extends BaseRepository<
  DownloadTokenEntity,
  DownloadTokenNotFoundError,
  DownloadTokenValidationError | ConflictError
> {
  protected readonly entityName = "DownloadToken"

  // ---------------------------------------------------------------------------
  // Domain-specific read operations
  // ---------------------------------------------------------------------------

  /**
   * Find a token by its token string (for verification)
   */
  abstract findByToken(
    token: string
  ): Effect.Effect<Option.Option<DownloadTokenEntity>, DatabaseError, never>

  /**
   * Find all tokens for a specific document
   */
  abstract findByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError, never>

  /**
   * Find all tokens issued to a specific user
   */
  abstract findByIssuedTo(
    userId: UserId
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError, never>

  /**
   * Find tokens matching the given filter
   */
  abstract findMany(
    filter?: DownloadTokenFilter
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError, never>

  // ---------------------------------------------------------------------------
  // Domain-specific write operations
  // ---------------------------------------------------------------------------

  /**
   * Update an existing token (e.g., mark as used)
   */
  abstract update(
    token: DownloadTokenEntity
  ): Effect.Effect<DownloadTokenEntity, DownloadTokenNotFoundError | DownloadTokenValidationError | DatabaseError, never>

  /**
   * Delete all expired tokens
   * Returns count of deleted tokens
   */
  abstract deleteExpired(): Effect.Effect<number, DatabaseError, never>
}

