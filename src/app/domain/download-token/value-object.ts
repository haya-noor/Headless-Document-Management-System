import { Schema as S, Effect, Clock } from "effect"

/**
 * Token string — must be a URL-safe, Base64-like identifier.
 */
export const DownloadTokenString = S.String.pipe(
  S.filter((value) => {
    const trimmed = value.trim()
    const re = /^[A-Za-z0-9_-]+$/
    return trimmed.length >= 32 && trimmed.length <= 64 && re.test(trimmed)
  }, { message: () => "Token must be URL-safe Base64 (32–64 chars)" }),
  S.transform(S.String, {
    decode: (input) => input.trim(),
    encode: (value) => value
  }),
  S.brand("DownloadTokenString")
)
export type DownloadTokenString = S.Schema.Type<typeof DownloadTokenString>

/**
 * Expiry window validation — ensures expiry is in the future and within a max window.
 */
export const ExpiryWindow = (maxWindowMs: number = 24 * 60 * 60 * 1000) =>
  <A, I, R>(schema: S.Schema<A, I, R>) =>
    S.filter((date: Date) => {
      const now = Date.now()
      return date.getTime() > now && date.getTime() <= now + maxWindowMs
    }, { message: () => "Expiry must be in the future and within allowed window" })(schema as any)

export const isExpiredAt = (expiresAt: Date, clockSkewMs: number = 0): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((nowMs) => nowMs > expiresAt.getTime() + clockSkewMs)
  )

export const msUntilExpiry = (expiresAt: Date, clockSkewMs: number = 0): Effect.Effect<number, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((nowMs) => Math.max(0, (expiresAt.getTime() + clockSkewMs) - nowMs))
  )
