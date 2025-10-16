import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { Effect as E, Option as O } from "effect"
import { eq, sql } from "drizzle-orm"

// SUT
import { AccessPolicyRepository } from "../../../src/app/infrastructure/repositories/implementations/access-policy.repository"
// Domain
import { AccessPolicyEntity } from "../../../src/app/domain/access-policy/entity"
// Shared ids
import { DocumentId, UserId } from "../../../src/app/domain/shared/uuid"

// --- Test DB harness (adjust imports to your project) ---
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser,
  createTestDocument,
  type TestDatabase
} from "../setup/database"

// ---------- Local test helpers (lightweight factories) ----------

const now = () => new Date()

function makeUserPolicyData(userId: string, docId: string, overrides?: Partial<any>) {
  return {
    id: crypto.randomUUID(),
    name: "USER_POLICY",
    description: "Read+Write for a user",
    subjectType: "user" as const,
    subjectId: userId as unknown as UserId,
    resourceType: "document" as const,
    resourceId: docId as unknown as DocumentId,
    actions: ["read", "write"] as const, // valid per your guards.ts
    isActive: true,
    priority: 100,
    createdAt: now(),
    updatedAt: undefined,
    ...overrides
  }
}

function makeRolePolicyData(roleName: string, docId: string, overrides?: Partial<any>) {
  return {
    id: crypto.randomUUID(),
    name: roleName, // your repo uses `name` as a role discriminator for subjectType === "role"
    description: "Role-based policy",
    subjectType: "role" as const,
    // for role policies we omit user subjectId
    // subjectId stays undefined (entity accepts undefined for optional fields)
    subjectId: undefined,
    resourceType: "document" as const,
    resourceId: docId as unknown as DocumentId,
    actions: ["read", "delete"] as const,
    isActive: true,
    priority: 90,
    createdAt: now(),
    updatedAt: undefined,
    ...overrides
  }
}

// Wrap entity creation (Effect) for convenience
function createEntitySync(data: unknown): AccessPolicyEntity {
  return E.runSync(AccessPolicyEntity.create(data))
}

// ============ TESTS ============

describe("AccessPolicyRepository (integration)", () => {
  let testDb: TestDatabase
  let repo: AccessPolicyRepository
  let testUserId: string
  let testDocumentId: string

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    repo = new AccessPolicyRepository(testDb.db)
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    await cleanupDatabase(testDb.db)

    // Arrange base user + document
    const user = await createTestUser(testDb.db, { email: "policy-user@example.com" })
    testUserId = user.id

    const versionId = crypto.randomUUID()
    const doc = await createTestDocument(testDb.db, testUserId, {
      title: "Doc for Policies",
      currentVersionId: versionId
    })
    testDocumentId = doc.id
  })

  describe("save (CREATE)", () => {
    it("saves a new user policy", async () => {
      const policy = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      const saved = await E.runPromise(repo.save(policy)) as AccessPolicyEntity

      expect(saved.id).toBe(policy.id)
      expect(saved.subjectType).toBe("user")
      expect(saved.subjectId).toBe(testUserId)
      expect(saved.actions).toEqual(["read", "write"])

      // resourceId is Option in entity; compare via Option.getOrNull
      expect(O.getOrNull(saved.resourceId)).toBe(testDocumentId)
    })

    it("saves a role policy (subjectType=role, name used as role key)", async () => {
      const policy = createEntitySync(makeRolePolicyData("ADMIN", testDocumentId))
      const saved = await E.runPromise(repo.save(policy)) as AccessPolicyEntity

      expect(saved.subjectType).toBe("role")
      // no subjectId for role
      expect(saved.subjectId).toBeUndefined()
      // name acts as role discriminator in repo.findBySubject(..., roleName)
      expect(saved.name).toBe("ADMIN")
      expect(saved.actions).toEqual(["read", "delete"])
      expect(O.getOrNull(saved.resourceId)).toBe(testDocumentId)
    })

    it("saves policy with multiple allowed actions", async () => {
      const policy = createEntitySync(
        makeUserPolicyData(testUserId, testDocumentId, { actions: ["read", "write", "manage"] })
      )
      const saved = await E.runPromise(repo.save(policy)) as AccessPolicyEntity
      expect(saved.actions).toEqual(["read", "write", "manage"])
    })
  })

  describe("findById (READ)", () => {
    it("finds a policy by id", async () => {
      const policy = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      await E.runPromise(repo.save(policy))

      const foundOpt = await E.runPromise(repo.findById(policy.id)) as O.Option<AccessPolicyEntity>
      expect(O.isSome(foundOpt)).toBe(true)

      const found = O.getOrThrow(foundOpt)
      expect(found.id).toBe(policy.id)
    })

    it("returns none for a non-existent id", async () => {
      const foundOpt = await E.runPromise(repo.findById(crypto.randomUUID())) as O.Option<AccessPolicyEntity>
      expect(O.isNone(foundOpt)).toBe(true)
    })
  })

  describe("findByResourceId (READ)", () => {
    it("returns all policies for a resource", async () => {
      const other = await createTestUser(testDb.db, { email: "user2@example.com" })

      const p1 = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      const p2 = createEntitySync(makeUserPolicyData(other.id, testDocumentId, { actions: ["read"] }))

      await E.runPromise(repo.save(p1))
      await E.runPromise(repo.save(p2))

      const policies = await E.runPromise(repo.findByResourceId(testDocumentId as any)) as readonly AccessPolicyEntity[]
      expect(policies.length).toBe(2)
      expect(policies.some(p => p.subjectId === testUserId)).toBe(true)
      expect(policies.some(p => p.subjectId === other.id)).toBe(true)
    })

    it("returns empty for resource with no policies", async () => {
      const versionId = crypto.randomUUID()
      const newDoc = await createTestDocument(testDb.db, testUserId, {
        title: "No Policies",
        currentVersionId: versionId
      })

      const policies = await E.runPromise(repo.findByResourceId(newDoc.id as any)) as readonly AccessPolicyEntity[]
      expect(policies.length).toBe(0)
    })
  })

  describe("findBySubject (READ)", () => {
    it("finds user-subject policies", async () => {
      const p = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      await E.runPromise(repo.save(p))

      const policies = await E.runPromise(repo.findBySubject("user", testUserId as any)) as readonly AccessPolicyEntity[]
      expect(policies.length).toBeGreaterThan(0)
      expect(policies.every(x => x.subjectType === "user")).toBe(true)
      expect(policies.every(x => x.subjectId === testUserId)).toBe(true)
    })

    it("finds role-subject policies (by name as role key)", async () => {
      const p = createEntitySync(makeRolePolicyData("ADMIN", testDocumentId))
      await E.runPromise(repo.save(p))

      const policies = await E.runPromise(repo.findBySubject("role", undefined, "ADMIN")) as readonly AccessPolicyEntity[]
      expect(policies.length).toBeGreaterThan(0)
      expect(policies.every(x => x.subjectType === "role")).toBe(true)
      expect(policies.every(x => x.name === "ADMIN")).toBe(true)
    })
  })

  describe("findByUserAndResource (READ)", () => {
    it("finds policies for specific user+resource", async () => {
      const p = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      await E.runPromise(repo.save(p))

      const policies = await E.runPromise(repo.findByUserAndResource(testUserId as any, testDocumentId as any)) as readonly AccessPolicyEntity[]
      expect(policies.length).toBe(1)
      expect(policies[0]?.subjectId).toBe(testUserId)
      expect(O.getOrNull(policies[0]?.resourceId)).toBe(testDocumentId)
    })

    it("returns empty array when none match", async () => {
      const other = await createTestUser(testDb.db, { email: "other@example.com" })
      const policies = await E.runPromise(repo.findByUserAndResource(other.id as any, testDocumentId as any)) as readonly AccessPolicyEntity[]
      expect(policies.length).toBe(0)
    })
  })

  describe("exists (READ)", () => {
    it("returns true when policy exists", async () => {
      const p = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      await E.runPromise(repo.save(p))

      const exists = await E.runPromise(repo.exists(p.id))
      expect(exists).toBe(true)
    })

    it("returns false when policy does not exist", async () => {
      const exists = await E.runPromise(repo.exists(crypto.randomUUID()))
      expect(exists).toBe(false)
    })
  })

  describe("save (UPDATE)", () => {
    it("updates existing policy actions", async () => {
      const p = createEntitySync(makeUserPolicyData(testUserId, testDocumentId, { actions: ["read"] }))
      const saved = await E.runPromise(repo.save(p))

      // Change actions to include "manage"
      const updated = createEntitySync(
        makeUserPolicyData(testUserId, testDocumentId, { id: (saved as AccessPolicyEntity).id, actions: ["read", "manage"] })
      )
      const result = await E.runPromise(repo.save(updated)) as AccessPolicyEntity

      expect(result.id).toBe((saved as AccessPolicyEntity).id)
      expect(result.actions).toEqual(["read", "manage"])
    })
  })

  describe("delete (DELETE)", () => {
    it("deletes by id", async () => {
      const p = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      await E.runPromise(repo.save(p))

      const deleted = await E.runPromise(repo.delete(p.id))
      expect(deleted).toBe(true)

      const foundOpt = await E.runPromise(repo.findById(p.id)) as O.Option<AccessPolicyEntity> as O.Option<AccessPolicyEntity>
      expect(O.isNone(foundOpt)).toBe(true)
    })

    it("returns false when deleting non-existent id", async () => {
      const deleted = await E.runPromise(repo.delete(crypto.randomUUID()))
      expect(deleted).toBe(false)
    })
  })

  describe("deleteByResourceId (DELETE)", () => {
    it("bulk deletes all policies for a resource", async () => {
      const other = await createTestUser(testDb.db, { email: "user2@example.com" })

      const p1 = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      const p2 = createEntitySync(makeUserPolicyData(other.id, testDocumentId, { actions: ["read"] }))

      await E.runPromise(repo.save(p1))
      await E.runPromise(repo.save(p2))

      const count = await E.runPromise(repo.deleteByResourceId(testDocumentId as any))
      expect(count).toBe(2)

      const remaining = await E.runPromise(repo.findByResourceId(testDocumentId as any)) as readonly AccessPolicyEntity[]
      expect(remaining.length).toBe(0)
    })
  })

  describe("deleteByUserId (DELETE)", () => {
    it("bulk deletes all policies for a user", async () => {
      const versionId2 = crypto.randomUUID()
      const doc2 = await createTestDocument(testDb.db, testUserId, {
        title: "Second Doc",
        currentVersionId: versionId2
      })

      const p1 = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      const p2 = createEntitySync(makeUserPolicyData(testUserId, doc2.id, { actions: ["read"] }))

      await E.runPromise(repo.save(p1))
      await E.runPromise(repo.save(p2))

      const count = await E.runPromise(repo.deleteByUserId(testUserId as any))
      expect(count).toBe(2)

      const remaining = await E.runPromise(repo.findBySubject("user", testUserId as any)) as readonly AccessPolicyEntity[]
      expect(remaining.length).toBe(0)
    })
  })

  describe("Cascade Delete (FK)", () => {
    it("cascades when parent document is deleted", async () => {
      const versionId = crypto.randomUUID()
      const doc = await createTestDocument(testDb.db, testUserId, {
        title: "Cascade Doc",
        currentVersionId: versionId
      })

      const p = createEntitySync(makeUserPolicyData(testUserId, doc.id))
      await E.runPromise(repo.save(p))

      // Delete parent document (schema must have ON DELETE CASCADE)
      const { documents } = testDb.db._.fullSchema as any
      await testDb.db.delete(documents).where(eq(documents.id, doc.id))

      // Policy should be gone
      const foundOpt = await E.runPromise(repo.findById(p.id)) as O.Option<AccessPolicyEntity> as O.Option<AccessPolicyEntity>
      expect(O.isNone(foundOpt)).toBe(true)
    })

    it("cascades when subject user is deleted", async () => {
      const u2 = await createTestUser(testDb.db, { email: "cascade-user@example.com" })
      const p = createEntitySync(makeUserPolicyData(u2.id, testDocumentId))
      await E.runPromise(repo.save(p))

      const { users } = testDb.db._.fullSchema as any
      await testDb.db.delete(users).where(eq(users.id, u2.id))

      const foundOpt = await E.runPromise(repo.findById(p.id)) as O.Option<AccessPolicyEntity> as O.Option<AccessPolicyEntity>
      expect(O.isNone(foundOpt)).toBe(true)
    })
  })

  describe("Serialization round-trip", () => {
    it("serializes + deserializes user policy correctly", async () => {
      const original = createEntitySync(makeUserPolicyData(testUserId, testDocumentId, { actions: ["read", "manage"] }))
      const saved = await E.runPromise(repo.save(original))
      const fetchedOpt = await E.runPromise(repo.findById((saved as AccessPolicyEntity).id)) as O.Option<AccessPolicyEntity> as O.Option<AccessPolicyEntity>

      const fetched = O.getOrThrow(fetchedOpt)
      expect(fetched.id).toBe(original.id)
      expect(fetched.subjectType).toBe("user")
      expect(fetched.subjectId).toBe(testUserId)
      expect(O.getOrNull(fetched.resourceId)).toBe(testDocumentId)
      expect(fetched.actions).toEqual(["read", "manage"])
    })

    it("serializes + deserializes role policy correctly", async () => {
      const original = createEntitySync(makeRolePolicyData("ADMIN", testDocumentId))
      const saved = await E.runPromise(repo.save(original))
      const fetchedOpt = await E.runPromise(repo.findById((saved as AccessPolicyEntity).id)) as O.Option<AccessPolicyEntity> as O.Option<AccessPolicyEntity>

      const fetched = O.getOrThrow(fetchedOpt)
      expect(fetched.subjectType).toBe("role")
      expect(fetched.name).toBe("ADMIN")
      expect(fetched.subjectId).toBeUndefined()
    })
  })

  describe("Index usage (smoke)", () => {
    it("query by resourceId uses an index scan (if index exists)", async () => {
      const p = createEntitySync(makeUserPolicyData(testUserId, testDocumentId))
      await E.runPromise(repo.save(p))

      // Plan check (best-effort; schema must have a matching index)
      const result = await testDb.db.execute(
        sql`EXPLAIN (COSTS OFF, FORMAT TEXT) SELECT * FROM access_policies WHERE resource_id = ${testDocumentId} LIMIT 1`
      )
      const rows = ((result as any).rows ?? result) as Array<Record<string, string>>
      const plan = rows.map(r => Object.values(r)[0] as string).join("\n")
      expect(/Index Scan|Bitmap Index Scan/i.test(plan)).toBe(true)
      expect(/Seq Scan/i.test(plan)).toBe(false)
    })
  })
})
