import { Effect, Option, ParseResult, Schema as S, Clock } from "effect"
import { DownloadTokenSchema, DownloadTokenType, SerializedDownloadToken } from "./schema"
import { BusinessRuleViolationError, ValidationError } from "@/app/domain/shared/errors"
import { DownloadTokenAlreadyUsedError, DownloadTokenValidationError } from "./errors"
import { DocumentId, UserId, DownloadTokenId } from "@/app/domain/shared/uuid"
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
    Object.assign(this, {
      ...data,
      usedAt: data.usedAt ? Option.some(data.usedAt) : Option.none()
    })
  }

  static create(input: SerializedDownloadToken): Effect.Effect<DownloadTokenEntity, DownloadTokenValidationError, never> {
    return S.decodeUnknown(DownloadTokenSchema)(input).pipe(
      Effect.map((parsed) => new DownloadTokenEntity(parsed)),
      Effect.catchAll((err) => {
        if (err._tag === "ParseError") {
          return Effect.fail(new DownloadTokenValidationError(err.message || "Validation failed"))
        }
        if (err._tag === "RepositoryError") {
          return Effect.fail(new DownloadTokenValidationError(err.message || "Validation failed"))
        }
        return Effect.fail(new DownloadTokenValidationError("Validation failed"))
      })
    )
  }

  markAsUsed(): Effect.Effect<DownloadTokenEntity, DownloadTokenAlreadyUsedError | ValidationError | BusinessRuleViolationError, Clock.Clock> {
    if (Option.isSome(this.usedAt)) return Effect.fail(new DownloadTokenAlreadyUsedError("token", this.id))
    if (new Date() > this.expiresAt) return Effect.fail(new BusinessRuleViolationError("TOKEN_EXPIRED", "Cannot use expired token", { tokenId: this.id }))

    const updated: SerializedDownloadToken = {
      ...this,
      id: this.id,
      token: this.token,
      documentId: this.documentId,
      issuedTo: this.issuedTo,
      expiresAt: this.expiresAt.toISOString(),
      usedAt: new Date().toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt ? Option.getOrNull(this.updatedAt)?.toISOString() : undefined
    }
    return S.decodeUnknown(DownloadTokenSchema)(updated).pipe(
      Effect.map((parsed) => new DownloadTokenEntity(parsed)),
      Effect.catchAll((err) => {
        if (err._tag === "ParseError") {
          return Effect.fail(new ValidationError(err.message || "Validation failed"))
        }
        if (err._tag === "RepositoryError") {
          return Effect.fail(new ValidationError(err.message || "Validation failed"))
        }
        return Effect.fail(new ValidationError("Validation failed"))
      })
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
