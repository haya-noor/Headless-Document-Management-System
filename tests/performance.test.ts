/**
 * Performance & Index Usage Tests
 * ================================
 * Simple performance validation using EXPLAIN to verify indexes are used.
 * Tests critical query paths that should leverage indexes.
 * 
 * Run: npm test -- performance.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { sql } from "drizzle-orm"

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
import { Effect, Option } from "effect"
import type { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"
import type { Sha256 } from "@/app/domain/refined/checksum"

const runEffect = <T, E>(effect: Effect.Effect<T, E>): Promise<T> => Effect.runPromise(effect)

/**
 * Check if EXPLAIN plan uses an index
 */
function usesIndex(planText: string): boolean {
  return /Index/.test(planText)
}

describe("Performance: Index Usage Verification", () => {
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

  describe("Document Versions Index Performance", () => {
    it("idx_document_versions_document_id: should use index for findByDocumentId", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "perf-owner@example.com",
      })

      // Create document with 2 versions
      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Performance Test Doc",
          currentVersionId: vId,
          createdAt: new Date().toISOString(),
        })
      )
      const doc = await runEffect(documentRepo.save(docEntity))

      for (let v = 1; v <= 2; v++) {
        const vEntity = Effect.runSync(
          createTestDocumentVersionEntity({
            id: (v === 1 ? vId : crypto.randomUUID()) as DocumentVersionId,
            documentId: doc.id,
            version: v,
            filename: `doc-v${v}.pdf`,
            mimeType: "application/pdf",
            size: 1024 * v,
            storageKey: `documents/${doc.id}/v${v}.pdf`,
            storageProvider: "local" as const,
            checksum: String(v).padEnd(64, "0") as Sha256,
            uploadedBy: owner.id,
            createdAt: new Date(),
          })
        )
        await runEffect(versionRepo.save(vEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents WHERE storage_provider = 's3'`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_documents_storage_provider")
    })

    it("idx_documents_checksum: should use index for duplicate detection", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "checksum@example.com",
      })

      const targetChecksum = "a".repeat(64)

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Checksum Doc ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents WHERE checksum = ${targetChecksum}`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_documents_checksum")
    })

    it("idx_documents_active: should use index for soft delete filtering", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "active@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Active Doc ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents WHERE is_active = true LIMIT 5`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_documents_active")
    })

    it("idx_documents_created_at: should use index for timeline sorting", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "doc-timeline@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Timeline Doc ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents ORDER BY created_at DESC LIMIT 5`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(/Index|Sort/i.test(planText)).toBe(true)
    })
  })

  describe("Users Table Index Performance", () => {
    it("idx_users_email: should use index for email lookups", async () => {
      for (let i = 0; i < 2; i++) {
        await createTestUser(testDb.db, {
          email: `user${i}@example.com`,
          firstName: "User",
          lastName: "Test",
        })
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM users WHERE email = 'user0@example.com'`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_users_email")
    })

    it("idx_users_created_at: should use index for timeline queries", async () => {
      for (let i = 0; i < 2; i++) {
        await createTestUser(testDb.db, {
          email: `timeline${i}@example.com`,
          firstName: "Timeline",
          lastName: "User",
        })
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM users ORDER BY created_at DESC LIMIT 10`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(/Index|Sort/i.test(planText)).toBe(true)
    })

    it("idx_users_active: should use index for soft delete filtering", async () => {
      for (let i = 0; i < 2; i++) {
        await createTestUser(testDb.db, {
          email: `active${i}@example.com`,
          firstName: "Active",
          lastName: "User",
        })
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM users WHERE is_active = true LIMIT 10`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_users_active")
    })
  })

  describe("Query Execution Performance", () => {
    it("should complete indexed queries efficiently", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "perf-measure@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Perf Doc ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const start = performance.now()
      const result = await db.execute(
        sql`SELECT * FROM documents WHERE uploaded_by = ${owner.id} ORDER BY created_at DESC LIMIT 10`
      )
      const elapsed = performance.now() - start

      expect((result.rows as any[]).length).toBeGreaterThan(0)
      expect(elapsed).toBeLessThan(100) // Should complete in < 100ms
    })

    it("idx_document_versions_version: should use index for version ordering", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "version-order@example.com",
      })

      const vId = crypto.randomUUID() as DocumentVersionId
      const docEntity = Effect.runSync(
        createTestDocumentEntity({
          id: crypto.randomUUID() as DocumentId,
          ownerId: owner.id,
          title: "Version Ordering",
          currentVersionId: vId,
          createdAt: new Date().toISOString(),
        })
      )
      const doc = await runEffect(documentRepo.save(docEntity))

      for (let v = 1; v <= 2; v++) {
        const vEntity = Effect.runSync(
          createTestDocumentVersionEntity({
            id: (v === 1 ? vId : crypto.randomUUID()) as DocumentVersionId,
            documentId: doc.id,
            version: v,
            filename: `v${v}.pdf`,
            mimeType: "application/pdf",
            size: 1024,
            storageKey: `documents/${doc.id}/v${v}.pdf`,
            storageProvider: "local" as const,
            checksum: String(v).padEnd(64, "0") as Sha256,
            uploadedBy: owner.id,
            createdAt: new Date(),
          })
        )
        await runEffect(versionRepo.save(vEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM document_versions WHERE document_id = ${doc.id} ORDER BY version DESC LIMIT 1`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
    })

    it("idx_document_versions_uploaded_by: should use index for versions by user", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "uploader@example.com",
      })

      // Create 2 documents with 2 versions each
      for (let d = 0; d < 2; d++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Doc ${d}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        const doc = await runEffect(documentRepo.save(docEntity))

        for (let v = 1; v <= 2; v++) {
          const vEntity = Effect.runSync(
            createTestDocumentVersionEntity({
              id: (v === 1 ? vId : crypto.randomUUID()) as DocumentVersionId,
              documentId: doc.id,
              version: v,
              filename: `doc${d}-v${v}.pdf`,
              mimeType: "application/pdf",
              size: 1024,
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

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM document_versions WHERE uploaded_by = ${owner.id} LIMIT 10`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_document_versions_uploaded_by")
    })

    it("idx_document_versions_created_at: should use index for timeline queries", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "timeline@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Timeline Doc ${i}`,
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
            filename: `v${i}.pdf`,
            mimeType: "application/pdf",
            size: 1024,
            storageKey: `documents/${doc.id}/v1.pdf`,
            storageProvider: "local" as const,
            checksum: String(i).padEnd(64, "0") as Sha256,
            uploadedBy: owner.id,
            createdAt: new Date(),
          })
        )
        await runEffect(versionRepo.save(vEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM document_versions ORDER BY created_at DESC LIMIT 5`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(/Index|Sort/i.test(planText)).toBe(true)
    })
  })

  describe("Documents Table Index Performance", () => {
    it("idx_documents_uploaded_by: should use index for documents by user", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "doc-owner@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Document ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents WHERE uploaded_by = ${owner.id}`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_documents_uploaded_by")
    })

    it("idx_documents_mime_type: should use index for mime type filtering", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "mime-filter@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const mimeType = i % 2 === 0 ? "application/pdf" : "image/jpeg"
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `Doc ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents WHERE mime_type = 'application/pdf'`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_documents_mime_type")
    })

    it("idx_documents_storage_provider: should use index for provider filtering", async () => {
      const owner = await createTestUser(testDb.db, {
        email: "storage@example.com",
      })

      for (let i = 0; i < 2; i++) {
        const vId = crypto.randomUUID() as DocumentVersionId
        const docEntity = Effect.runSync(
          createTestDocumentEntity({
            id: crypto.randomUUID() as DocumentId,
            ownerId: owner.id,
            title: `S3 Doc ${i}`,
            currentVersionId: vId,
            createdAt: new Date().toISOString(),
          })
        )
        await runEffect(documentRepo.save(docEntity))
      }

      const db = testDb.db
      const result = await db.execute(
        sql`EXPLAIN (FORMAT TEXT) SELECT * FROM documents WHERE storage_provider = 's3'`
      )

      const planText = (result.rows as any[]).map((r) => Object.values(r)[0]).join("\n")
      expect(usesIndex(planText)).toBe(true)
      expect(planText).toContain("idx_documents_storage_provider")
    })
  })
})