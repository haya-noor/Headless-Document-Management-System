/**
 * DownloadToken Factory
 * ---------------------
 * Generates valid DownloadToken entities for testing.
 * 
 * This file uses `Effect`, `faker`, and `crypto` to build realistic
 * domain-compliant data objects that mimic real-world download tokens.
 * It also provides scenario-based helpers (expired, used, unused, etc.)
 * for easier test setup.
 * 
 */

import { Effect as E, Option as O } from "effect"
import { faker } from "../setup"
import * as fc from "fast-check"
import { randomBytes } from "crypto"
import { DownloadTokenEntity } from "../../src/app/domain/download-token/entity"
import { DownloadTokenValidationError } from "../../src/app/domain/download-token/errors"
import { makeDownloadTokenIdSync, makeDocumentIdSync, makeUserIdSync } from "../../src/app/domain/shared/uuid"
import { type SerializedDownloadToken } from "../../src/app/domain/download-token/schema"

/**
 * Field generators for DownloadToken
 * ----------------------------------
 * These helper functions generate individual fields with valid random values.
 * Used internally by `generateTestDownloadToken` and scenario creators.
 */
const downloadTokenGenerators = {
  // Unique identifier for token (UUID)
  id: () => makeDownloadTokenIdSync(faker.string.uuid()),

  // Random secure token string (base64, 32 bytes → 43-44 chars)
  token: () =>
    randomBytes(32)
      .toString("base64")
      .replace(/\+/g, "-") // make URL-safe
      .replace(/\//g, "_")
      .replace(/=/g, ""), // remove padding

  // Linked document ID (UUID)
  documentId: () => makeDocumentIdSync(faker.string.uuid()),

  // The user to whom this token is issued
  issuedTo: () => makeUserIdSync(faker.string.uuid()),

  // Expiry date (default 5 minutes from now)
  expiresAt: (minutesFromNow = 5) => {
    const now = new Date()
    return new Date(now.getTime() + minutesFromNow * 60 * 1000).toISOString()
  },

  // The time this token was used (for “used” scenario)
  usedAt: () => faker.date.recent().toISOString(),

  // The creation timestamp
  createdAt: () => faker.date.recent().toISOString(),
}

/**
 * Base generator for DownloadToken (serialized format)
 * ---------------------------------------------------
 * Returns a valid random serialized token that fits domain schema.
 * Optionally accepts overrides for deterministic values.
 */
export const generateTestDownloadToken = (
  overrides: Partial<SerializedDownloadToken> = {}
): SerializedDownloadToken => {
  // ~30% chance that the token will be marked as "used"
  const shouldBeUsed = faker.datatype.boolean({ probability: 0.3 })

  return {
    id: downloadTokenGenerators.id(),
    token: downloadTokenGenerators.token(),
    documentId: downloadTokenGenerators.documentId(),
    issuedTo: downloadTokenGenerators.issuedTo(),
    expiresAt: downloadTokenGenerators.expiresAt(10), // expires in 10 minutes
    usedAt: shouldBeUsed ? O.some(downloadTokenGenerators.usedAt()) : O.none(), // Option type usedAt
    createdAt: new Date(downloadTokenGenerators.createdAt()), // creation date
    ...overrides, // allow caller to override any field
  }
}

/**
 * Generate multiple tokens for batch testing
 * ------------------------------------------
 * Example: load test, pagination tests, etc.
 */
export const generateTestDownloadTokens = (count: number): SerializedDownloadToken[] =>
  Array.from({ length: count }, () => generateTestDownloadToken())

/**
 * Scenario: Unused valid token
 * ----------------------------
 * Represents a token that has not been used and has not expired yet.
 */
export const createUnusedToken = (overrides: Partial<SerializedDownloadToken> = {}): SerializedDownloadToken => ({
  ...generateTestDownloadToken(),
  usedAt: O.none(), // explicitly unused
  expiresAt: downloadTokenGenerators.expiresAt(15), // valid for 15 minutes
  createdAt: new Date(),
  ...overrides,
})

/**
 * Scenario: Already used token
 * ----------------------------
 * Created 2 minutes ago, used 1 minute ago, still not expired.
 */
export const createUsedToken = (overrides: Partial<SerializedDownloadToken> = {}): SerializedDownloadToken => {
  const now = new Date()
  const createdAt = new Date(now.getTime() - 2 * 60 * 1000) // 2 minutes ago
  const usedAt = new Date(now.getTime() - 1 * 60 * 1000) // 1 minute ago
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now

  return {
    ...generateTestDownloadToken(),
    createdAt,
    usedAt: O.some(usedAt), // mark token as used
    expiresAt: expiresAt.toISOString(),
    ...overrides,
  }
}

/**
 * Scenario: Expired token
 * -----------------------
 * Token expired in the past (e.g., 2 minutes ago).
 */
export const createExpiredToken = (overrides: Partial<SerializedDownloadToken> = {}): SerializedDownloadToken => {
  const now = new Date()
  const createdAt = new Date(now.getTime() - 10 * 60 * 1000) // created 10 minutes ago
  const expiresAt = new Date(now.getTime() - 2 * 60 * 1000) // expired 2 minutes ago

  return {
    ...generateTestDownloadToken(),
    createdAt,
    expiresAt: expiresAt.toISOString(),
    usedAt: O.none(), // not used, but expired
    ...overrides,
  }
}

/**
 * Scenario: Token expiring very soon
 * ----------------------------------
 * Expires in 30 seconds — useful for testing expiry thresholds.
 */
export const createExpiringSoonToken = (overrides: Partial<SerializedDownloadToken> = {}): SerializedDownloadToken => ({
  ...generateTestDownloadToken(),
  usedAt: O.none(),
  expiresAt: new Date(Date.now() + 30 * 1000).toISOString(), // expires in 30 seconds
  createdAt: new Date(Date.now() - 60 * 1000), // created 1 minute ago
  ...overrides,
})

/**
 * Create a validated DownloadTokenEntity (Effect-based)
 * ----------------------------------------------------
 * Wraps entity creation in Effect, mapping domain-specific errors
 * to a `DownloadTokenValidationError`.
 */
export const createTestDownloadTokenEntity = (
  overrides: Partial<SerializedDownloadToken> = {}
): E.Effect<DownloadTokenEntity, DownloadTokenValidationError> =>
  DownloadTokenEntity.create(generateTestDownloadToken(overrides)).pipe(
    E.mapError(
      (err) =>
        new DownloadTokenValidationError(
          "DownloadToken",
          overrides,
          (err as Error).message || "Failed to create DownloadTokenEntity"
        )
    )
  )

/**
 * Property-based test generator (Fast-Check)
 * ------------------------------------------
 * Randomly generates large sets of valid token data
 * for fuzz or property-based testing.
 */
export const downloadTokenArbitrary = fc.record({
  id: fc.uuid(), // must always be a valid UUID
  token: fc.string({ minLength: 32, maxLength: 128 }), // ensure secure-length token
  documentId: fc.uuid(),
  issuedTo: fc.uuid(),
  // expiry date always in the future
  expiresAt: fc.date({ min: new Date() }).map((d) => d.toISOString()),
  // optional usedAt, following Option pattern
  usedAt: fc.oneof(fc.constant(O.none()), fc.date().map((d) => O.some(d.toISOString()))),
  createdAt: fc.date(), // creation date anytime
})
