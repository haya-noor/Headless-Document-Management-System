// tests/domain/user.entity.test.ts

import { describe, it, expect } from "bun:test"
import fc from "fast-check"

import { runEffect, runEffectSyncWithError } from "../setup"

// Factory helpers you provided
import {
  generateTestUser,
  createTestUserEntity,
  userArbitrary,
} from "../factories/user.factory-test"

import { UserEntity } from "@/app/domain/user/entity"
import { UserValidationError } from "@/app/domain/user/errors"

/** Build a valid serialized object, then let tests override specific fields */
const baseValid = () => generateTestUser({})

describe("UserEntity • creation", () => {
  it("creates a valid user (happy path)", async () => {
    const user = await runEffect(createTestUserEntity())
    expect(user).toBeInstanceOf(UserEntity)
    expect(user.email).toContain("@")
  })

  it("handles missing optional fields", async () => {
    const user = await runEffect(
      createTestUserEntity({
        dateOfBirth: undefined,
        phoneNumber: undefined,
        profileImage: undefined,
      })
    )

    // Option-backed getters (present in your entity)
    expect(user.dateOfBirthOrNull).toBeNull()
    expect(user.phoneNumberOrNull).toBeNull()
    expect(user.profileImageOrNull).toBeNull()
  })
})
// Test that a UserEntity rejects invalid inputs via guards
describe("UserEntity • invalid inputs via guards", () => {
  it("rejects invalid email", async () => {
    const bad = { ...baseValid(), email: "not-an-email" } as any
    expect(() => runEffectSyncWithError(UserEntity.create(bad))).toThrow()
  })

  it("rejects empty firstName", async () => {
    const bad = { ...baseValid(), firstName: "" } as any
    expect(() => runEffectSyncWithError(UserEntity.create(bad))).toThrow()
  })

  it("rejects too-long firstName (> 100)", async () => {
    const bad = { ...baseValid(), firstName: "x".repeat(101) } as any
    expect(() => runEffectSyncWithError(UserEntity.create(bad))).toThrow()
  })

  it("rejects too-long phoneNumber (> 20)", async () => {
    const bad = { ...baseValid(), phoneNumber: "1".repeat(21) } as any
    expect(() => runEffectSyncWithError(UserEntity.create(bad))).toThrow()
  })

  it("rejects too-long profileImage (> 500)", async () => {
    const bad = { ...baseValid(), profileImage: "h".repeat(501) } as any
    expect(() => runEffectSyncWithError(UserEntity.create(bad))).toThrow()
  })

  it("rejects invalid role (not 'admin' | 'user')", async () => {
    const bad = { ...baseValid(), role: "superuser" } as any
    expect(() => runEffectSyncWithError(UserEntity.create(bad))).toThrow()
  })
})

/*
Because the factory is random. If we don’t force values, those optional fields might 
be missing and the test would fail by luck. Hardcoding them makes the test predictable
 and lets us check exactly what happens when the fields are present.

*/
describe("UserEntity • getters & helpers", () => {
  it("...OrNull getters reflect Option fields when present", async () => {
    const dob = new Date("2000-01-01T00:00:00.000Z").toISOString()
    const phone = "123456"
    const img = "https://example.com/p.png"

    const user = await runEffect(
      createTestUserEntity({
        dateOfBirth: dob,
        phoneNumber: phone,
        profileImage: img,
      })
    )

    expect(user.dateOfBirthOrNull?.toISOString()).toBe("2000-01-01T00:00:00.000Z")
    expect(user.phoneNumberOrNull).toBe(phone)
    expect(user.profileImageOrNull).toBe(img)
  })

  it("isActive() mirrors the entity state", async () => {
    const active = await runEffect(createTestUserEntity({ isActive: true }))
    const inactive = await runEffect(createTestUserEntity({ isActive: false }))
    expect(active.isActive()).toBe(true)
    expect(inactive.isActive()).toBe(false)
  })
})

describe("UserEntity • serialization", () => {
  it("serializes to clean shape (ISO dates; omits undefined optionals)", async () => {
    const user = await runEffect(
      createTestUserEntity({
        dateOfBirth: undefined,
        phoneNumber: undefined,
        profileImage: undefined,
        updatedAt: undefined,
      })
    )

    const s = user.serialized as any

    // core fields
    expect(s.id).toBe(user.id)
    expect(s.email).toBe(user.email)
    expect(typeof s.createdAt).toBe("string")
    expect(() => new Date(s.createdAt).toISOString()).not.toThrow()

    // omitted optionals
    expect(s.updatedAt).toBeUndefined()
    expect(s.dateOfBirth ?? undefined).toBeUndefined()
    expect(s.phoneNumber ?? undefined).toBeUndefined()
    expect(s.profileImage ?? undefined).toBeUndefined()
  })

  it("round-trips: serialized → create() preserves identity", async () => {
    const original = await runEffect(createTestUserEntity())
    const recreated = await runEffect(UserEntity.create(original.serialized as any))
    expect(recreated).toBeInstanceOf(UserEntity)
    expect(recreated.id).toBe(original.id)
    expect(recreated.email).toBe(original.email)
  })
})

describe("UserEntity • property-based (valid data)", () => {
  it("creates from arbitrary valid encoded user data", async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (encoded) => {
        const entity = await runEffect(UserEntity.create(encoded as any))
        expect(entity).toBeInstanceOf(UserEntity)
        expect(entity.email).toContain("@")
      }),
      { numRuns: 20 }
    )
  })
})

describe("UserEntity • boundary acceptance (exact limits)", () => {
  it("accepts phoneNumber length = 20", async () => {
    const ok = { ...baseValid(), phoneNumber: "1".repeat(20) } as any
    const user = await runEffect(UserEntity.create(ok))
    expect(user).toBeInstanceOf(UserEntity)
  })

  it("accepts profileImage length = 500", async () => {
    const ok = { ...baseValid(), profileImage: "h".repeat(500) } as any
    const user = await runEffect(UserEntity.create(ok))
    expect(user).toBeInstanceOf(UserEntity)
  })
})
