/**
 * UserRepository Integration Tests
 * --------------------------------
 * Validates UserRepositoryImpl CRUD and query behavior using Postgres Testcontainer.
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "bun:test"
import { setupDatabase, teardownDatabase, truncateAllTables } from "./database.setup"
import { seedUsers } from "./seed-data"
import { UserRepositoryImpl } from "../../src/app/infrastructure/repositories/implementations/user.repository"
import { Option } from "effect"
import { UserRole } from "../../src/app/application/types"

let repo: UserRepositoryImpl

describe("UserRepository Integration", () => {
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

  it("should create and fetch a user by ID", async () => {
    const [seed] = await seedUsers(1)
    const result = await repo.findById(seed.id)
    expect(Option.isSome(result)).toBe(true)
    expect(result.pipe(Option.getOrNull)!.email).toBe(seed.email)
  })

  it("should fetch users by role", async () => {
    await seedUsers(3)
    const admins = await repo.findByRole("admin" as UserRole)
    expect(Array.isArray(admins)).toBe(true)
  })

  it("should check existence of a user", async () => {
    const [seed] = await seedUsers(1)
    const exists = await repo.exists(seed.id)
    expect(exists).toBe(true)
  })

  it("should handle pagination correctly", async () => {
    await seedUsers(10)
    const result = await repo.findManyPaginated({ page: 1, limit: 5 })
    expect(result.pagination.total).toBeGreaterThan(0)
    expect(result.data.length).toBeLessThanOrEqual(5)
  })
})
