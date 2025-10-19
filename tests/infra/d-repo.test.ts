// DocumentRepository Integration Test (Vitest + Docker + Faker + FastCheck)
// -------------------------------------------------------------------------
// ✅ Tests the DocumentRepositoryImpl in isolation from application layer
// ✅ Uses effect/Schema validation to test inputs
// ✅ Randomized input coverage via faker + fast-check
// ✅ Covers create, read, update, delete, pagination, filters, stats


import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { sql } from "drizzle-orm"
import { faker } from "@faker-js/faker"
import * as fc from "fast-check"

import { DocumentRepositoryImpl } from "../../src/app/infrastructure/repositories/implementations/d.repository"
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  cleanupDatabase,
  type TestDatabase,
} from "../setup/database.setup"

import * as S from "@effect/schema/Schema"
import * as Option from "@effect/data/Option"

import { CreateDocumentSchema } from "../../src/app/domain/document/schema"  // adjust relative path

export function generateValidDocumentInput(userId: string, overrides: Partial<any> = {}) {
  const input = {
    uploadedBy: userId,
    filename: `file-${crypto.randomUUID()}.pdf`,
    mimeType: "application/pdf",
    size: 1024,
    checksum: faker.string.hexadecimal({ length: 64 }).slice(2),
    tags: ["test"],
    metadata: { origin: "integration" },
    ...overrides,
  }

  // Schema validation to ensure all fields are correct
  const validation = S.decodeUnknown(CreateDocumentSchema)(input)
  if (validation._tag === "Left") {
    console.error("Invalid test input generated:", input)
    console.error("Schema validation errors:", validation.left)
    throw new Error("CreateDocumentInput failed schema validation")
  }

  return input
}

let db: TestDatabase
let repo: DocumentRepositoryImpl
let userA: string
let userB: string

beforeAll(async () => {
  const setup = await setupTestDatabase()
  db = setup
  repo = new DocumentRepositoryImpl(db.db)
  userA = (await createTestUser(db.db)).id
  userB = (await createTestUser(db.db)).id
}) 


afterAll(async () => {
  await teardownTestDatabase()
})

  // ----------------------------
  // CREATE
  // ----------------------------
  describe("DocumentRepository Integration Tests", { timeout: 10_000 }, () => {
    it("creates a valid document (full input)", async () => {
      const input = generateValidDocumentInput(userA)
      const doc = await repo.create(input)
      expect(doc).toMatchObject({ uploadedBy: userA, mimeType: "application/pdf" })
      expect(doc.filename).toContain(".pdf")
    })

    it("creates with missing optional fields", async () => {
      const input = { ...generateValidDocumentInput(userA), checksum: undefined, tags: undefined, metadata: undefined }
      const doc = await repo.create(input)
      expect(doc.checksum).toBeUndefined()
      expect(doc.tags).toBeUndefined()
      expect(doc.metadata).toBeUndefined()
  })

  /*
  // - findById: retrieves a document by ID
  // - exists: checks whether a document exists
  // - count: counts documents matching a filter
  */
  describe("read operations", () => {
    it("findById / exists / count", async () => {
      const doc = await repo.create(generateValidDocumentInput(userA))
      const found = await repo.findById(doc.id)
      //// Assert that the found document’s ID matches the one we created.
      expect(found?.id).toBe(doc.id)
      //// Verify that the repository reports true when checking existence
      expect(await repo.exists(doc.id)).toBe(true)
      //// Check that the repository reports false for a completely random
    // (nonexistent) UUID — ensuring correct negative behavior.
      expect(await repo.exists(faker.string.uuid())).toBe(false)

      // Count the number of documents uploaded by the current test user.
      const count = await repo.count({ uploadedBy: userA })

      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  // ----------------------------
  // FILTERING & PAGINATION
  // ----------------------------


  describe("filtering + pagination", { timeout: 10000 }, () => {
    beforeEach(async () => {
  if (!userA) throw new Error("userA not initialized")

  console.log("⏳ Seeding documents before test...")
  const start = Date.now()

  try {
        const created = await Promise.all([
          repo.create(generateValidDocumentInput(userA)),
          repo.create(generateValidDocumentInput(userA)),
          repo.create(generateValidDocumentInput(userA)),
        ])
        console.log("✅ Seeded documents:", created.map(d => d.id))
      } catch (error) {
        console.error("❌ Failed to seed documents:", error)
        throw error
      }
    
      console.log("⏱️ Seeding took", Date.now() - start, "ms")
    })


    it("returns filtered documents", async () => {
      const results = await repo.findMany({ uploadedBy: userA })
      expect(results.length).toBeGreaterThan(0)
    })

    it("supports pagination metadata", async () => {
      const res = await repo.findManyPaginated({ page: 1, limit: 2 }, { uploadedBy: userA })
      expect(res.data.length).toBe(2)
      
      expect(res.pagination.total).toBeGreaterThanOrEqual(3)
    })
  })

  // ----------------------------
  // UPDATE & DELETE
  // ----------------------------
  describe("update and delete", () => {
    it("updates fields via update()", async () => {
      const doc = await repo.create(generateValidDocumentInput(userA))
      const updated = await repo.update(doc.id, { filename: "renamed.pdf" })
      expect(updated?.filename).toBe("renamed.pdf")
    })

    it("deletes permanently via delete()", async () => {
      const doc = await repo.create(generateValidDocumentInput(userA))
      const deleted = await repo.delete(doc.id)
      expect(deleted).toBe(true)
      expect(await repo.findById(doc.id)).toBeNull()
    })

    it("soft deletes and restores", async () => {
      const doc = await repo.create(generateValidDocumentInput(userA))
      await repo.softDelete(doc.id)
      expect(await repo.findById(doc.id)).toBeNull()

      await repo.restore(doc.id)
      expect(await repo.findById(doc.id)).not.toBeNull()
    })
  })

  // ----------------------------
  // DUPLICATE DETECTION
  // ----------------------------
  describe("duplicate checksum", () => {
    it("returns multiple documents with same checksum", async () => {
      const checksum = faker.string.hexadecimal({ length: 64 }).slice(2)
      await repo.create(generateValidDocumentInput(userA, { checksum }))
      await repo.create(generateValidDocumentInput(userA, { checksum }))
      const dups = await repo.findDuplicatesByChecksum(checksum)
      expect(dups.length).toBe(2)
    })
  })

  // ----------------------------
  // STATISTICS
  // ----------------------------
  describe("stats", () => {
    it("returns aggregation summary", async () => {
      await repo.create(generateValidDocumentInput(userA))
      await repo.create(generateValidDocumentInput(userA, { mimeType: "text/plain" }))
      const stats = await repo.getDocumentStats()
      expect(stats.totalDocuments).toBeGreaterThan(1)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.documentsByUploader[userA]).toBeGreaterThanOrEqual(1)
    })
  })

  // ----------------------------
  // FAST-CHECK FUZZING
  // ----------------------------
  describe("property-based fuzz (fast-check)", () => {
    it("accepts valid schema-based input", async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const input = generateValidDocumentInput(userId)
          const doc = await repo.create(input)
          expect(doc.id).toMatch(UUID_RE)
          expect(doc.uploadedBy).toBe(userId)
        })
      )
    })
  })
})
