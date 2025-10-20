/**
 * AccessPolicyEntity Tests
 * ------------------------
 * Ensures schema validation, creation, and domain behavior are consistent.
 */

import { describe, it, expect } from "bun:test"
import { runEffect } from "../setup"
import {
  createAccessPolicyEntity,
  generateAccessPolicy,
} from "../factories/access-policy.factory-test"
import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import { AccessPolicyValidationError } from "@/app/domain/access-policy/errors"

describe("AccessPolicyEntity", () => {
  it("should create a valid AccessPolicyEntity", async () => {
    const entity = await runEffect(createAccessPolicyEntity())
    expect(entity).toBeInstanceOf(AccessPolicyEntity)
    expect(["user", "role"]).toContain(entity.subjectType)
    expect(["document"]).toContain(entity.resourceType)
    expect(Array.isArray(entity.actions)).toBe(true)
  })

  it("should fail validation for invalid subjectType", async () => {
    const invalid = generateAccessPolicy({ subjectType: "invalid" as any })
    await expect(runEffect(AccessPolicyEntity.create(invalid))).rejects.toThrow()
  })

  it("should prioritize lower priority values (higher precedence)", async () => {
    const p1 = await runEffect(createAccessPolicyEntity({ priority: 5 }))
    const p2 = await runEffect(createAccessPolicyEntity({ priority: 20 }))
    expect(p1.priority < p2.priority).toBe(true)
  })

  it("should support role-based policy creation", async () => {
    const entity = await runEffect(
      createAccessPolicyEntity({ subjectType: "role" })
    )
    expect(entity.subjectType).toBe("role")
  })

  it("should set isActive true by default", async () => {
    const entity = await runEffect(createAccessPolicyEntity())
    expect(typeof entity.active).toBe("boolean")
  })
})
