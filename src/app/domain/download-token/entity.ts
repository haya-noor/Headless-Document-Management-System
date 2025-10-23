import { Effect, Option, ParseResult, Schema as S, Clock } from "effect"
import { BaseEntity } from "@/app/domain/shared/base.entity"
import { DownloadTokenSchema } from "./schema"
import { BusinessRuleViolationError, ValidationError } from "@/app/domain/shared/base.errors"
import { DownloadTokenAlreadyUsedError, DownloadTokenValidationError } from "./errors"
import { DocumentId, UserId, DownloadTokenId } from "@/app/domain/refined/uuid"
import { isExpiredAt, msUntilExpiry } from "./value-object"
import { serializeWith } from "@/app/domain/shared/schema.utils"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type DownloadTokenType = S.Schema.Type<typeof DownloadTokenSchema>
export type SerializedDownloadToken = S.Schema.Encoded<typeof DownloadTokenSchema>

/**
 * DownloadTokenEntity — Aggregate root for secure document access
 * 
 * Represents a secure, time-limited link for accessing a document.
 * Tokens can be used only once and have an expiration date.
 */
export class DownloadTokenEntity extends BaseEntity<DownloadTokenId, DownloadTokenValidationError> {
  readonly id!: DownloadTokenId
  readonly createdAt!: Date
  readonly updatedAt!: Date
  readonly token!: string
  readonly documentId!: DocumentId
  readonly issuedTo!: UserId
  readonly expiresAt!: Date
  readonly usedAt!: Option.Option<Date>

  private constructor(data: DownloadTokenType) {
    super()
    this.id = data.id as DownloadTokenId
    this.token = data.token
    this.documentId = data.documentId as DocumentId
    this.issuedTo = data.issuedTo as UserId
    this.expiresAt = data.expiresAt
    this.usedAt = Option.fromNullable(data.usedAt)
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  static create(input: unknown): Effect.Effect<DownloadTokenEntity, DownloadTokenValidationError, never> {
    return S.decodeUnknown(DownloadTokenSchema)(input).pipe(
      Effect.map((data) => new DownloadTokenEntity(data)),
      Effect.mapError((error) => 
        DownloadTokenValidationError.forField(
          "DownloadToken",
          input,
          error && typeof error === 'object' && 'message' in error
            ? (error as ParseResult.ParseError).message ?? "Validation failed"
            : String(error)
        )
      )
    ) as Effect.Effect<DownloadTokenEntity, DownloadTokenValidationError, never>
  }


  /**
   * Validate token usage for a specific user
   * 
   * Checks:
   * - Token is not already used
   * - Token is not expired
   * - Token is issued to the correct user
   * 
   * @param userId - The user ID to validate against
   * @returns Effect with the validated token entity
   */
  validateUsage(userId: UserId): Effect.Effect<DownloadTokenEntity, DownloadTokenValidationError, never> {
    // Check if token is already used
    if (Option.isSome(this.usedAt)) {
      return Effect.fail(DownloadTokenValidationError.forField(
        "DownloadToken",
        { tokenId: this.id, userId },
        "Token has already been used"
      ))
    }
    
    // Check if token is expired
    if (this.expiresAt < new Date()) {
      return Effect.fail(DownloadTokenValidationError.forField(
        "DownloadToken",
        { tokenId: this.id, userId },
        "Token has expired"
      ))
    }
    
    // Check if token is issued to the correct user
    if (this.issuedTo !== userId) {
      return Effect.fail(DownloadTokenValidationError.forField(
        "DownloadToken",
        { tokenId: this.id, userId },
        "Token is not valid for this user"
      ))
    }
    
    return Effect.succeed(this)
  }

  /**
   * Serialize entity using Effect Schema encoding
   * 
   * Automatically handles:
   * - Option types → T | undefined
   * - Branded types → primitives
   * - Date objects → kept as Date for database operations
   * 
   * @returns Effect with serialized download token data
   */
  serialized(): Effect.Effect<SerializedDownloadToken, ParseResult.ParseError> {
    return serializeWith(DownloadTokenSchema, this as unknown as DownloadTokenType)
  }
}
