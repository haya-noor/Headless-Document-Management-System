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
import { DownloadTokenEntity } from "@/app/domain/download-token/entity"
import { DownloadTokenValidationError } from "@/app/domain/download-token/errors"
import { makeDownloadTokenIdSync, makeDocumentIdSync, makeUserIdSync } from "@/app/domain/shared/uuid"
import { type SerializedDownloadToken } from "@/app/domain/download-token/schema"

/**
 * Field generators for DownloadToken
 * ----------------------------------
 * These helper functions generate individual fields with valid random values.
 * Used internally by `generateTestDownloadToken` and scenario creators.
 */
const downloadTokenGenerators = {
  // Unique identifier for token (UUID)
  id: () => makeDownloadTokenIdSync(crypto.randomUUID()),

  // Random secure token string (base64, 32 bytes → 43-44 chars)
  token: () =>
    randomBytes(32)
      .toString("base64")
      .replace(/\+/g, "-") // make URL-safe
      .replace(/\//g, "_")
      .replace(/=/g, ""), // remove padding

  // Linked document ID (UUID)
  documentId: () => makeDocumentIdSync(crypto.randomUUID()),

  // The user to whom this token is issued
  issuedTo: () => makeUserIdSync(crypto.randomUUID()),

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
    usedAt: shouldBeUsed ? downloadTokenGenerators.usedAt() : undefined, // usedAt as string or undefined
    createdAt: downloadTokenGenerators.createdAt(), // creation date
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
  usedAt: undefined, // explicitly unused
  expiresAt: downloadTokenGenerators.expiresAt(15), // valid for 15 minutes
  createdAt: new Date().toISOString(),
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
    createdAt: createdAt.toISOString(),
    usedAt: usedAt.toISOString(), // mark token as used
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
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    usedAt: undefined, // not used, but expired
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
  usedAt: undefined,
  expiresAt: new Date(Date.now() + 30 * 1000).toISOString(), // expires in 30 seconds
  createdAt: new Date(Date.now() - 60 * 1000).toISOString(), // created 1 minute ago
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
  id: fc.uuid().map(uuid => makeDownloadTokenIdSync(uuid)), // must always be a valid UUID
  token: fc.string({ minLength: 32, maxLength: 64 }).map(str => {
    // Generate a valid base64-like token that meets the URL-safe requirements
    const padded = str.padEnd(32, '0')
    const base64 = Buffer.from(padded).toString('base64')
    const urlSafe = base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
    
    // Ensure it's between 32-64 characters as required by the schema
    if (urlSafe.length < 32) {
      return urlSafe.padEnd(32, 'A')
    }
    if (urlSafe.length > 64) {
      return urlSafe.substring(0, 64)
    }
    return urlSafe
  }),
  documentId: fc.uuid().map(uuid => makeDocumentIdSync(uuid)),
  issuedTo: fc.uuid().map(uuid => makeUserIdSync(uuid)),
  // expiry date always in the future but within 24 hours (as per ExpiryWindow constraint)
  expiresAt: fc.integer({ min: 1, max: 24 * 60 * 60 * 1000 }).map(ms => 
    new Date(Date.now() + ms).toISOString()
  ),
  // optional usedAt, as string or undefined
  usedAt: fc.oneof(fc.constant(undefined), fc.integer({ min: -365 * 24 * 60 * 60 * 1000, max: 0 }).map(ms => 
    new Date(Date.now() + ms).toISOString()
  )),
  createdAt: fc.integer({ min: -365 * 24 * 60 * 60 * 1000, max: 0 }).map(ms => 
    new Date(Date.now() + ms).toISOString()
  ), // creation date anytime in the past
})
