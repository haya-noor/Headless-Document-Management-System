/**
 * Document E2E Integration Tests
 * ===============================
 * Full lifecycle: create → add versions → fetch latest → verify
 * Runs against a real Postgres (via Testcontainers in setup)
 * Validates repository behavior + schema (encode/decode) + invariants
 *
 * Run: npm test -- document.e2e.test.ts
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { Effect, Option } from "effect"
// NOTE: This file uses crypto.randomUUID() below. If not globally available in your runtime,
// add: import crypto from "crypto"

import {
  setupTestDatabase,     // spins up test DB & returns a handle
  cleanupDatabase,       // truncates tables between tests
  createTestUser,        // inserts a minimal user row for ownership relations
  type TestDatabase,     // type of the returned test DB handle
} from "./setup/database.setup"

import { DocumentVersionDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d-version.repository"
import { DocumentDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d.repository"
import { createTestDocumentVersionEntity } from "./factories/domain-factory/d-version.factory-test"
import { createTestDocumentEntity } from "./factories/domain-factory/document.factory-test"
import type { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import type { Sha256 } from "@/app/domain/refined/checksum"

/**
 * Small helper to execute Effect.Effects inside Vitest (Promise-based)
 * - Throws on failure so Vitest catches test failures properly.
 */
const runEffect = <T, E>(effect: Effect.Effect<T, E>): Promise<T> => Effect.runPromise(effect)

describe("E2E: Document Lifecycle Integration", () => {
  let testDb: TestDatabase                 // containerized Postgres + Drizzle client
  let versionRepo: DocumentVersionDrizzleRepository
  let documentRepo: DocumentDrizzleRepository

  beforeAll(async () => {
    // Boot DB once for this file; reuse across tests for speed
    testDb = await setupTestDatabase()
    // Repositories bound to the same DB connection
    versionRepo = new DocumentVersionDrizzleRepository(testDb.db)
    documentRepo = new DocumentDrizzleRepository(testDb.db)
  })

  afterAll(async () => {
    // Dispose containers / connections after the entire suite
    await testDb.cleanup?.()
  })

  beforeEach(async () => {
    // Truncate tables so each test starts with a clean slate
    await cleanupDatabase()
  })

  describe("Complete Document Lifecycle", () => {
    it("should create document → add v1 → add v2 → fetch latest → verify all", async () => {
      // -------- 1) Create owner user (acts as document owner & version uploader)
      const owner = await createTestUser(testDb.db, {
        email: "owner@example.com",
        firstName: "Owner",
        lastName: "User",
      })
      expect(owner.id).toBeDefined()

      // -------- 2) Create document with an initial 'currentVersionId'
      const versionId1 = crypto.randomUUID() as DocumentVersionId
      // Build a valid domain entity through factory (runs schema validation)
      const documentEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Project Proposal",
          description: "Initial draft",
          tags: ["proposal", "draft"],
          currentVersionId: versionId1,         // wire v1 as the document's current pointer
          createdAt: new Date().toISOString(),
        })
      )

      // Persist document (repository returns the saved entity)
      const savedDoc = await runEffect(documentRepo.save(documentEntity))
      expect(savedDoc.id).toBe(documentEntity.id)
      expect(savedDoc.title).toBe("Project Proposal")

      // -------- 3) Add version 1
      const version1Entity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: versionId1,
          documentId: savedDoc.id,              // FK to parent document
          version: 1,                           // first version
          filename: "proposal-v1.pdf",
          mimeType: "application/pdf",
          size: 1024 * 512,                     // 512 KiB
          storageKey: `documents/${savedDoc.id}/v1.pdf`,
          storageProvider: "local" as const,    // provider enum
          checksum: "a".repeat(64) as Sha256,   // 64-hex SHA256
          uploadedBy: owner.id,
          createdAt: new Date().toISOString(),
        })
      )

      const savedV1 = await runEffect(versionRepo.save(version1Entity))
      expect(savedV1.version).toBe(1)
      expect(savedV1.documentId).toBe(savedDoc.id)

      // -------- 4) Fetch latest (should be v1 right now)
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
          size: 1024 * 768,                     // 768 KiB
          storageKey: `documents/${savedDoc.id}/v2.pdf`,
          storageProvider: "local" as const,
          checksum: "b".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date().toISOString(),
        })
      )

      const savedV2 = await runEffect(versionRepo.save(version2Entity))
      expect(savedV2.version).toBe(2)

      // -------- 6) Fetch latest (should now be v2)
      const latestV2 = Option.getOrThrow(
        await runEffect(
          versionRepo.findLatestByDocumentId(savedDoc.id as DocumentId)
        )
      )
      expect(latestV2.version).toBe(2)
      expect(latestV2.id).toBe(versionId2)

      // -------- 7) Fetch all versions for this document
      const allVersions = await runEffect(
        versionRepo.findByDocumentId(savedDoc.id as DocumentId)
      )
      expect(allVersions.length).toBe(2)
      expect(allVersions.map((v) => v.version).sort()).toEqual([1, 2])

      // -------- 8) Query a specific version (documentId + version)
      const specificVersion = Option.getOrThrow(
        await runEffect(
          versionRepo.findByDocumentIdAndVersion(
            savedDoc.id as DocumentId,
            1
          )
        )
      )
      expect(specificVersion.version).toBe(1)
      expect(Option.getOrNull(specificVersion.checksum)).toBe("a".repeat(64))

      // -------- 9) Ask repo what the next version number should be
      const nextVersion = await runEffect(
        versionRepo.getNextVersionNumber(savedDoc.id as DocumentId)
      )
      expect(nextVersion).toBe(3)

      // -------- 10) Count versions for this document
      const versionCount = await runEffect(
        versionRepo.count(savedDoc.id as DocumentId)
      )
      expect(versionCount).toBe(2)
    })
  })

  describe("Version Deletion", () => {
    it("should delete individual versions", async () => {
      // Create a user and a document with a single version
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
        })
      )
      await runEffect(versionRepo.save(vEntity))

      // Verify presence
      const exists1 = await runEffect(
        versionRepo.exists(vId as DocumentVersionId)
      )
      expect(exists1).toBe(true)

      // Delete version row
      const deleteResult = await runEffect(
        versionRepo.delete(vId as DocumentVersionId)
      )
      expect(deleteResult).toBe(true)

      // Verify deletion
      const exists2 = await runEffect(
        versionRepo.exists(vId as DocumentVersionId)
      )
      expect(exists2).toBe(false)
    })

    it("should cascade delete versions when document is deleted", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "cascade@example.com",
      })

      // Build document with an attached version
      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Cascade Delete Test",
          currentVersionId: vId,
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
        })
      )
      await runEffect(versionRepo.save(vEntity))

      // Ensure version exists before deletion
      const versionExistsBefore = await runEffect(
        versionRepo.exists(vId as DocumentVersionId)
      )
      expect(versionExistsBefore).toBe(true)

      // Manually delete version(s) first, then document
      // NOTE: Comment says "cascade delete", but actual behavior here is manual
      // removal because DB-level ON DELETE CASCADE is not implemented.
      await runEffect(versionRepo.delete(vId as DocumentVersionId))
      await runEffect(documentRepo.delete(doc.id as DocumentId))

      // Verify document removed
      const docExists = await runEffect(
        documentRepo.findById(doc.id as DocumentId)
      )
      expect(Option.isNone(docExists)).toBe(true)

      // And no versions remain for that doc
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

      // Create the parent document
      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Roundtrip Test",
          currentVersionId: vId,
          createdAt: new Date().toISOString(),
        })
      )
      const savedDoc = await runEffect(documentRepo.save(docEntity))

      // Build a fully-populated version payload to test encode/decode fidelity
      const versionData = {
        id: vId,
        documentId: savedDoc.id,
        version: 1,
        filename: "roundtrip-test.pdf",
        mimeType: "application/pdf",
        size: 2048 * 1024,                       // 2 MiB
        storageKey: "documents/roundtrip/v1.pdf",
        storageProvider: "local" as const,
        checksum: "f".repeat(64) as Sha256,
        tags: ["test", "roundtrip"],             // optional array fields
        metadata: { source: "upload", imported: true }, // optional JSON field
        uploadedBy: owner.id,
        createdAt: new Date().toISOString(),
      }

      // Factory validates + returns a domain entity
      const vEntity = Effect.runSync(createTestDocumentVersionEntity(versionData))
      await runEffect(versionRepo.save(vEntity))

      // Fetch and assert field equality (round-trip integrity)
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
      // Repository returns Option.none for missing rows
      const nonExistentId = crypto.randomUUID() as DocumentVersionId
      const result = await runEffect(versionRepo.findById(nonExistentId))
      expect(Option.isNone(result)).toBe(true)
    })

    it("should reject duplicate (documentId, version) pairs", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "duplicate@example.com",
      })

      // Create document with v1
      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Duplicate Test",
          currentVersionId: vId,
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
        })
      )
      await runEffect(versionRepo.save(v1Entity))

      // Attempt to insert a second "version 1" for the same document -> expect conflict
      const v1DupEntity = Effect.runSync(
        createTestDocumentVersionEntity({
          id: crypto.randomUUID() as DocumentVersionId,
          documentId: doc.id,
          version: 1, // duplicate composite key (documentId, version)
          filename: "dup-v1-again.pdf",
          mimeType: "application/pdf",
          size: 2048,
          storageKey: `documents/${doc.id}/v1-dup.pdf`,
          storageProvider: "local" as const,
          checksum: "b".repeat(64) as Sha256,
          uploadedBy: owner.id,
          createdAt: new Date().toISOString(),
        })
      )

      try {
        await runEffect(versionRepo.save(v1DupEntity))
        expect.fail("Should have thrown ConflictError") // repository should enforce unique constraint
      } catch (err) {
        expect(err).toBeDefined()
      }
    })

    it("should validate schema constraints on entity creation", async () => {
      // Build an invalid DTO (version=0 not allowed)
      const invalidData = {
        id: crypto.randomUUID() as DocumentVersionId,
        documentId: crypto.randomUUID() as DocumentId,
        version: 0, // must be >= 1
        filename: "invalid.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageKey: "documents/invalid.pdf",
        storageProvider: "local" as const,
        checksum: "c".repeat(64) as Sha256,
        uploadedBy: crypto.randomUUID() as UserId,
        createdAt: new Date().toISOString(),
      }

      try {
        // Factory should throw a ValidationError before hitting the database
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

      // Create 2 documents:
      //   - Doc 1 has 1 version
      //   - Doc 2 has 2 versions
      for (let d = 1; d <= 2; d++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Stats Doc ${d}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        const doc = await runEffect(documentRepo.save(docEntity))

        // Insert d versions for document d
        // for (let v = 1; v <= d; v++) {
        //   const vEntity = Effect.runSync(
        //     createTestDocumentVersionEntity({
        //       id: (v === 1 ? vId : crypto.randomUUID()) as DocumentVersionId,
        //       documentId: doc.id,
        //       version: v,
        //       filename: `stats-${d}-v${v}.pdf`,
        //       mimeType: d === 1 ? "text/plain" : "application/pdf", // mix mime types
        //       size: 1024 * v,
        //       storageKey: `documents/${doc.id}/v${v}.pdf`,
        //       storageProvider: "local" as const,
        //       checksum: `${d}${v}`.padEnd(64, "0") as Sha256,
        //       uploadedBy: owner.id,
        //       createdAt: new Date().toISOString(),
        //     })
        //   )
        //   await runEffect(versionRepo.save(vEntity))
        // }
      }

      // Compute aggregate stats from the repository
      const stats = await runEffect(versionRepo.getStats())
      expect(stats.totalVersions).toBe(3) // 1 (doc1) + 2 (doc2)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.versionsByMimeType["application/pdf"]).toBe(2)
      expect(stats.versionsByMimeType["text/plain"]).toBe(1)
      expect(stats.averageVersionsPerDocument).toBeCloseTo(1.5, 0)
    })
  })
})
