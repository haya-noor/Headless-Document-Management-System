import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { Effect as E, Option as O, Exit } from "effect"
import { eq, sql } from "drizzle-orm"

import { DocumentVersionRepository } from "../../../src/app/infrastructure/repositories/implementations/d-version.repository"

// Test DB harness (adjust to your paths if needed)
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser,
  createTestDocument,
  type TestDatabase
} from "../setup/database"

// Factory + helpers
import { createTestDocumentVersionEntity } from "../../factories/d-version.factory"
import { makeDocumentIdSync, makeDocumentVersionIdSync, makeUserIdSync } from "../../../src/app/domain/shared/uuid"

// Helper to handle Effect.runPromise with proper typing
const runPromise = async <T>(effect: E.Effect<T, any, any>): Promise<T> => {
  return await runPromise(effect) as T
}

describe("DocumentVersionRepository Integration Tests", () => {
  let testDb: TestDatabase
  let versionRepository: DocumentVersionRepository
  let testUserId: string
  let testDocumentId: string

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    versionRepository = new DocumentVersionRepository(testDb.db)
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    await cleanupDatabase(testDb.db)

    // Prerequisites: a user and a document
    const user = await createTestUser(testDb.db, { email: "version-owner@example.com" })
    testUserId = user.id

    const bootstrapVersionId = crypto.randomUUID()
    const document = await createTestDocument(testDb.db, testUserId, {
      title: "Document for Versions",
      currentVersionId: bootstrapVersionId
    })
    testDocumentId = document.id
  })

  // ---------------- SAVE (CREATE) ----------------

  describe("save (CREATE)", () => {
    it("saves a new document version and returns the entity", async () => {
      const versionEntity = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "a".repeat(64),
          fileKey: "documents/test-file.pdf",
          mimeType: "application/pdf",
          size: 1024 * 500,
          createdBy: { _tag: "Some", value: testUserId }
        })
      )

      const saved = await runPromise(versionRepository.save(versionEntity)) as any

      expect(saved.id).toBe(versionEntity.id)
      expect(saved.documentId).toBe(testDocumentId)
      expect(saved.version).toBe(1)
      expect(saved.checksum).toBe("a".repeat(64))
      expect(O.isSome(saved.createdBy)).toBe(true)
      expect(O.getOrNull(saved.createdBy)).toBe(testUserId)
    })

    it("saves version without createdBy", async () => {
      const versionEntity = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "b".repeat(64),
          fileKey: "documents/anon-file.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "None" }
        })
      )

      const saved = await runPromise(versionRepository.save(versionEntity)) as any
      expect(O.isNone(saved.createdBy)).toBe(true)
    })

    it("saves multiple versions for the same document", async () => {
      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "c".repeat(64),
          fileKey: "documents/v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "Some", value: testUserId }
        })
      )
      const v2 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 2,
          checksum: "d".repeat(64),
          fileKey: "documents/v2.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "Some", value: testUserId }
        })
      )

      await runPromise(versionRepository.save(v1))
      await runPromise(versionRepository.save(v2))

      const versions = await runPromise(versionRepository.findByDocumentId(makeDocumentIdSync(testDocumentId))) as any[] as any[]
      expect(versions.length).toBe(2)
    })

    it("enforces unique (documentId, version)", async () => {
      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "e".repeat(64),
          fileKey: "documents/duplicate-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      const v1dup = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "f".repeat(64),
          fileKey: "documents/duplicate-v1-again.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "None" }
        })
      )

      await runPromise(versionRepository.save(v1))
      const result = E.runSyncExit(versionRepository.save(v1dup))
      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  // ---------------- FIND BY ID ----------------

  describe("findById (READ)", () => {
    it("finds version by id", async () => {
      const entity = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "1".repeat(64),
          fileKey: "documents/find-by-id.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      await runPromise(versionRepository.save(entity))

      const foundOpt = await runPromise(versionRepository.findById(entity.id)) as O.Option<any>
      expect(O.isSome(foundOpt)).toBe(true)

      const found = O.getOrThrow(foundOpt)
      expect(found.id).toBe(entity.id)
      expect(found.version).toBe(1)
    })

    it("returns None for non-existent id", async () => {
      const nonExistentId = makeDocumentVersionIdSync(crypto.randomUUID())
      const foundOpt = await runPromise(versionRepository.findById(nonExistentId))
      expect(O.isNone(foundOpt)).toBe(true)
    })
  })

  // ---------------- FIND BY DOC + VERSION ----------------

  describe("findByDocumentIdAndVersion (READ)", () => {
    it("finds version by document id and version number", async () => {
      const entity = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 3,
          checksum: "2".repeat(64),
          fileKey: "documents/v3.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      await runPromise(versionRepository.save(entity))

      const foundOpt = await runPromise(
        versionRepository.findByDocumentIdAndVersion(makeDocumentIdSync(testDocumentId), 3)
      ) as O.Option<any>
      expect(O.isSome(foundOpt)).toBe(true)

      const found = O.getOrThrow(foundOpt)
      expect(found.documentId).toBe(testDocumentId)
      expect(found.version).toBe(3)
    })

    it("returns None for non-existent version number", async () => {
      const foundOpt = await runPromise(
        versionRepository.findByDocumentIdAndVersion(makeDocumentIdSync(testDocumentId), 99)
      ) as O.Option<any>
      expect(O.isNone(foundOpt)).toBe(true)
    })
  })

  // ---------------- FIND ALL BY DOC ----------------

  describe("findByDocumentId (READ)", () => {
    it("finds all versions for a document", async () => {
      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "3".repeat(64),
          fileKey: "documents/doc-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      const v2 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 2,
          checksum: "4".repeat(64),
          fileKey: "documents/doc-v2.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "None" }
        })
      )
      const v3 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 3,
          checksum: "5".repeat(64),
          fileKey: "documents/doc-v3.pdf",
          mimeType: "application/pdf",
          size: 3072,
          createdBy: { _tag: "None" }
        })
      )

      await runPromise(versionRepository.save(v1))
      await runPromise(versionRepository.save(v2))
      await runPromise(versionRepository.save(v3))

      const versions = await runPromise(
        versionRepository.findByDocumentId(makeDocumentIdSync(testDocumentId))
      )

      expect(versions.length).toBe(3)
      expect(versions.map(v => v.version).sort()).toEqual([1, 2, 3])
    })

    it("returns empty array when no versions exist", async () => {
      const newVersionId = crypto.randomUUID()
      const newDoc = await createTestDocument(testDb.db, testUserId, {
        title: "No Versions Doc",
        currentVersionId: newVersionId
      })

      const versions = await runPromise(
        versionRepository.findByDocumentId(makeDocumentIdSync(newDoc.id))
      )
      expect(versions.length).toBe(0)
    })
  })

  // ---------------- LATEST BY DOC ----------------

  describe("findLatestByDocumentId (READ)", () => {
    it("returns the latest version by document id", async () => {
      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "6".repeat(64),
          fileKey: "documents/latest-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      const v2 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 2,
          checksum: "7".repeat(64),
          fileKey: "documents/latest-v2.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "None" }
        })
      )
      const v3 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 3,
          checksum: "8".repeat(64),
          fileKey: "documents/latest-v3.pdf",
          mimeType: "application/pdf",
          size: 3072,
          createdBy: { _tag: "None" }
        })
      )

      await runPromise(versionRepository.save(v1))
      await runPromise(versionRepository.save(v2))
      await runPromise(versionRepository.save(v3))

      const latestOpt = await runPromise(
        versionRepository.findLatestByDocumentId(makeDocumentIdSync(testDocumentId))
      )

      expect(O.isSome(latestOpt)).toBe(true)
      const latest = O.getOrThrow(latestOpt)
      expect(latest.version).toBe(3)
    })

    it("returns None for document with no versions", async () => {
      const newVersionId = crypto.randomUUID()
      const newDoc = await createTestDocument(testDb.db, testUserId, {
        title: "No Versions Doc 2",
        currentVersionId: newVersionId
      })

      const latestOpt = await runPromise(
        versionRepository.findLatestByDocumentId(makeDocumentIdSync(newDoc.id))
      )
      expect(O.isNone(latestOpt)).toBe(true)
    })
  })

  // ---------------- NEXT VERSION NUMBER ----------------

  describe("getNextVersionNumber (READ)", () => {
    it("returns 1 for document with no versions", async () => {
      const next = await runPromise(
        versionRepository.getNextVersionNumber(makeDocumentIdSync(testDocumentId))
      )
      expect(next).toBe(1)
    })

    it("returns next number after existing versions", async () => {
      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "9".repeat(64),
          fileKey: "documents/next-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      const v2 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 2,
          checksum: "a".repeat(64),
          fileKey: "documents/next-v2.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "None" }
        })
      )

      await runPromise(versionRepository.save(v1))
      await runPromise(versionRepository.save(v2))

      const next = await runPromise(
        versionRepository.getNextVersionNumber(makeDocumentIdSync(testDocumentId))
      )
      expect(next).toBe(3)
    })
  })

  // ---------------- EXISTS ----------------

  describe("exists (READ)", () => {
    it("returns true when version exists", async () => {
      const entity = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "b".repeat(64),
          fileKey: "documents/exists.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      await runPromise(versionRepository.save(entity))

      const exists = await runPromise(versionRepository.exists(entity.id))
      expect(exists).toBe(true)
    })

    it("returns false when version does not exist", async () => {
      const nonExistentId = makeDocumentVersionIdSync(crypto.randomUUID())
      const exists = await runPromise(versionRepository.exists(nonExistentId))
      expect(exists).toBe(false)
    })
  })

  // ---------------- DELETE ----------------

  describe("delete (DELETE)", () => {
    it("deletes version by id", async () => {
      const entity = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "c".repeat(64),
          fileKey: "documents/delete-me.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      await runPromise(versionRepository.save(entity))

      const deleted = await runPromise(versionRepository.delete(entity.id))
      expect(deleted).toBe(true)

      const foundOpt = await runPromise(versionRepository.findById(entity.id)) as O.Option<any>
      expect(O.isNone(foundOpt)).toBe(true)
    })

    it("returns false when deleting non-existent version", async () => {
      const nonExistentId = makeDocumentVersionIdSync(crypto.randomUUID())
      const deleted = await runPromise(versionRepository.delete(nonExistentId))
      expect(deleted).toBe(false)
    })
  })

  // ---------------- CASCADE ----------------

  describe("Cascade Delete", () => {
    it("cascades delete when parent document is deleted", async () => {
      const boot = crypto.randomUUID()
      const newDoc = await createTestDocument(testDb.db, testUserId, {
        title: "Cascade Test Doc",
        currentVersionId: boot
      })

      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: newDoc.id,
          version: 1,
          checksum: "d".repeat(64),
          fileKey: "documents/cascade-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      await runPromise(versionRepository.save(v1))

      // Delete parent document (assumes FK ON DELETE CASCADE)
      const { documents: docsTable } = testDb.db._.fullSchema as any
      await testDb.db.delete(docsTable).where(eq((docsTable as any).id, newDoc.id))

      const foundOpt = await runPromise(versionRepository.findById(v1.id))
      expect(O.isNone(foundOpt)).toBe(true)
    })
  })

  // ---------------- ROUND-TRIP ----------------

  describe("Serialization Round-trip", () => {
    it("serializes/deserializes version with all fields", async () => {
      const original = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 5,
          checksum: "e".repeat(64),
          fileKey: "documents/roundtrip.pdf",
          mimeType: "application/pdf",
          size: 1024 * 1024 * 2,
          createdBy: { _tag: "Some", value: testUserId }
        })
      )

      const saved = await runPromise(versionRepository.save(original))
      const fetchedOpt = await runPromise(versionRepository.findById(saved.id))
      const fetched = O.getOrThrow(fetchedOpt)

      expect(fetched.id).toBe(original.id)
      expect(fetched.documentId).toBe(testDocumentId)
      expect(fetched.version).toBe(5)
      expect(fetched.checksum).toBe("e".repeat(64))
      expect(fetched.fileKey).toBe("documents/roundtrip.pdf")
      expect(fetched.mimeType).toBe("application/pdf")
      expect(fetched.size).toBe(1024 * 1024 * 2)
      expect(O.getOrNull(fetched.createdBy)).toBe(testUserId)
    })

    it("handles None createdBy in serialization", async () => {
      const original = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "f".repeat(64),
          fileKey: "documents/no-creator.pdf",
          mimeType: "application/pdf",
          size: 2048,
          createdBy: { _tag: "None" }
        })
      )

      const saved = await runPromise(versionRepository.save(original))
      const fetchedOpt = await runPromise(versionRepository.findById(saved.id))
      const fetched = O.getOrThrow(fetchedOpt)
      expect(O.isNone(fetched.createdBy)).toBe(true)
    })
  })

  // ---------------- INDEX / PLAN (optional) ----------------

  describe("Index Usage and Query Performance", () => {
    it("leverages document_idx when querying by documentId (if index exists)", async () => {
      const v1 = E.runSync(
        createTestDocumentVersionEntity({
          documentId: testDocumentId,
          version: 1,
          checksum: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          fileKey: "documents/perf-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          createdBy: { _tag: "None" }
        })
      )
      await runPromise(versionRepository.save(v1))

      // smoke: query returns rows
      const rows = await runPromise(versionRepository.findByDocumentId(makeDocumentIdSync(testDocumentId))) as any[]
      expect(rows.length).toBeGreaterThan(0)

      // optional: plan shows index usage (schema must actually have an index)
      const result = await testDb.db.execute(
        sql`EXPLAIN (COSTS OFF, FORMAT TEXT) SELECT * FROM document_versions WHERE document_id = ${testDocumentId} LIMIT 1`
      )
      const lines = ((result as any).rows ?? result) as Array<Record<string, string>>
      const plan = lines.map(r => Object.values(r)[0] as string).join("\n")
      expect(/Index Scan|Bitmap Index Scan/i.test(plan)).toBe(true)
      expect(/Seq Scan/i.test(plan)).toBe(false)
    })
  })
})
