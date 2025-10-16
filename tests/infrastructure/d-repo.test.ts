import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { sql } from "drizzle-orm"

// SUT
import { DocumentRepository } from "../../../src/app/infrastructure/repositories/implementations/d.repository"

// Test DB harness
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser,
  type TestDatabase,
} from "../setup/database"

describe("DocumentRepository Integration Tests", () => {
  let testDb: TestDatabase
  let repo: DocumentRepository
  let testUserId: string
  let otherUserId: string

  const nowIso = () => new Date()

  const makeCreateDTO = (overrides?: Partial<any>) => ({
    // requireds inferred from repo filters & writes
    uploadedBy: testUserId,
    filename: `file-${crypto.randomUUID()}.pdf`,
    mimeType: "application/pdf",
    size: 1024,
    // optionals your repo supports
    checksum: "a".repeat(64),
    tags: ["test", "integration"],
    metadata: { team: "qa" },
    ...overrides,
  })

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    repo = new DocumentRepository(testDb.db)
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    await cleanupDatabase(testDb.db)
    const user = await createTestUser(testDb.db, { email: "doc-owner@example.com" })
    testUserId = user.id
    const other = await createTestUser(testDb.db, { email: "someone-else@example.com" })
    otherUserId = other.id
  })

  // ---------------- CREATE ----------------
  describe("create", () => {
    it("creates a document and returns it", async () => {
      const created = await repo.create(makeCreateDTO())
      expect(created.id).toBeDefined()
      expect(created.uploadedBy).toBe(testUserId)
      expect(created.mimeType).toBe("application/pdf")
      expect(created.size).toBe(1024)
      // optional projections pass through transformDocument
      expect(created.checksum).toBe("a".repeat(64))
      expect(created.tags).toEqual(["test", "integration"])
      expect(created.metadata).toEqual({ team: "qa" })
    })

    it("creates with minimal fields (no checksum/tags/metadata)", async () => {
      const created = await repo.create(
        makeCreateDTO({ checksum: undefined, tags: undefined, metadata: undefined })
      )
      expect(created.id).toBeDefined()
      expect(created.checksum).toBeUndefined()
      expect(created.tags).toBeUndefined()
      expect(created.metadata).toBeUndefined()
    })
  })

  // ---------------- READ: findById / exists / count ----------------
  describe("findById / exists / count", () => {
    it("findById returns the created document", async () => {
      const doc = await repo.create(makeCreateDTO())
      const found = await repo.findById(doc.id)
      expect(found?.id).toBe(doc.id)
    })

    it("exists true/false works", async () => {
      const doc = await repo.create(makeCreateDTO())
      expect(await repo.exists(doc.id)).toBe(true)
      expect(await repo.exists(crypto.randomUUID())).toBe(false)
    })

    it("count supports simple filters", async () => {
      await repo.create(makeCreateDTO({ uploadedBy: testUserId }))
      await repo.create(makeCreateDTO({ uploadedBy: testUserId }))
      await repo.create(makeCreateDTO({ uploadedBy: otherUserId }))
      const countMine = await repo.count({ uploadedBy: testUserId })
      const countPdf = await repo.count({ mimeType: "application/pdf" })
      expect(countMine).toBe(2)
      expect(countPdf).toBe(3)
    })
  })

  // ---------------- READ: queries & pagination ----------------
  describe("query helpers", () => {
    beforeEach(async () => {
      // Seed a bunch of documents
      await repo.create(makeCreateDTO({ filename: "Quarterly Report Q1.pdf", tags: ["finance", "report"] }))
      await repo.create(makeCreateDTO({ filename: "Quarterly Report Q2.pdf", tags: ["finance", "report"] }))
      await repo.create(makeCreateDTO({ filename: "Employee Handbook.txt", mimeType: "text/plain", tags: ["hr", "policy"] }))
      await repo.create(makeCreateDTO({ filename: "Spec.md", mimeType: "text/markdown", tags: ["engineering"] }))
      await repo.create(makeCreateDTO({ filename: "Marketing Strategy.pptx", mimeType: "application/vnd.ms-powerpoint", tags: ["marketing", "strategy"] }))
    })

    it("findByUploader", async () => {
      const rows = await repo.findByUploader(testUserId)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every(r => r.uploadedBy === testUserId)).toBe(true)
    })

    it("findByFilenamePattern", async () => {
      const rows = await repo.findByFilenamePattern("Quarterly Report")
      expect(rows.length).toBe(2)
      expect(rows.every(r => r.filename.includes("Quarterly Report"))).toBe(true)
    })

    it("findByMimeType", async () => {
      const rows = await repo.findByMimeType("text/plain")
      expect(rows.length).toBe(1)
      expect(rows[0]?.mimeType).toBe("text/plain")
    })

    it("findBySizeRange", async () => {
      // Create specific sizes
      await repo.create(makeCreateDTO({ size: 10 }))
      await repo.create(makeCreateDTO({ size: 2000 }))
      const small = await repo.findBySizeRange(0, 100)
      const large = await repo.findBySizeRange(1500, 5000)
      expect(small.some(d => d.size <= 100)).toBe(true)
      expect(large.some(d => d.size >= 1500)).toBe(true)
    })

    it("findByDateRange", async () => {
      const start = new Date(Date.now() - 60_000)
      const end = new Date(Date.now() + 60_000)
      const rows = await repo.findByDateRange(start, end)
      expect(rows.length).toBeGreaterThan(0)
    })

    it("findByTags matchAny & matchAll", async () => {
      const any = await repo.findByTags(["finance"], false)
      expect(any.length).toBeGreaterThan(0)
      const all = await repo.findByTags(["finance", "report"], true)
      expect(all.every(d => (d.tags ?? []).includes("finance") || (d.tags ?? []).includes("report"))).toBe(true)
    })

    it("findDuplicatesByChecksum", async () => {
      const checksum = "b".repeat(64)
      await repo.create(makeCreateDTO({ checksum, filename: "dup-1.pdf" }))
      await repo.create(makeCreateDTO({ checksum, filename: "dup-2.pdf" }))
      const dups = await repo.findDuplicatesByChecksum(checksum)
      expect(dups.length).toBe(2)
    })

    it("searchDocuments delegates to findMany filters", async () => {
      const found = await repo.searchDocuments({ filename: "Quarterly", tags: ["report"] })
      expect(found.length).toBeGreaterThan(0)
    })

    it("findManyPaginated paginates", async () => {
      const page1 = await repo.findManyPaginated({ page: 1, limit: 2 }, {})
      const page2 = await repo.findManyPaginated({ page: 2, limit: 2 }, {})
      expect(page1.data.length).toBe(2)
      expect(page2.data.length).toBe(2)
      expect(page1.total).toBe(5)
      expect(page1.totalPages).toBe(3)
      const ids1 = page1.data.map(d => d.id)
      const ids2 = page2.data.map(d => d.id)
      expect(ids1.some(id => ids2.includes(id))).toBe(false)
    })
  })

  // ---------------- UPDATE ----------------
  describe("update / updateTags / updateMetadata / incrementVersion", () => {
    it("update changes basic fields", async () => {
      const created = await repo.create(makeCreateDTO({ filename: "old-name.pdf", mimeType: "application/pdf" }))
      const updated = await repo.update(created.id, { filename: "new-name.pdf", mimeType: "application/octet-stream" })
      expect(updated?.filename).toBe("new-name.pdf")
      expect(updated?.mimeType).toBe("application/octet-stream")
      expect(updated?.updatedAt).toBeTruthy()
    })

    it("updateTags sets and persists tags", async () => {
      const created = await repo.create(makeCreateDTO({ tags: ["old"] }))
      const ok = await repo.updateTags(created.id, ["new", "another"])
      expect(ok).toBe(true)
      const reread = await repo.findById(created.id)
      expect(reread?.tags).toEqual(["new", "another"])
    })

    it("updateMetadata sets and persists metadata", async () => {
      const created = await repo.create(makeCreateDTO({ metadata: { a: 1 } }))
      const ok = await repo.updateMetadata(created.id, { project: "Apollo" })
      expect(ok).toBe(true)
      const reread = await repo.findById(created.id)
      expect(reread?.metadata).toEqual({ project: "Apollo" })
    })

    it("incrementVersion increases counter and returns the new value", async () => {
      const created = await repo.create(makeCreateDTO())
      const v1 = await repo.incrementVersion(created.id)
      const v2 = await repo.incrementVersion(created.id)
      expect(v2).toBeGreaterThanOrEqual(v1)
    })
  })

  // ---------------- DELETE (soft + hard) ----------------
  describe("softDelete / restore / delete", () => {
    it("softDelete hides from reads; restore brings it back", async () => {
      const created = await repo.create(makeCreateDTO())
      const ok = await repo.softDelete(created.id)
      expect(ok).toBe(true)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()

      const restored = await repo.restore(created.id)
      expect(restored).toBe(true)

      const again = await repo.findById(created.id)
      expect(again?.id).toBe(created.id)
    })

    it("findDeleted lists soft-deleted docs (optionally by user)", async () => {
      const a = await repo.create(makeCreateDTO({ filename: "del-a.pdf" }))
      const b = await repo.create(makeCreateDTO({ filename: "del-b.pdf", uploadedBy: otherUserId }))
      await repo.softDelete(a.id)
      await repo.softDelete(b.id)

      const all = await repo.findDeleted()
      expect(all.length).toBe(2)

      const mine = await repo.findDeleted(testUserId)
      expect(mine.length).toBe(1)
      expect(mine[0]?.uploadedBy).toBe(testUserId)
    })

    it("delete removes a row (hard delete)", async () => {
      const created = await repo.create(makeCreateDTO())
      const deleted = await repo.delete(created.id)
      expect(deleted).toBe(true)
      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })
  })

  // ---------------- STATS ----------------
  describe("getDocumentStats", () => {
    it("returns counts and breakdowns", async () => {
      await repo.create(makeCreateDTO({ mimeType: "application/pdf" }))
      await repo.create(makeCreateDTO({ mimeType: "application/pdf" }))
      await repo.create(makeCreateDTO({ mimeType: "text/plain" }))

      const stats = await repo.getDocumentStats()
      expect(stats.totalDocuments).toBeGreaterThanOrEqual(3)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.documentsByMimeType["application/pdf"]).toBeGreaterThanOrEqual(2)
      expect(typeof stats.documentsByUploader[testUserId] === "number").toBe(true)
    })
  })

  // ---------------- PLAN / INDEX smoke ----------------
  describe("Index Usage and Query Performance (smoke)", () => {
    it("uses an index for uploader filter (if present)", async () => {
      const d = await repo.create(makeCreateDTO())
      const result = await testDb.db.execute(
        sql`EXPLAIN (COSTS OFF, FORMAT TEXT) SELECT * FROM documents WHERE uploaded_by = ${d.uploadedBy} LIMIT 1`
      )
      const rows = ((result as any).rows ?? result) as Array<Record<string, string>>
      const plan = rows.map(r => Object.values(r)[0] as string).join("\n")
      expect(/Index Scan|Bitmap Index Scan/i.test(plan)).toBe(true)
      expect(/Seq Scan/i.test(plan)).toBe(false)
    })
  })
})
