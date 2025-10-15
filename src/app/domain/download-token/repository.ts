import { Effect, Option } from "effect"
import { DownloadTokenEntity } from "./entity"
import { DownloadTokenNotFoundError, DownloadTokenAlreadyUsedError } from "./errors"
import { DocumentId, DownloadTokenId, UserId } from "../shared/uuid"

/**
 * DownloadToken Repository Interface
 * Defines the contract for DownloadToken data access operations
 */
export abstract class DownloadTokenRepository {
  /**
   * Create a new download token
   */
  abstract create(token: DownloadTokenEntity): Effect.Effect<DownloadTokenEntity, DownloadTokenAlreadyUsedError>

  /**
   * Find a token by its ID
   */
  abstract findById(id: DownloadTokenId): Effect.Effect<DownloadTokenEntity, DownloadTokenNotFoundError>

  /**
   * Find a token by its string value
   */
  abstract findByToken(token: string): Effect.Effect<DownloadTokenEntity, DownloadTokenNotFoundError>

  /**
   * Find tokens for a specific document
   */
  abstract findByDocumentId(documentId: DocumentId): Effect.Effect<DownloadTokenEntity[], never>

  /**
   * Find tokens issued to a specific user
   */
  abstract findByUserId(userId: UserId): Effect.Effect<DownloadTokenEntity[], never>

  /**
   * Update an existing token
   */
  abstract update(token: DownloadTokenEntity): Effect.Effect<DownloadTokenEntity, DownloadTokenNotFoundError>

  /**
   * Delete a token by ID
   */
  abstract delete(id: DownloadTokenId): Effect.Effect<void, DownloadTokenNotFoundError>

  /**
   * Find expired tokens
   */
  abstract findExpired(): Effect.Effect<DownloadTokenEntity[], never>

  /**
   * Clean up expired tokens
   */
  abstract cleanupExpired(): Effect.Effect<number, never>
}

export { DownloadTokenRepository }
