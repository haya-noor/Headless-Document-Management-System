/**
 * User Profile Integration Tests
 * ------------------------------
 * Focuses on profile completeness queries and filtering.
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "bun:test"
import { setupDatabase, teardownDatabase, truncateAllTables } from "./database.setup"
import { seedUsers } from "./seed-data"
import { UserRepositoryImpl } from "../../src/app/infrastructure/repositories/implementations/user.repository"

let repo: UserRepositoryImpl

describe("User Profile Integration", () => {
  beforeAll(async () => {
    await setupDatabase()
    repo = new UserRepositoryImpl()
  })

  beforeEach(async () => {
    await truncateAllTables()
  })

  afterAll(async () => {
    await teardownDatabase()
  })

  it("should fetch users with complete profiles", async () => {
    const [seed] = await seedUsers(1)
    const result = await repo.fetchWithCompleteProfiles({ page: 1, limit: 10 })
    expect(result.data).toBeArray()
  })

  it("should fetch users with minimal profiles", async () => {
    await seedUsers(3)
    const result = await repo.fetchWithMinimalProfiles({ page: 1, limit: 10 })
    expect(result.pagination.page).toBe(1)
  })
})
