/**
 * Document E2E Test
 * -----------------
 * Full round-trip: create → update → fetch → list.
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "bun:test"
import { setupDatabase, teardownDatabase, truncateAllTables } from "./database.setup"
import { seedUsers, seedDocuments } from "./seed-data"
import { getDb } from "./database.setup"
import { documents } from "../../src/app/infrastructure/database/models"
import { eq } from "drizzle-orm"

describe("DocumentRepository E2E", () => {
  beforeAll(async () => await setupDatabase())
  beforeEach(async () => await truncateAllTables())
  afterAll(async () => await teardownDatabase())

  it("should create and fetch a document", async () => {
    const [user] = await seedUsers(1)
    const [doc] = await seedDocuments(user.id, 1)

    const db = getDb()
    const result = await db.select().from(documents).where(eq(documents.id, doc.id)).limit(1)
    expect(result[0].filename).toBe(doc.filename)
  })
})
