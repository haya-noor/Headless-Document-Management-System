/**
 * Performance Tests
 * -----------------
 * Validates query execution efficiency and verifies that Postgres
 * is actually using INDEX SCANS.
 * 
 * This ensures our Drizzle model indexes — for example:
 *   - idx_users_email (on email)
 *   - idx_users_created_at (on created_at)
 * are really being utilized in query planning.
 */

import { describe, it, beforeAll, afterAll, expect } from "bun:test"
import { setupDatabase, teardownDatabase } from "./database.setup"
import { seedUsers } from "./seed-data"
import { getDb } from "./database.setup"
import { sql } from "drizzle-orm"

describe("Performance (Index Usage)", () => {
  // Spin up a fresh Postgres container before tests
  beforeAll(async () => await setupDatabase())

  // Tear down container when done
  afterAll(async () => await teardownDatabase())

  /**
   * Test 1: Verify that the query planner uses an index scan
   * when searching by `email` — this should hit the `idx_users_email` index
   * defined in the Drizzle users-model.
   */
  it("should use index scan for email lookup", async () => {
    // Seed 200 users to create a realistic table size
    await seedUsers(200)

    const db = getDb()

    //  Use EXPLAIN ANALYZE to inspect the query plan.
    // This tells Postgres to describe *how* it will execute the query
    // and which indexes it will use.
    const result = await db.execute(
      sql`EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com'`
    )

    // Extract text output from EXPLAIN ANALYZE
    const planText = result.rows.map((r: any) => Object.values(r)[0]).join("\n")

    // This is the key check:
    // If Postgres is using the `idx_users_email` index,
    // the plan will include “Index Scan” or “Bitmap Index Scan”.
    // If it instead shows “Seq Scan”, it means the index was ignored.
    expect(planText).toMatch(/Index Scan|Bitmap Index Scan/)
    expect(planText).not.toMatch(/Seq Scan/)

    //  Optional micro-performance benchmark
    // Measure time for a typical indexed query with ordering
    const start = performance.now()
    await db.execute(sql`SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC LIMIT 10`)
    const end = performance.now()

    // Expect it to complete in < 50ms (since both `role` and `created_at` are indexed)
    expect(end - start).toBeLessThan(50)
  })

  /**
   * Test 2: Verify that ordering by `created_at` uses the index
   * This ensures that our `idx_users_created_at` is being used for sorting efficiently.
   */
  it("should use index for created_at ordering", async () => {
    const db = getDb()

    // Again, use EXPLAIN to view the query plan — this time for ORDER BY
    const explain = await db.execute(
      sql`EXPLAIN SELECT * FROM users ORDER BY created_at DESC LIMIT 5`
    )

    const plan = explain.rows.map((r: any) => Object.values(r)[0]).join("\n")

    // Here we expect either:
    //   - "Index Scan" (using created_at index for order)
    //   - "Index Only Scan" (reads directly from index without touching table)
    expect(plan).toMatch(/Index Scan|Index Only Scan/)

  })
})
