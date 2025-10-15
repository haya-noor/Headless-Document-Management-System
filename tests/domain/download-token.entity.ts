/**
 * DownloadTokenEntity Tests
 * --------------------------
 * Validates token creation, expiry logic, and business rules.
 * 
 * This suite ensures the DownloadTokenEntity behaves correctly in
 * all lifecycle states — creation, usage, expiry, and ownership.
 */

import { describe, it, expect } from "bun:test"
import { runEffect } from "../setup"
import { Option as O, Effect, Clock, Layer } from "effect"
import {
  generateTestDownloadToken,
  createUnusedToken,
  createUsedToken,
  createExpiredToken,
  createExpiringSoonToken,
  createTestDownloadTokenEntity,
  downloadTokenArbitrary,
} from "../factories/download-token.factory"
import { DownloadTokenEntity } from "../../src/app/domain/download-token/entity"
import { DownloadTokenValidationError } from "../../src/app/domain/download-token/errors"
import { BusinessRuleViolationError } from "../../src/app/domain/shared/errors"
import * as fc from "fast-check"

describe("DownloadTokenEntity", () => {

  // ✅ Basic creation test — ensures a valid entity can be created from generated data
  it("should create a valid download token", async () => {
    const token = await runEffect(createTestDownloadTokenEntity())
    expect(token).toBeInstanceOf(DownloadTokenEntity)
    expect(token.token.length).toBeGreaterThanOrEqual(32) // must meet minimum length requirement
  })

  // ❌ Invalid token string should fail schema validation
  it("should reject short tokens", async () => {
    const invalid = generateTestDownloadToken({ token: "short" }) // too short
    await expect(runEffect(DownloadTokenEntity.create(invalid))).rejects.toThrow(DownloadTokenValidationError)
  })

  // ❌ Expired tokens at creation should be rejected
  it("should reject expired tokens on creation", async () => {
    const past = generateTestDownloadToken({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    await expect(runEffect(DownloadTokenEntity.create(past))).rejects.toThrow(DownloadTokenValidationError)
  })

  // ✅ Token that hasn’t been used and isn’t expired should be valid
  it("should detect unused and valid tokens", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createUnusedToken()))
    expect(token.isUsed()).toBe(false) // unused
    const isExpired = await runEffect(token.isExpired() as any)
    expect(isExpired).toBe(false) // still valid
  })

  // ✅ Used token detection — ensures `usedAt` field is respected
  it("should detect used tokens", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createUsedToken()))
    expect(token.isUsed()).toBe(true)
  })

  // ✅ Expired token detection — checks computed expiry logic
  it("should detect expired tokens", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createExpiredToken()))
    const isExpired = await runEffect(token.isExpired() as any)
    expect(isExpired).toBe(true)
  })

  // ✅ Expiry computation — verifies ms/seconds until expiry are within valid range
  it("should calculate expiry time correctly", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createExpiringSoonToken()))
    const msUntilExpiry = await runEffect(token.millisecondsUntilExpiry() as any) as number
    expect(msUntilExpiry).toBeGreaterThan(0)
    expect(msUntilExpiry / 1000).toBeLessThanOrEqual(60) // should expire within 1 minute
  })

  // ✅ Marking a valid unused token as used
  it("should mark token as used", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createUnusedToken()))
    const used = await runEffect(token.markAsUsed() as any) as DownloadTokenEntity
    expect(used.isUsed()).toBe(true)
  })

  // ❌ Prevent reusing a token that’s already used
  it("should not allow marking used token twice", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createUsedToken()))
    await expect(runEffect(token.markAsUsed() as any)).rejects.toThrow(BusinessRuleViolationError)
  })

  // ❌ Prevent using a token that has already expired
  it("should not allow marking expired token", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createExpiredToken()))
    await expect(runEffect(token.markAsUsed() as any)).rejects.toThrow(BusinessRuleViolationError)
  })

  // ✅ Ownership validation — ensures a token belongs to the issuing user
  it("should validate token ownership", async () => {
    const userId = "user-123" as any
    const token = await runEffect(DownloadTokenEntity.create(createUnusedToken({ issuedTo: userId })))
    expect(token.belongsToUser(userId)).toBe(true)
    expect(token.belongsToUser("other" as any)).toBe(false)
  })

  // ✅ User can use token only if it was issued to them
  it("should validate token usage for correct user", async () => {
    const userId = "user-abc" as any
    const token = await runEffect(DownloadTokenEntity.create(createUnusedToken({ issuedTo: userId })))
    expect(token.belongsToUser(userId)).toBe(true)
  })

  // ❌ Reject usage validation if the user doesn’t own the token
  it("should reject validation for wrong user", async () => {
    const token = await runEffect(DownloadTokenEntity.create(createUnusedToken()))
    expect(token.belongsToUser("wrong-user" as any)).toBe(false)
  })

  // ⚙️ Property-based test — ensures the entity can handle large ranges of valid data
  it("should handle property-based valid tokens", async () => {
    await fc.assert(
      fc.asyncProperty(downloadTokenArbitrary, async (data) => {
        // Pre-condition 1: token length must be ≥ 32 characters
        const tokenStr = data.token.trim()
        // Pre-condition 2: expiry must be in the future
        const expiry = new Date(data.expiresAt)
        fc.pre(tokenStr.length >= 32 && expiry.getTime() > Date.now())

        // Verify entity creation succeeds under valid data
        const entity = await runEffect(DownloadTokenEntity.create(data as any))
        expect(entity.token).toBe(data.token)
        expect(entity.documentId).toBe(data.documentId as any)
      }),
      { numRuns: 25 } // run multiple random input cases
    )
  })
})
