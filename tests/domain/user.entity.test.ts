/**
 * UserEntity Tests (Bun)
 * -----------------------
 * Validates schema decoding, invariants, and rule behavior for User domain entity.
 */

import { describe, it, expect } from "bun:test"
import { runEffect } from "../setup"
import { Option as O } from "effect"
import {
  generateTestUser,
  createAdminUser,
  createRegularUser,
  createInactiveUser,
  createTestUserEntity,
  userArbitrary,
} from "../factories/user.factory"
import { UserEntity } from "../../src/app/domain/user/entity"
import { UserValidationError } from "../../src/app/domain/user/errors"
import * as fc from "fast-check"

describe("UserEntity", () => {
  it("should create a valid UserEntity", async () => {
    const user = await runEffect(createTestUserEntity())
    expect(user).toBeInstanceOf(UserEntity)
    expect(user.email).toContain("@")
    expect(user.firstName.length).toBeGreaterThan(0)
  })

  it("should handle missing optional fields", async () => {
    const user = await runEffect(
      UserEntity.create(generateTestUser({
        dateOfBirth: undefined,
        phoneNumber: undefined,
        profileImage: undefined,
      }))
    )
    expect(O.isNone(user.dateOfBirth)).toBe(true)
    expect(O.isNone(user.phoneNumber)).toBe(true)
    expect(O.isNone(user.profileImage)).toBe(true)
  })

  it("should reject invalid email", async () => {
    const badUser = generateTestUser({ email: "not-an-email" as any })
    await expect(runEffect(UserEntity.create(badUser))).rejects.toThrow(UserValidationError)
  })

  it("should detect admin vs regular roles correctly", async () => {
    const admin = await runEffect(UserEntity.create(createAdminUser()))
    const regular = await runEffect(UserEntity.create(createRegularUser()))
    expect(admin.role).toBe("admin")
    expect(regular.role).toBe("user")
  })

  it("should handle inactive users correctly", async () => {
    const inactive = await runEffect(UserEntity.create(createInactiveUser()))
    expect(inactive.isActive()).toBe(false)
  })

  it("should serialize and recreate entity", async () => {
    const user = await runEffect(createTestUserEntity())
    const serialized = user.serialized
    const recreated = await runEffect(UserEntity.create(serialized as any))
    expect(recreated.email).toBe(user.email)
    expect(recreated.id).toBe(user.id)
  })

  it("should handle property-based valid user data", async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (data) => {
        const entity = await runEffect(UserEntity.create(data as any))
        expect(entity).toBeInstanceOf(UserEntity)
        expect(entity.email).toContain("@")
      }),
      { numRuns: 20 }
    )
  })
})
