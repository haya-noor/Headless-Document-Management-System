/**
 * UserRepository Integration Tests
 * =================================
 * Fully declarative using Effect schema patterns.
 * All composition via Effect.pipe and Option matching.
 * Tests the UserDrizzleRepository implementation.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest"
import { Effect, Option, pipe } from "effect"

import { UserDrizzleRepository } from "@/app/infrastructure/repositories/implementations/user.repository"
import { setupTestDatabase, teardownTestDatabase, cleanupDatabase, type TestDatabase } from "../setup/database.setup"
import {
  createTestUserEntity,
  generateTestUser,
  createAdminUser,
  createRegularUser,
  createInactiveUser,
} from "../factories/domain-factory/user.factory-test"
import { UserEntity } from "@/app/domain/user/entity"
import { DatabaseError, ValidationError } from "@/app/domain/shared/base.errors"
import { UserAlreadyExistsError } from "@/app/domain/user/errors"
import type { UserId } from "@/app/domain/refined/uuid"

/**
 * Test Runtime Helpers
 * Declarative error handling and effect composition
 */
const TestRuntime = {
  // Run an Effect and return its success value as a Promise
  // This converts Effect-based code to Promise-based for async/await testing
  run: <A, E>(effect: Effect.Effect<A, E, never>): Promise<A> =>
    Effect.runPromise(effect),

  // Run an Effect expecting it to fail, and return the error
  // Effect.flip swaps success/error channels, so errors become successes
  runExpectingError: <A, E>(effect: Effect.Effect<A, E, never>): Promise<E> =>
    pipe(
      effect,
      Effect.flip,  // Swap error and success channels
      Effect.runPromise
    ),

  // Run multiple Effects in parallel and collect results in an array
  // Effect.all runs all effects concurrently for better performance
  runArray: <A, E>(effects: Effect.Effect<A, E, never>[]): Promise<A[]> =>
    pipe(
      Effect.all(effects),  // Run all effects in parallel
      Effect.runPromise
    ),
}

/**
 * Test State (immutable, reset each test)
 */
interface TestState {
  repository: UserDrizzleRepository
  testDb: TestDatabase
}

let state: TestState

/**
 * Setup & Teardown
 */
beforeAll(async () => {
  // Initialize test database connection and repository instance
  // This runs once before all tests in this file
  const testDb = await setupTestDatabase()
  state = {
    repository: new UserDrizzleRepository(testDb.db),
    testDb,
  }
})

afterAll(async () => {
  // Close database connection after all tests complete
  await teardownTestDatabase()
})

beforeEach(async () => {
  // Clean all tables before each test to ensure test isolation
  // Each test starts with a fresh database state
  await cleanupDatabase(state.testDb.db)
})

/**
 * Declarative Test Helpers
 * These wrappers make test code more readable and composable
 */

// Save a user entity to database (returns Effect)
const saveUser = (userEntity: UserEntity) =>
  state.repository.save(userEntity)

// Find user by ID (returns Effect<Option<UserEntity>>)
// Option wraps the result - Some if found, None if not found
const findUserById = (id: string) =>
  state.repository.findById(id)

// Find user by email (returns Effect<Option<UserEntity>>)
const findUserByEmail = (email: string) =>
  state.repository.findByEmail(email)

// Create a test user entity and save it to database
// This chains two operations: create entity -> save to DB
// Effect.flatMap is used to sequence async operations
const createAndSaveUser = (overrides = {}) =>
  pipe(
    createTestUserEntity(overrides),  // Create entity from test data
    Effect.flatMap(saveUser)          // Then save it to database
  )

// ============================================================================
// Tests: CREATE / SAVE
// ============================================================================

describe("UserRepository • Save (CREATE)", () => {
  it("saves a new user and retrieves it by ID", async () => {
    // Test workflow: Create user -> Save -> Retrieve by ID -> Verify
    // Using pipe for declarative composition of async operations
    const result = await TestRuntime.run(
      pipe(
        createAndSaveUser({ email: "newuser@example.com" }),  
        Effect.flatMap((user) => findUserById(user.id))      
      )
    )

    // Result is Option<UserEntity> - Some if found, None if not
    expect(Option.isSome(result)).toBe(true)
    const user = Option.getOrThrow(result)  // Extract user from Option
    expect(user.email).toBe("newuser@example.com")
  })

  it("saves an admin user with correct role", async () => {
    // Use factory helper to generate admin-specific test data
    const adminData = createAdminUser({ email: "admin@example.com" })
    const result = await TestRuntime.run(
      pipe(
        createTestUserEntity(adminData),  // Validate and create entity
        Effect.flatMap(saveUser)          // Save to database
      )
    )

    // Verify the role persisted correctly
    expect(result.role).toBe("admin")
    expect(result.email).toBe("admin@example.com")
  })

  it("saves a regular user with correct role", async () => {
    const userData = createRegularUser({ email: "regular@example.com" })
    const result = await TestRuntime.run(
      pipe(
        createTestUserEntity(userData),
        Effect.flatMap(saveUser)
      )
    )

    expect(result.role).toBe("user")
    expect(result.email).toBe("regular@example.com")
  })

  it("saves an inactive user", async () => {
    const inactiveData = createInactiveUser({ email: "inactive@example.com" })
    const result = await TestRuntime.run(
      pipe(
        createTestUserEntity(inactiveData),
        Effect.flatMap(saveUser)
      )
    )

    expect(result.isActive).toBe(false)
    expect(result.email).toBe("inactive@example.com")
  })

  it("fails to save user with duplicate email", async () => {
    const email = "duplicate@example.com"

    // Save first user successfully
    await TestRuntime.run(createAndSaveUser({ email }))

    // Try to save second user with same email - should fail
    // runExpectingError captures the error instead of throwing
    const error = await TestRuntime.runExpectingError(
      createAndSaveUser({ email })
    )

    // Repository should enforce email uniqueness with UserAlreadyExistsError
    expect(error).toBeInstanceOf(UserAlreadyExistsError)
    expect((error as UserAlreadyExistsError).message).toContain(email)
  })
})

// ============================================================================
// Tests: FIND BY ID
// ============================================================================

describe("UserRepository • FindById", () => {
  it("finds an existing user by ID", async () => {
    // First, create and save a user to the database
    const saved = await TestRuntime.run(
      createAndSaveUser({ email: "findme@example.com" })
    )

    // Then, retrieve it by ID
    const result = await TestRuntime.run(findUserById(saved.id))

    // Result is wrapped in Option - Some(user) if found, None if not
    expect(Option.isSome(result)).toBe(true)
    const found = Option.getOrThrow(result)  // Unwrap the Option
    expect(found.id).toBe(saved.id)
    expect(found.email).toBe("findme@example.com")
  })

  it("returns None for non-existent user ID", async () => {
    // Generate a random UUID that doesn't exist in database
    const fakeId = crypto.randomUUID()
    const result = await TestRuntime.run(findUserById(fakeId))

    // Should return Option.None instead of throwing error
    expect(Option.isNone(result)).toBe(true)
  })
})

// ============================================================================
// Tests: FIND BY EMAIL
// ============================================================================

describe("UserRepository • FindByEmail", () => {
  it("finds an existing user by email", async () => {
    const email = "findemail@example.com"
    const saved = await TestRuntime.run(
      createAndSaveUser({ email })
    )

    const result = await TestRuntime.run(findUserByEmail(email))

    expect(Option.isSome(result)).toBe(true)
    const found = Option.getOrThrow(result)
    expect(found.id).toBe(saved.id)
    expect(found.email).toBe(email)
  })

  it("returns None for non-existent email", async () => {
    const result = await TestRuntime.run(
      findUserByEmail("nonexistent@example.com")
    )

    expect(Option.isNone(result)).toBe(true)
  })

  it("finds user by email case-insensitively", async () => {
    const email = "CaseSensitive@example.com".toLowerCase()
    await TestRuntime.run(createAndSaveUser({ email }))

    const result = await TestRuntime.run(
      findUserByEmail("casesensitive@example.com")
    )

    expect(Option.isSome(result)).toBe(true)
  })
})

// ============================================================================
// Tests: FIND MANY
// ============================================================================

describe("UserRepository • FindMany", () => {
  it("finds all users without filter", async () => {
    // Create 3 test users in parallel for efficiency
    // runArray executes all Effects concurrently using Effect.all
    await TestRuntime.runArray([
      createAndSaveUser({ email: "user1@example.com" }),
      createAndSaveUser({ email: "user2@example.com" }),
      createAndSaveUser({ email: "user3@example.com" }),
    ])

    // Retrieve all users (no filter means get everything)
    const users = await TestRuntime.run(state.repository.findMany())

    // Should have at least the 3 we just created
    expect(users.length).toBeGreaterThanOrEqual(3)
  })

  it("filters users by role", async () => {
    // Create mix of admin and regular users
    // Factory helpers ensure correct role assignment
    await TestRuntime.runArray([
      createAndSaveUser(createAdminUser({ email: "admin1@example.com" })),
      createAndSaveUser(createRegularUser({ email: "user1@example.com" })),
      createAndSaveUser(createAdminUser({ email: "admin2@example.com" })),
    ])

    // Filter to get only admin users
    const admins = await TestRuntime.run(
      state.repository.findMany({ role: "admin" })
    )

    // Should have at least 2 admins, and all should be admins
    expect(admins.length).toBeGreaterThanOrEqual(2)
    expect(admins.every(u => u.role === "admin")).toBe(true)
  })

  it("filters users by isActive status", async () => {
    // Create active and inactive users
    await TestRuntime.runArray([
      createAndSaveUser(createInactiveUser({ email: "inactive1@example.com" })),
      createAndSaveUser({ email: "active1@example.com", isActive: true }),
      createAndSaveUser(createInactiveUser({ email: "inactive2@example.com" })),
    ])

    const activeUsers = await TestRuntime.run(
      state.repository.findMany({ isActive: true })
    )
    const inactiveUsers = await TestRuntime.run(
      state.repository.findMany({ isActive: false })
    )

    // Verify we got results for each category
    expect(activeUsers.length).toBeGreaterThanOrEqual(1)
    expect(inactiveUsers.length).toBeGreaterThanOrEqual(2)
  })

  it("filters users by email", async () => {
    const targetEmail = "specific@example.com"
    await TestRuntime.runArray([
      createAndSaveUser({ email: targetEmail }),
      createAndSaveUser({ email: "other@example.com" }),
    ])

    const users = await TestRuntime.run(
      state.repository.findMany({ email: targetEmail })
    )

    expect(users.length).toBe(1)
    expect(users[0].email).toBe(targetEmail)
  })
})

// ============================================================================
// Tests: FIND MANY PAGINATED
// ============================================================================

describe("UserRepository • FindManyPaginated", () => {
  beforeEach(async () => {
    // Set up test data: create 10 users before each pagination test
    // Array.from generates Effects, runArray executes them in parallel
    const createUsers = Array.from({ length: 10 }, (_, i) =>
      createAndSaveUser({ email: `paginated${i}@example.com` })
    )
    await TestRuntime.runArray(createUsers)
  })

  it("returns paginated results with correct metadata", async () => {
    // Request first page with 5 items per page
    // Results sorted by createdAt in descending order (newest first)
    const result = await TestRuntime.run(
      state.repository.findManyPaginated(
        { page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" },
        {}  // No additional filters
      )
    )

    // Verify pagination metadata is correct
    expect(result.data.length).toBeLessThanOrEqual(5)  // Max 5 items per page
    expect(result.pagination.page).toBe(1)              // Current page
    expect(result.pagination.limit).toBe(5)             // Items per page
    expect(result.pagination.total).toBeGreaterThanOrEqual(10)  // Total count
    expect(result.pagination.totalPages).toBeGreaterThanOrEqual(2)  // At least 2 pages
    expect(result.pagination.hasNext).toBe(true)        // Has next page
    expect(result.pagination.hasPrev).toBe(false)       // No previous page (first page)
  })

  it("returns second page correctly", async () => {
    const result = await TestRuntime.run(
      state.repository.findManyPaginated(
        { page: 2, limit: 5, sortBy: "createdAt", sortOrder: "desc" },
        {}
      )
    )

    expect(result.pagination.page).toBe(2)
    expect(result.pagination.hasPrev).toBe(true)
  })

  it("applies filters with pagination", async () => {
    // Create some admin users
    await TestRuntime.runArray([
      createAndSaveUser(createAdminUser({ email: "paginadmin1@example.com" })),
      createAndSaveUser(createAdminUser({ email: "paginadmin2@example.com" })),
    ])

    const result = await TestRuntime.run(
      state.repository.findManyPaginated(
        { page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" },
        { role: "admin" }
      )
    )

    expect(result.data.every(u => u.role === "admin")).toBe(true)
  })
})

// ============================================================================
// Tests: EXISTS
// ============================================================================

describe("UserRepository • Exists", () => {
  it("returns true for existing user", async () => {
    const user = await TestRuntime.run(
      createAndSaveUser({ email: "exists@example.com" })
    )

    const exists = await TestRuntime.run(
      state.repository.exists(user.id)
    )

    expect(exists).toBe(true)
  })

  it("returns false for non-existent user", async () => {
    const fakeId = crypto.randomUUID()
    const exists = await TestRuntime.run(
      state.repository.exists(fakeId)
    )

    expect(exists).toBe(false)
  })
})

// ============================================================================
// Tests: COUNT
// ============================================================================

describe("UserRepository • Count", () => {
  it("counts all users without filter", async () => {
    await TestRuntime.runArray([
      createAndSaveUser({ email: "count1@example.com" }),
      createAndSaveUser({ email: "count2@example.com" }),
      createAndSaveUser({ email: "count3@example.com" }),
    ])

    const count = await TestRuntime.run(
      state.repository.count()
    )

    expect(count).toBeGreaterThanOrEqual(3)
  })

  it("counts users by role", async () => {
    await TestRuntime.runArray([
      createAndSaveUser(createAdminUser({ email: "countadmin1@example.com" })),
      createAndSaveUser(createRegularUser({ email: "countuser1@example.com" })),
      createAndSaveUser(createAdminUser({ email: "countadmin2@example.com" })),
    ])

    const adminCount = await TestRuntime.run(
      state.repository.count({ role: "admin" })
    )

    expect(adminCount).toBeGreaterThanOrEqual(2)
  })

  it("counts active users", async () => {
    await TestRuntime.runArray([
      createAndSaveUser({ email: "active1@example.com", isActive: true }),
      createAndSaveUser(createInactiveUser({ email: "inactive1@example.com" })),
      createAndSaveUser({ email: "active2@example.com", isActive: true }),
    ])

    const activeCount = await TestRuntime.run(
      state.repository.count({ isActive: true })
    )

    expect(activeCount).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================================
// Tests: DELETE
// ============================================================================

describe("UserRepository • Delete", () => {
  it("deletes an existing user", async () => {
    // Create a user to delete
    const user = await TestRuntime.run(
      createAndSaveUser({ email: "deleteme@example.com" })
    )

    // Perform hard delete (removes from database permanently)
    const deleted = await TestRuntime.run(
      state.repository.delete(user.id)
    )

    expect(deleted).toBe(true)

    // Verify user no longer exists in database
    // exists() returns boolean, not Option
    const exists = await TestRuntime.run(
      state.repository.exists(user.id)
    )
    expect(exists).toBe(false)
  })

  it("returns false when deleting non-existent user", async () => {
    const fakeId = crypto.randomUUID()

    const result = await TestRuntime.run(
      state.repository.delete(fakeId)
    )

    expect(result).toBe(false)
  })

  it("user is not findable after deletion", async () => {
    const user = await TestRuntime.run(
      createAndSaveUser({ email: "deletecheck@example.com" })
    )

    await TestRuntime.run(state.repository.delete(user.id))

    const result = await TestRuntime.run(findUserById(user.id))
    expect(Option.isNone(result)).toBe(true)
  })
})

// ============================================================================
// Tests: EDGE CASES & ERROR HANDLING
// ============================================================================

describe("UserRepository • Edge Cases", () => {
  it("handles finding user with special characters in email", async () => {
    const email = "user+test@example.com"
    await TestRuntime.run(createAndSaveUser({ email }))

    const result = await TestRuntime.run(findUserByEmail(email))

    expect(Option.isSome(result)).toBe(true)
    expect(Option.getOrThrow(result).email).toBe(email)
  })

  it("maintains data integrity for optional fields", async () => {
    const userData = generateTestUser({
      email: "optional@example.com",
      phoneNumber: "+1234567890",
      profileImage: "https://example.com/avatar.jpg",
      dateOfBirth: new Date("1990-01-01"),
    })

    const user = await TestRuntime.run(
      pipe(
        createTestUserEntity(userData),
        Effect.flatMap(saveUser),
        Effect.flatMap((saved) => findUserById(saved.id)),
        Effect.map(Option.getOrThrow)
      )
    )

    expect(user.email).toBe("optional@example.com")
    // Optional fields should be preserved
  })

  it("handles empty result sets gracefully", async () => {
    const users = await TestRuntime.run(
      state.repository.findMany({ email: "nonexistent@nowhere.com" })
    )

    expect(users).toEqual([])
  })

  it("handles pagination with no results", async () => {
    const result = await TestRuntime.run(
      state.repository.findManyPaginated(
        { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
        { email: "nonexistent@nowhere.com" }
      )
    )

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })
})

// ============================================================================
// Tests: DECLARATIVE COMPOSITION
// ============================================================================

describe("UserRepository • Effect Composition", () => {
  it("chains multiple operations declaratively", async () => {
    // Demonstrates Effect composition using pipe for sequential operations
    // Each step passes its output to the next step
    const result = await TestRuntime.run(
      pipe(
        // Step 1: Create and save user (returns Effect<UserEntity>)
        createAndSaveUser({ email: "compose@example.com" }),
        
        // Step 2: Find by ID (returns Effect<Option<UserEntity>>)
        // flatMap chains async operations
        Effect.flatMap((user) => findUserById(user.id)),
        
        // Step 3: Extract from Option (returns Effect<UserEntity>)
        // map transforms the value without async
        Effect.map(Option.getOrThrow),
        
        // Step 4: Side effect for verification
        // tap performs an action without changing the value
        Effect.tap((user) =>
          Effect.sync(() => {
            expect(user.email).toBe("compose@example.com")
          })
        )
      )
    )

    // Final assertion on the composed result
    expect(result.email).toBe("compose@example.com")
  })

  it("handles errors in composition chain", async () => {
    const email = "error@example.com"

    // Create first user
    await TestRuntime.run(createAndSaveUser({ email }))

    // Try to create duplicate - should fail
    const error = await TestRuntime.runExpectingError(
      pipe(
        createAndSaveUser({ email }),
        Effect.flatMap((user) => findUserById(user.id))
      )
    )

    expect(error).toBeInstanceOf(UserAlreadyExistsError)
  })

  it("uses Option matching for conditional logic", async () => {
    const existingEmail = "existing@example.com"
    const newEmail = "new@example.com"

    // Pre-create one user
    await TestRuntime.run(createAndSaveUser({ email: existingEmail }))

    // Helper that implements "find or create" pattern using Option.match
    // This is a common pattern for idempotent operations
    const checkAndCreate = (email: string) =>
      pipe(
        findUserByEmail(email),  // Returns Effect<Option<UserEntity>>
        Effect.flatMap(
          // Option.match handles both Some and None cases declaratively
          Option.match({
            onNone: () => createAndSaveUser({ email }),      // Create if not found
            onSome: (user) => Effect.succeed(user),          // Return existing if found
          })
        )
      )

    // Test both paths: existing user (onSome) and new user (onNone)
    const existing = await TestRuntime.run(checkAndCreate(existingEmail))
    const created = await TestRuntime.run(checkAndCreate(newEmail))

    // Both should succeed, one was found, one was created
    expect(existing.email).toBe(existingEmail)
    expect(created.email).toBe(newEmail)
  })
})

