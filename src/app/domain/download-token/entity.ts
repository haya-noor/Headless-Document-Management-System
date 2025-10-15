import { Effect, Option, ParseResult, Schema as S, Clock } from "effect"
import { DownloadTokenSchema, DownloadTokenType, SerializedDownloadToken } from "./schema"
import { BusinessRuleViolationError, ValidationError } from "../shared/errors"
import { DownloadTokenAlreadyUsedError, DownloadTokenValidationError } from "./errors"
import { DocumentId, UserId, DownloadTokenId } from "../shared/uuid"
import { isExpiredAt, msUntilExpiry } from "./value-object"

/**
 * Domain Aggregate: DownloadToken
 * Represents a secure, time-limited link for accessing a document.
 */
export class DownloadTokenEntity {
  readonly id!: DownloadTokenId
  readonly token!: string
  readonly documentId!: DocumentId
  readonly issuedTo!: UserId
  readonly expiresAt!: Date
  readonly usedAt!: Option.Option<Date>
  readonly createdAt!: Date
  readonly updatedAt!: Option.Option<Date>

  private constructor(data: DownloadTokenType) {
    Object.assign(this, data)
  }

  static create(input: SerializedDownloadToken): Effect.Effect<DownloadTokenEntity, DownloadTokenValidationError, never> {
    return S.decodeUnknown(DownloadTokenSchema)(input).pipe(
      Effect.map((parsed) => new DownloadTokenEntity(parsed)),
      Effect.mapError((err) => new DownloadTokenValidationError((err as ParseResult.ParseError).message || "Validation failed")),
      Effect.provideService(Clock.Clock, Clock.Clock)
    )
  }

  markAsUsed(): Effect.Effect<DownloadTokenEntity, DownloadTokenAlreadyUsedError | ValidationError | BusinessRuleViolationError, Clock.Clock> {
    if (Option.isSome(this.usedAt)) return Effect.fail(new DownloadTokenAlreadyUsedError("token", this.id))
    if (new Date() > this.expiresAt) return Effect.fail(new BusinessRuleViolationError("TOKEN_EXPIRED", "Cannot use expired token", { tokenId: this.id }))

    const updated: SerializedDownloadToken = {
      ...this,
      usedAt: new Date()
    }
    return S.decodeUnknown(DownloadTokenSchema)(updated).pipe(
      Effect.map((parsed) => new DownloadTokenEntity(parsed)),
      Effect.mapError((err) => new ValidationError((err as ParseResult.ParseError).message || "Validation failed"))
    )
  }

  isUsed(): boolean {
    return Option.isSome(this.usedAt)
  }

  isExpired(): Effect.Effect<boolean, never, Clock.Clock> {
    return isExpiredAt(this.expiresAt)
  }

  millisecondsUntilExpiry(): Effect.Effect<number, never, Clock.Clock> {
    return msUntilExpiry(this.expiresAt)
  }

  belongsToUser(userId: UserId): boolean {
    return this.issuedTo === userId
  }
}
