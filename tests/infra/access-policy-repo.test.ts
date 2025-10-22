/**
 * AccessPolicy Repository Integration Tests
 * ==========================================
 * Fully declarative using Effect schema patterns.
 * All composition via Effect.pipe and Option matching.
 * No imperative control flow.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "bun:test"
import { Effect, Option, pipe, Schema as S } from "effect"

import { AccessPolicyRepository } from "@/app/infrastructure/repositories/implementations/access-policy.repository"
import { setupTestDatabase, teardownTestDatabase, cleanupDatabase } from "../setup/database.setup"
import { createTestUserEntity } from "../factories/user.factory-test"
import { createTestDocumentEntity } from "../factories/document.factory-test"
import {
  createAccessPolicyEntity,
  createUserReadPolicy,
  createUserWritePolicy,
  createUserAdminPolicy,
  createRolePolicy,
} from "../factories/access-policy.factory-test"
import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import { DatabaseError, NotFoundError } from "@/app/domain/shared/base.errors"

/**
 * Test Runtime Helpers
 * Declarative error handling and effect composition
 */
const TestRuntime = {
  run: <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(effect),

  runExpectingError: <A, E>(effect: Effect.Effect<A, E>): Promise<E> =>
    pipe(
      effect,
      Effect.flip,
      Effect.runPromise
    ),

  runArray: <A, E>(effects: Effect.Effect<A, E>[]): Promise<A[]> =>
    pipe(
      Effect.all(effects),
      Effect.runPromise
    ),
}

import type { UserId, DocumentId } from "@/app/domain/refined/uuid"

/**
 * Test State (immutable, reset each test)
 */
interface TestState {
  repository: AccessPolicyRepository
  testUserId: UserId
  otherUserId: UserId
  testDocumentId: DocumentId
}

let state: TestState

/**
 * Setup & Teardown
 */
beforeAll(async () => {
  const { db } = await setupTestDatabase()
  state = {
    repository: new AccessPolicyRepository(db),
    testUserId: "" as UserId,
    otherUserId: "" as UserId,
    testDocumentId: "" as DocumentId,
  }

  // Create users and document via Effect composition
  const setupUsers = pipe(
    Effect.all([createTestUserEntity(), createTestUserEntity()]),
    Effect.map(([user1, user2]) => ({ user1, user2 }))
  )

  const { user1, user2 } = await TestRuntime.run(setupUsers)
  state.testUserId = user1.id as UserId
  state.otherUserId = user2.id as UserId

  // Create document
  const setupDoc = createTestDocumentEntity({ ownerId: state.testUserId })
  const doc = await TestRuntime.run(setupDoc)
  state.testDocumentId = doc.id as DocumentId
})

afterAll(async () => {
  await teardownTestDatabase()
})

beforeEach(async () => {
  await cleanupDatabase()
})

/**
 * Declarative Test Helpers
 */
const createAndSavePolicy = (overrides?: Parameters<typeof createAccessPolicyEntity>[0]) =>
  pipe(
    createAccessPolicyEntity(overrides),
    Effect.flatMap((policy) => state.repository.save(policy)),
  )

const findPolicyById = (id: string) =>
  pipe(
    state.repository.findById(id as any),
    Effect.map((opt) => Option.getOrThrow(opt))
  )

const expectPolicyNotFound = (id: string) =>
  pipe(
    state.repository.findById(id as any),
    Effect.map((opt) => Option.isNone(opt))
  )

const expectResourceHasPolicies = (resourceId: string, expectedMin: number) =>
  pipe(
    state.repository.findByResourceId(resourceId as any),
    Effect.map((policies) => policies.length >= expectedMin)
  )

/**
 * Tests: CREATE / SAVE
 */
describe("AccessPolicyRepository • Save (CREATE)", () => {
  it("saves a new user policy and retrieves it", async () => {
    const result = await TestRuntime.run(
      pipe(
        createAndSavePolicy({
          subjectId: state.testUserId as any,
          resourceId: state.testDocumentId as any,
          actions: ["read", "write"],
        }),
        Effect.flatMap((policy) => findPolicyById(policy.id))
      )
    )

    expect(result.subjectType).toBe("user")
    expect(result.subjectId).toBe(state.testUserId)
    expect(result.actions).toEqual(["read", "write"])
  })

  it("saves a role-based policy", async () => {
    const result = await TestRuntime.run(
      pipe(
        createAndSavePolicy({
          subjectType: "role",
          name: "ADMIN_ROLE",
          resourceId: state.testDocumentId as any,
          actions: ["read", "write", "delete"],
        }),
        Effect.map((policy) => ({
          subjectType: policy.subjectType,
          name: policy.name,
          actions: policy.actions,
        }))
      )
    )

    expect(result.subjectType).toBe("role")
    expect(result.name).toBe("ADMIN_ROLE")
    expect(result.actions).toEqual(["read", "write", "delete"])
  })

  it("saves policy with all permissions", async () => {
    const result = await TestRuntime.run(
      pipe(
        createAccessPolicyEntity({
          subjectId: state.testUserId as any,
          resourceId: state.testDocumentId as any,
          actions: ["read", "write", "delete", "manage"],
        }),
        Effect.flatMap((policy) => state.repository.save(policy)),
        Effect.map((policy) => policy.hasAllPermissions)
      )
    )

    expect(result).toBe(true)
  })
})

/**
 * Tests: READ by ID
 */
describe("AccessPolicyRepository • FindById (READ)", () => {
  it("finds a policy by ID", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        /*
        why is there "any"? 
        */
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const found = await TestRuntime.run(
      pipe(
        state.repository.findById(saved.id),
        Effect.map(Option.isSome)
      )
    )

    expect(found).toBe(true)
  })

  it("returns None for non-existent ID", async () => {
    const result = await TestRuntime.run(
      pipe(
        state.repository.findById("00000000-0000-0000-0000-000000000000" as any),
        Effect.map(Option.isNone)
      )
    )

    expect(result).toBe(true)
  })
})

/**
 * Tests: READ by Resource
 */
describe("AccessPolicyRepository • FindByResourceId (READ)", () => {
  beforeEach(async () => {
    await TestRuntime.run(
      pipe(
        Effect.all([
          createAndSavePolicy({
            subjectId: state.testUserId as any,
            resourceId: state.testDocumentId as any,
          }),
          createAndSavePolicy({
            subjectId: state.otherUserId as any,
            resourceId: state.testDocumentId as any,
          }),
        ]),
        Effect.asVoid
      )
    )
  })

  it("finds all policies for a resource", async () => {
    const policies = await TestRuntime.run(
      state.repository.findByResourceId(state.testDocumentId as any)
    )

    expect(policies.length).toBeGreaterThanOrEqual(2)
    expect(policies.some((p) => p.subjectId === state.testUserId)).toBe(true)
    expect(policies.some((p) => p.subjectId === state.otherUserId)).toBe(true)
  })

  it("returns empty array for resource with no policies", async () => {
    const newDoc = await TestRuntime.run(
      createTestDocumentEntity({ ownerId: state.testUserId })
    )

    const policies = await TestRuntime.run(
      state.repository.findByResourceId(newDoc.id as any)
    )

    expect(policies.length).toBe(0)
  })
})

/**
 * Tests: READ by Subject
 */
describe("AccessPolicyRepository • FindBySubject (READ)", () => {
  it("finds policies by user subject", async () => {
    await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const policies = await TestRuntime.run(
      state.repository.findBySubject("user", state.testUserId as any)
    )

    expect(policies.length).toBeGreaterThan(0)
    expect(
      policies.every(
        (p) => p.subjectType === "user" && p.subjectId === state.testUserId
      )
    ).toBe(true)
  })

  it("finds policies by role subject", async () => {
    await TestRuntime.run(
      createAndSavePolicy({
        subjectType: "role",
        name: "EDITOR",
        resourceId: state.testDocumentId as any,
      })
    )

    const policies = await TestRuntime.run(
      state.repository.findBySubject("role", undefined, "EDITOR")
    )

    expect(policies.length).toBeGreaterThan(0)
    expect(
      policies.every((p) => p.subjectType === "role" && p.name === "EDITOR")
    ).toBe(true)
  })
})

/**
 * Tests: READ by User & Resource
 */
describe("AccessPolicyRepository • FindByUserAndResource (READ)", () => {
  it("finds policies for specific user + resource", async () => {
    await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const policies = await TestRuntime.run(
      state.repository.findByUserAndResource(
        state.testUserId as any,
        state.testDocumentId as any
      )
    )

    expect(policies.length).toBeGreaterThan(0)
    expect(
      policies.every(
        (p) =>
          p.subjectType === "user" &&
          p.subjectId === state.testUserId &&
          Option.getOrNull(p.resourceId) === state.testDocumentId
      )
    ).toBe(true)
  })

  it("returns empty when no policies match", async () => {
    const newDoc = await TestRuntime.run(
      createTestDocumentEntity({ ownerId: state.testUserId })
    )

    const policies = await TestRuntime.run(
      state.repository.findByUserAndResource(
        state.otherUserId as any,
        newDoc.id as any
      )
    )

    expect(policies.length).toBe(0)
  })
})

/**
 * Tests: Exists
 */
describe("AccessPolicyRepository • Exists (READ)", () => {
  it("returns true when policy exists", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const exists = await TestRuntime.run(state.repository.exists(saved.id))
    expect(exists).toBe(true)
  })

  it("returns false when policy does not exist", async () => {
    const exists = await TestRuntime.run(
      state.repository.exists("00000000-0000-0000-0000-000000000000" as any)
    )

    expect(exists).toBe(false)
  })
})

/**
 * Tests: UPDATE
 */
describe("AccessPolicyRepository • Update Operations", () => {
  it("updates policy actions", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
        actions: ["read"],
      })
    )

    const updated = await TestRuntime.run(
      pipe(
        Effect.succeed(saved),
        Effect.flatMap((policy) => policy.updateActions(["read", "write", "manage"])),
        Effect.flatMap((policy) => state.repository.save(policy))
      )
    )

    expect(updated.actions).toEqual(["read", "write", "manage"])
  })

  it("updates policy priority", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
        priority: 100,
      })
    )

    const updated = await TestRuntime.run(
      pipe(
        Effect.succeed(saved),
        Effect.flatMap((policy) => policy.updatePriority(50)),
        Effect.flatMap((policy) => state.repository.save(policy))
      )
    )

    expect(updated.priority).toBe(50)
    expect(updated.isHighPriority).toBe(true)
  })

  it("activates and deactivates policies", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const deactivated = await TestRuntime.run(
      pipe(
        Effect.succeed(saved),
        Effect.flatMap((p) => p.deactivate()),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(deactivated.active).toBe(false)

    const reactivated = await TestRuntime.run(
      pipe(
        Effect.succeed(deactivated),
        Effect.flatMap((p) => p.activate()),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(reactivated.active).toBe(true)
  })
})

/**
 * Tests: DELETE
 */
describe("AccessPolicyRepository • Delete Operations", () => {
  it("deletes a policy by ID", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const deleted = await TestRuntime.run(state.repository.delete(saved.id))
    expect(deleted).toBe(true)

    const notFound = await TestRuntime.run(expectPolicyNotFound(saved.id))
    expect(notFound).toBe(true)
  })

  it("fails to delete non-existent policy", async () => {
    const error = await TestRuntime.runExpectingError(
      state.repository.delete("00000000-0000-0000-0000-000000000000" as any)
    )

    expect(error).toBeInstanceOf(NotFoundError)
  })

  it("bulk deletes by resource ID", async () => {
    await TestRuntime.run(
      pipe(
        Effect.all([
          createAndSavePolicy({
            subjectId: state.testUserId as any,
            resourceId: state.testDocumentId as any,
          }),
          createAndSavePolicy({
            subjectId: state.otherUserId as any,
            resourceId: state.testDocumentId as any,
          }),
        ]),
        Effect.asVoid
      )
    )

    const count = await TestRuntime.run(
      state.repository.deleteByResourceId(state.testDocumentId as any)
    )

    expect(count).toBeGreaterThanOrEqual(2)

    const remaining = await TestRuntime.run(
      state.repository.findByResourceId(state.testDocumentId as any)
    )

    expect(remaining.length).toBe(0)
  })

  it("bulk deletes by user ID", async () => {
    const doc2 = await TestRuntime.run(
      createTestDocumentEntity({ ownerId: state.testUserId })
    )

    await TestRuntime.run(
      pipe(
        Effect.all([
          createAndSavePolicy({
            subjectId: state.testUserId as any,
            resourceId: state.testDocumentId as any,
          }),
          createAndSavePolicy({
            subjectId: state.testUserId as any,
            resourceId: doc2.id as any,
          }),
        ]),
        Effect.asVoid
      )
    )

    const count = await TestRuntime.run(
      state.repository.deleteByUserId(state.testUserId as any)
    )

    expect(count).toBeGreaterThanOrEqual(2)

    const remaining = await TestRuntime.run(
      state.repository.findBySubject("user", state.testUserId as any)
    )

    expect(remaining.length).toBe(0)
  })
})

/**
 * Tests: Domain Behavior
 */
describe("AccessPolicyRepository • Domain Behavior", () => {
  it("applies to subject correctly", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    expect(saved.appliesToSubject("user", state.testUserId as any)).toBe(true)
    expect(saved.appliesToSubject("user", state.otherUserId as any)).toBe(false)
  })

  it("applies to resource correctly", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    expect(saved.appliesToResource("document", state.testDocumentId as any)).toBe(true)

    const otherDoc = await TestRuntime.run(
      createTestDocumentEntity({ ownerId: state.testUserId })
    )

    expect(saved.appliesToResource("document", otherDoc.id as any)).toBe(false)
  })

  it("grants actions correctly", async () => {
    const saved = await TestRuntime.run(
      pipe(
        createAccessPolicyEntity({
          subjectId: state.testUserId as any,
          resourceId: state.testDocumentId as any,
          actions: ["read"],
        }),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(saved.grantsAction("read")).toBe(true)
    expect(saved.grantsAction("write")).toBe(false)
    expect(saved.grantsAction("delete")).toBe(false)
  })

  it("compares priorities correctly", async () => {
    const [saved1, saved2] = await TestRuntime.run(
      pipe(
        Effect.all([
          createAndSavePolicy({ priority: 10 }),
          createAndSavePolicy({ priority: 50 }),
        ])
      )
    )

    expect(saved1.hasHigherPriorityThan(saved2)).toBe(true)
    expect(saved2.hasHigherPriorityThan(saved1)).toBe(false)
  })
})

/**
 * Tests: Permissions Scenarios
 */
describe("AccessPolicyRepository • Permissions Scenarios", () => {
  it("read-only policy grants only read", async () => {
    const saved = await TestRuntime.run(
      pipe(
        createAccessPolicyEntity({
          subjectId: state.testUserId as any,
          resourceId: state.testDocumentId as any,
          actions: ["read"],
        }),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(saved.grantsAction("read")).toBe(true)
    expect(saved.grantsAction("write")).toBe(false)
    expect(saved.grantsAction("manage")).toBe(false)
  })

  it("write policy grants read and write", async () => {
    const saved = await TestRuntime.run(
      pipe(
        createAccessPolicyEntity({
          subjectId: state.testUserId as any,
          resourceId: state.testDocumentId as any,
          actions: ["read", "write"],
        }),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(saved.grantsAction("read")).toBe(true)
    expect(saved.grantsAction("write")).toBe(true)
    expect(saved.grantsAction("delete")).toBe(false)
  })

  it("admin policy grants all permissions", async () => {
    const saved = await TestRuntime.run(
      pipe(
        createAccessPolicyEntity({
          subjectId: state.testUserId as any,
          resourceId: state.testDocumentId as any,
          actions: ["read", "write", "delete", "manage"],
        }),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(saved.grantsAction("read")).toBe(true)
    expect(saved.grantsAction("write")).toBe(true)
    expect(saved.grantsAction("delete")).toBe(true)
    expect(saved.grantsAction("manage")).toBe(true)
    expect(saved.hasAllPermissions).toBe(true)
  })
})

/**
 * Tests: Serialization Round-Trip
 */
describe("AccessPolicyRepository • Serialization Round-Trip", () => {
  it("round-trips user policy correctly", async () => {
    const original = await TestRuntime.run(
      createAccessPolicyEntity({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
        actions: ["read", "write"],
        priority: 75,
      })
    )

    const fetched = await TestRuntime.run(
      pipe(
        state.repository.save(original),
        Effect.flatMap((saved) => findPolicyById(saved.id))
      )
    )

    expect(fetched.id).toBe(original.id)
    expect(fetched.subjectType).toBe("user")
    expect(fetched.subjectId).toBe(state.testUserId)
    expect(Option.getOrNull(fetched.resourceId)).toBe(state.testDocumentId)
    expect(fetched.actions).toEqual(["read", "write"])
    expect(fetched.priority).toBe(75)
  })

  it("round-trips role policy correctly", async () => {
    const original = await TestRuntime.run(
      createAccessPolicyEntity({
        subjectType: "role",
        name: "VIEWER",
        resourceId: state.testDocumentId as any,
      })
    )

    const fetched = await TestRuntime.run(
      pipe(
        state.repository.save(original),
        Effect.flatMap((saved) => findPolicyById(saved.id))
      )
    )

    expect(fetched.id).toBe(original.id)
    expect(fetched.subjectType).toBe("role")
    expect(fetched.active).toBe(original.active)
  })

  it("preserves all fields through save/load cycle", async () => {
    const original = await TestRuntime.run(
      createAccessPolicyEntity({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
        actions: ["read", "delete"],
        priority: 25,
      })
    )

    const fetched = await TestRuntime.run(
      pipe(
        state.repository.save(original),
        Effect.flatMap((saved) =>
          pipe(
            saved.updatePriority(50),
            Effect.flatMap((updated) => state.repository.save(updated))
          )
        ),
        Effect.flatMap((resaved) => findPolicyById(resaved.id))
      )
    )

    expect(fetched.priority).toBe(50)
    expect(fetched.actions).toEqual(["read", "delete"])
    expect(fetched.isModified).toBe(true)
  })
})

/**
 * Tests: Policy Activation
 */
describe("AccessPolicyRepository • Policy Activation", () => {
  it("activates an inactive policy", async () => {
    const policy = await TestRuntime.run(
      createAccessPolicyEntity({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const saved = await TestRuntime.run(
      pipe(
        policy.activate(),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(saved.active).toBe(true)
  })

  it("deactivates an active policy", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    const updated = await TestRuntime.run(
      pipe(
        saved.deactivate(),
        Effect.flatMap((p) => state.repository.save(p))
      )
    )

    expect(updated.active).toBe(false)
  })
})

/**
 * Tests: Policy Comparison
 */
describe("AccessPolicyRepository • Policy Comparison", () => {
  it("compares policy priorities correctly", async () => {
    const [saved1, saved2] = await TestRuntime.run(
      pipe(
        Effect.all([
          createAndSavePolicy({ priority: 10 }),
          createAndSavePolicy({ priority: 50 }),
        ])
      )
    )

    expect(saved1.hasHigherPriorityThan(saved2)).toBe(true)
    expect(saved2.hasHigherPriorityThan(saved1)).toBe(false)
  })

  it("checks if policy applies to subject", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    expect(saved.appliesToSubject("user", state.testUserId as any)).toBe(true)
    expect(saved.appliesToSubject("user", state.otherUserId as any)).toBe(false)
  })

  it("checks if policy applies to resource", async () => {
    const saved = await TestRuntime.run(
      createAndSavePolicy({
        subjectId: state.testUserId as any,
        resourceId: state.testDocumentId as any,
      })
    )

    expect(saved.appliesToResource("document", state.testDocumentId as any)).toBe(true)
    expect(
      saved.appliesToResource("document", "00000000-0000-0000-0000-000000000000" as any)
    ).toBe(false)
  })
})