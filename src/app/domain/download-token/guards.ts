import { Effect, Option, Clock } from "effect"
import { DownloadTokenEntity } from "./entity"
import { DownloadTokenAlreadyUsedError, DownloadTokenValidationError } from "./errors"
import { BusinessRuleViolationError } from "../shared/errors"

/**
 * DownloadToken Guards
 * --------------------
 * Reusable Effect-based predicates enforcing domain invariants.
 * Used by DownloadTokenEntity and DocumentAccessService.
 */

/**
 * Ensure token belongs to a specific user.
 */
export const ensureTokenBelongsToUser = (
  token: DownloadTokenEntity,
  userId: string
): Effect.Effect<DownloadTokenEntity, BusinessRuleViolationError> =>
  Effect.sync(() => {
    if (token.issuedTo !== userId) {
      throw new BusinessRuleViolationError(
        "TOKEN_USER_MISMATCH",
        "Token does not belong to this user",
        { tokenId: token.id, issuedTo: token.issuedTo, userId }
      )
    }
    return token
  })

/**
 * Ensure token has not already been used.
 */
export const ensureTokenNotUsed = (
  token: DownloadTokenEntity
): Effect.Effect<DownloadTokenEntity, DownloadTokenAlreadyUsedError> =>
  Effect.sync(() => {
    if (Option.isSome(token.usedAt)) {
      throw new DownloadTokenAlreadyUsedError("token", token.id)
    }
    return token
  })

/**
 * Ensure token is not expired.
 * Checks expiry time relative to the system clock.
 */
export const ensureTokenNotExpired = (
  token: DownloadTokenEntity,
  clockSkewMs: number = 0
): Effect.Effect<DownloadTokenEntity, BusinessRuleViolationError, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => {
      const expiresAt = token.expiresAt.getTime()
      if (now > expiresAt + clockSkewMs) {
        throw new BusinessRuleViolationError(
          "TOKEN_EXPIRED",
          "Token has expired",
          { tokenId: token.id, expiresAt: token.expiresAt }
        )
      }
      return token
    })
  )

/**
 * Ensure token is valid for use.
 * Combines all other guards sequentially.
 */
export const ensureTokenIsValid = (
  token: DownloadTokenEntity,
  userId: string
): Effect.Effect<DownloadTokenEntity, DownloadTokenAlreadyUsedError | BusinessRuleViolationError | DownloadTokenValidationError, Clock.Clock> =>
  ensureTokenBelongsToUser(token, userId).pipe(
    Effect.flatMap(ensureTokenNotUsed),
    Effect.flatMap((t) => ensureTokenNotExpired(t))
  )
