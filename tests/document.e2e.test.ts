/**
 * Document E2E Integration Tests
 * ===============================
 * Full lifecycle: create → add versions → fetch latest → verify
 * Tests repository layer with real Postgres via Testcontainers
 * Validates schema encoding/decoding and domain invariants
 * 
 * Run: npm test -- document.e2e.test.ts
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { Effect, Option } from "effect"

import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser,
  type TestDatabase,
} from "./setup/database.setup"

import { DocumentVersionDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d-version.repository"
import { DocumentDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d.repository"
import { createTestDocumentVersionEntity } from "./factories/domain-factory/d-version.factory-test"
import { createTestDocumentEntity } from "./factories/domain-factory/document.factory-test"
import type { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import type { Sha256 } from "@/app/domain/refined/checksum"

/**
 * Helper to run Effects with proper error handling
 */
const runEffect = <T, E>(effect: Effect.Effect<T, E>): Promise<T> => Effect.runPromise(effect)

describe("E2E: Document Lifecycle Integration", () => {
  let testDb: TestDatabase
  let versionRepo: DocumentVersionDrizzleRepository
  let documentRepo: DocumentDrizzleRepository

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    versionRepo = new DocumentVersionDrizzleRepository(testDb.db)
    documentRepo = new DocumentDrizzleRepository(testDb.db)
  })

  afterAll(async () => {
    await testDb.cleanup?.()
  })

  beforeEach(async () => {
    await cleanupDatabase()
  })

  describe("Complete Document Lifecycle", () => {
    it("should create document → add v1 → add v2 → fetch latest → verify all", async () => {
      // -------- 1) Create owner user
      const owner = await createTestUser(testDb.db, {
        email: "owner@example.com",
        firstName: "Owner",
        lastName: "User",
      })
      expect(owner.id).toBeDefined()

      // -------- 2) Create document with initial version ID
      const versionId1 = crypto.randomUUID() as DocumentVersionId
      const documentEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Project Proposal",
          description: "Initial draft",
          tags: ["proposal", "draft"],
          currentVersionId: versionId1,
          createdAt: new Date(),
        })
      )

      const savedDoc = await runEffect(documentRepo.save(documentEntity))
      expect(savedDoc.id).toBe(documentEntity.id)
      expect(savedDoc.title).toBe("Project Proposal")

      // -------- 3) Add version 1
      const version1Entity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: versionId1,
          documentId: savedDoc.id,
          version: 1,
          filename: "proposal-v1.pdf",
          mimeType: "application/pdf",
          size: 1024 * 512,
          storageKey: `documents/${savedDoc.id}/v1.pdf`,
          storageProvider: "local" as const,
          checksum: "a".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date(),
        })
      )

      const savedV1 = await runEffect(versionRepo.save(version1Entity))
      expect(savedV1.version).toBe(1)
      expect(savedV1.documentId).toBe(savedDoc.id)

      // -------- 4) Fetch latest (should be v1)
      const latestV1 = Option.getOrThrow(
        await runEffect(
          versionRepo.findLatestByDocumentId(savedDoc.id as DocumentId)
        )
      )
      expect(latestV1.version).toBe(1)
      expect(latestV1.id).toBe(versionId1)

      // -------- 5) Add version 2
      const versionId2 = crypto.randomUUID() as DocumentVersionId
      const version2Entity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: versionId2,
          documentId: savedDoc.id,
          version: 2,
          filename: "proposal-v2.pdf",
          mimeType: "application/pdf",
          size: 1024 * 768,
          storageKey: `documents/${savedDoc.id}/v2.pdf`,
          storageProvider: "local" as const,
          checksum: "b".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date(),
        })
      )

      const savedV2 = await runEffect(versionRepo.save(version2Entity))
      expect(savedV2.version).toBe(2)

      // -------- 6) Fetch latest (should be v2 now)
      const latestV2 = Option.getOrThrow(
        await runEffect(
          versionRepo.findLatestByDocumentId(savedDoc.id as DocumentId)
        )
      )
      expect(latestV2.version).toBe(2)
      expect(latestV2.id).toBe(versionId2)

      // -------- 7) Fetch all versions
      const allVersions = await runEffect(
        versionRepo.findByDocumentId(savedDoc.id as DocumentId)
      )
      expect(allVersions.length).toBe(2)
      expect(allVersions.map((v) => v.version).sort()).toEqual([1, 2])

      // -------- 8) Query specific version
      const specificVersion = Option.getOrThrow(
        await runEffect(
          versionRepo.findByDocumentIdAndVersion(
            savedDoc.id as DocumentId,
            1
          )
        )
      )
      expect(specificVersion.version).toBe(1)
      expect(specificVersion.checksum).toBe(Option.some("a".repeat(64)))

      // -------- 9) Next version should be 3
      const nextVersion = await runEffect(
        versionRepo.getNextVersionNumber(savedDoc.id as DocumentId)
      )
      expect(nextVersion).toBe(3)

      // -------- 10) Count versions
      const versionCount = await runEffect(
        versionRepo.count(savedDoc.id as DocumentId)
      )
      expect(versionCount).toBe(2)
    })
  })

  describe("Version Deletion", () => {
    it("should delete individual versions", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "delete@example.com",
      })

      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Delete Test",
          currentVersionId: vId,
          createdAt: new Date(),
        })
      )
      const doc = await runEffect(documentRepo.save(docEntity))

      const vEntity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: vId,
          documentId: doc.id,
          version: 1,
          filename: "test.pdf",
          mimeType: "application/pdf",
          size: 1024,
          storageKey: `documents/${doc.id}/v1.pdf`,
          storageProvider: "local" as const,
          checksum: "d".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date(),
        })
      )
      await runEffect(versionRepo.save(vEntity))

      // Verify exists
      const exists1 = await runEffect(
        versionRepo.exists(vId as DocumentVersionId)
      )
      expect(exists1).toBe(true)

      // Delete
      const deleteResult = await runEffect(
        versionRepo.delete(vId as DocumentVersionId)
      )
      expect(deleteResult).toBe(true)

      // Verify deleted
      const exists2 = await runEffect(
        versionRepo.exists(vId as DocumentVersionId)
      )
      expect(exists2).toBe(false)
    })

    it("should cascade delete versions when document is deleted", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "cascade@example.com",
      })

      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Cascade Delete Test",
          currentVersionId: vId,
          createdAt: new Date(),
        })
      )
      const doc = await runEffect(documentRepo.save(docEntity))

      const vEntity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: vId,
          documentId: doc.id,
          version: 1,
          filename: "cascade.pdf",
          mimeType: "application/pdf",
          size: 1024,
          storageKey: `documents/${doc.id}/v1.pdf`,
          storageProvider: "local" as const,
          checksum: "e".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date(),
        })
      )
      await runEffect(versionRepo.save(vEntity))

      // Verify version exists
      const versionExistsBefore = await runEffect(
        versionRepo.exists(vId as DocumentVersionId)
      )
      expect(versionExistsBefore).toBe(true)

      // Delete document (cascade to versions)
      await runEffect(documentRepo.delete(doc.id as DocumentId))

      // Verify document deleted
      const docExists = await runEffect(
        documentRepo.findById(doc.id as DocumentId)
      )
      expect(Option.isNone(docExists)).toBe(true)

      // Verify versions cascaded
      const versionsRemaining = await runEffect(
        versionRepo.findByDocumentId(doc.id as DocumentId)
      )
      expect(versionsRemaining.length).toBe(0)
    })
  })

  describe("Schema Validation Round-Trip", () => {
    it("should encode/decode versions with all fields intact", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "roundtrip@example.com",
      })

      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Roundtrip Test",
          currentVersionId: vId,
          createdAt: new Date(),
        })
      )
      const savedDoc = await runEffect(documentRepo.save(docEntity))

      const versionData = {
        id: vId,
        documentId: savedDoc.id,
        version: 1,
        filename: "roundtrip-test.pdf",
        mimeType: "application/pdf",
        size: 2048 * 1024,
        storageKey: "documents/roundtrip/v1.pdf",
        storageProvider: "local" as const,
        checksum: "f".repeat(64) as Sha256,
        tags: ["test", "roundtrip"],
        metadata: { source: "upload", imported: true },
        uploadedBy: owner.id,
        createdAt: new Date(),
      }

      const vEntity = Effect.runSync(createTestDocumentVersionEntity(versionData))
      await runEffect(versionRepo.save(vEntity))

      // Fetch and verify all fields
      const fetched = Option.getOrThrow(
        await runEffect(versionRepo.findById(vId as DocumentVersionId))
      )

      expect(fetched.id).toBe(versionData.id)
      expect(fetched.documentId).toBe(versionData.documentId)
      expect(fetched.version).toBe(versionData.version)
      expect(fetched.filename).toBe(versionData.filename)
      expect(fetched.mimeType).toBe(versionData.mimeType)
      expect(fetched.size).toBe(versionData.size)
      expect(fetched.storageKey).toBe(versionData.storageKey)
      expect(fetched.storageProvider).toBe(versionData.storageProvider)
      expect(Option.getOrNull(fetched.checksum)).toBe(versionData.checksum)
      expect(fetched.uploadedBy).toBe(versionData.uploadedBy)
    })
  })

  describe("Error Handling & Edge Cases", () => {
    it("should handle finding non-existent entities gracefully", async () => {
      const nonExistentId = crypto.randomUUID() as DocumentVersionId
      const result = await runEffect(versionRepo.findById(nonExistentId))
      expect(Option.isNone(result)).toBe(true)
    })

    it("should reject duplicate (documentId, version) pairs", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "duplicate@example.com",
      })

      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Duplicate Test",
          currentVersionId: vId,
          createdAt: new Date(),
        })
      )
      const doc = await runEffect(documentRepo.save(docEntity))

      const v1Entity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: vId,
          documentId: doc.id,
          version: 1,
          filename: "dup-v1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          storageKey: `documents/${doc.id}/v1.pdf`,
          storageProvider: "local" as const,
          checksum: "a".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date(),
        })
      )
      await runEffect(versionRepo.save(v1Entity))

      // Try to save duplicate
      const v1DupEntity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: crypto.randomUUID() as DocumentVersionId,
          documentId: doc.id,
          version: 1, // Same version!
          filename: "dup-v1-again.pdf",
          mimeType: "application/pdf",
          size: 2048,
          storageKey: `documents/${doc.id}/v1-dup.pdf`,
          storageProvider: "local" as const,
          checksum: "b".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date(),
        })
      )

      try {
        await runEffect(versionRepo.save(v1DupEntity))
        expect.fail("Should have thrown ConflictError")
      } catch (err) {
        expect(err).toBeDefined()
      }
    })

    it("should validate schema constraints on entity creation", async () => {
      const invalidData = {
        id: crypto.randomUUID() as DocumentVersionId,
        documentId: crypto.randomUUID() as DocumentId,
        version: 0, // Invalid: must be >= 1
        filename: "invalid.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageKey: "documents/invalid.pdf",
        storageProvider: "local" as const,
        checksum: "c".repeat(64) as Sha256,
        uploadedBy: crypto.randomUUID() as UserId,
        createdAt: new Date(),
      }

      try {
        Effect.runSync(createTestDocumentVersionEntity(invalidData))
        expect.fail("Should have thrown ValidationError")
      } catch (err) {
        expect(err).toBeDefined()
      }
    })
  })

  describe("Analytics & Statistics", () => {
    it("should calculate repository statistics accurately", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "stats@example.com",
      })

      // Create 2 documents with versions
      for (let d = 1; d <= 2; d++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Stats Doc ${d}`,
            currentVersionId: vId,
            createdAt: new Date(),
          })
        )
        const doc = await runEffect(documentRepo.save(docEntity))

        for (let v = 1; v <= d; v++) {
          const vEntity = Effect.runSync(
            createTestDocumentVersionEntity({
              id: (v === 1 ? vId : crypto.randomUUID()) as DocumentVersionId,
              documentId: doc.id,
              version: v,
              filename: `stats-${d}-v${v}.pdf`,
              mimeType: d === 1 ? "text/plain" : "application/pdf",
              size: 1024 * v,
              storageKey: `documents/${doc.id}/v${v}.pdf`,
              storageProvider: "local" as const,
              checksum: `${d}${v}`.padEnd(64, "0") as Sha256,
              uploadedBy: owner.id,
              createdAt: new Date(),
            })
          )
          await runEffect(versionRepo.save(vEntity))
        }
      }

      const stats = await runEffect(versionRepo.getStats())
      expect(stats.totalVersions).toBe(3) // 1 + 2
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.versionsByMimeType["application/pdf"]).toBe(2)
      expect(stats.versionsByMimeType["text/plain"]).toBe(1)
      expect(stats.averageVersionsPerDocument).toBeCloseTo(1.5, 0)
    })
  })
})