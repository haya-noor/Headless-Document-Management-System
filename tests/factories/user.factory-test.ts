/**
 * User Factory
 * ------------
 * Generates valid serialized Users and validated UserEntity instances
 * for tests. Constrained to match domain guards & schema:
 *  - firstName/lastName: 1..100 chars
 *  - phoneNumber: <= 20 chars
 *  - profileImage: <= 500 chars
 *  - role: "admin" | "user"
 *  - dates: ISO strings
 */

import { Effect as E } from "effect"
import * as fc from "fast-check"
import { faker } from "../setup"

import { UserEntity, type SerializedUser } from "../../src/app/domain/user/entity"
import { UserValidationError } from "../../src/app/domain/user/errors"

// If you brand IDs elsewhere, keep this import; otherwise you can remove it.
// It should return a UUID string compatible with the encoded schema.
import { makeUserIdSync } from "../../src/app/domain/shared/uuid"

// -----------------------------
// helpers
// -----------------------------

const iso = (d: Date) => d.toISOString()

/** clamp a string to max length */
const clamp = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max))

/** random string of digits (len 1..n) */
const digits = (n: number) => {
  const len = faker.number.int({ min: 1, max: n })
  return Array.from({ length: len }, () => faker.number.int({ min: 0, max: 9 })).join("")
}

// -----------------------------
// User Field Generators
// -----------------------------

const userGenerators = {
  id: () => clamp(makeUserIdSync(faker.string.uuid()), 36),  // Clamp to varchar(36)
  email: () => clamp(faker.internet.email().toLowerCase(), 255), // varchar(255)
  firstName: () => {
    const base = faker.person.firstName()
    return clamp(base.length === 0 ? "A" : base, 100)
  },
  lastName: () => {
    const base = faker.person.lastName()
    return clamp(base.length === 0 ? "B" : base, 100)
  },
  role: () => faker.helpers.arrayElement(["admin", "user"]) as "admin" | "user",
  isActive: () => faker.datatype.boolean(),
  dateOfBirth: () =>
    iso(faker.date.birthdate({ min: 1970, max: 2005, mode: "year" })),
  phoneNumber: () => clamp(digits(20), 20),
  profileImage: () => clamp(faker.image.avatar(), 500),
  createdAt: () => iso(faker.date.past({ years: 2 })),
  updatedAt: () => iso(faker.date.recent({ days: 30 })),
}

// -----------------------------
// main factory (SerializedUser)
// -----------------------------

/**
 * Create a valid serialized User (Encoded form expected by create()).
 * Optional fields are randomly included to exercise both paths.
 */
export const generateTestUser = (
  overrides: Partial<SerializedUser> = {}
): SerializedUser => {
  const withDOB = faker.datatype.boolean()
  const withPhone = faker.datatype.boolean()
  const withImage = faker.datatype.boolean()
  const withUpdated = faker.datatype.boolean()

  const base: SerializedUser = {
    id: userGenerators.id(),
    email: userGenerators.email(),
    firstName: userGenerators.firstName(),
    lastName: userGenerators.lastName(),
    role: userGenerators.role(),
    isActive: userGenerators.isActive(),
    createdAt: userGenerators.createdAt(),
    updatedAt: withUpdated ? userGenerators.updatedAt() : undefined,
    // optionals (present or omitted)
    dateOfBirth: withDOB ? userGenerators.dateOfBirth() : undefined,
    phoneNumber: withPhone ? userGenerators.phoneNumber() : undefined,
    profileImage: withImage ? userGenerators.profileImage() : undefined,
  }

  return { ...base, ...overrides }
}

/** convenience: many users */
export const generateTestUsers = (count: number): SerializedUser[] =>
  Array.from({ length: count }, () => generateTestUser())

/** scenarios */
export const createAdminUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => ({
  ...generateTestUser(),
  role: "admin",
  ...overrides,
})

export const createRegularUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => ({
  ...generateTestUser(),
  role: "user",
  ...overrides,
})

export const createInactiveUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => ({
  ...generateTestUser(),
  isActive: false,
  ...overrides,
})

/**
 * Create a validated UserEntity (Effect), mapping any error
 * to UserValidationError with context.
 */
export const createTestUserEntity = (
  overrides: Partial<SerializedUser> = {}
): E.Effect<UserEntity, UserValidationError> =>
  UserEntity.create(generateTestUser(overrides)).pipe(
    E.mapError((err) => {
      const message =
        (err as Error)?.message ?? "Failed to create UserEntity"
      return new UserValidationError("User", overrides, message)
    })
  )

// -----------------------------
// fast-check arbitrary
// -----------------------------

/**
 * Property-based generator that stays within your guards:
 *  - names: 1..100
 *  - phone: <= 20 when defined
 *  - profileImage: <= 500 when defined
 *  - dates as ISO strings (example: 2025-01-01T00:00:00.000Z)
 */
export const userArbitrary: fc.Arbitrary<SerializedUser> = fc.record(
  {
    id: fc.uuid(),

    email: fc.emailAddress(),

    firstName: fc
      .string({ minLength: 1, maxLength: 100 })
      .map((s) => clamp(s, 100)),

    lastName: fc
      .string({ minLength: 1, maxLength: 100 })
      .map((s) => clamp(s, 100)),

    role: fc.constantFrom("admin", "user"),

    isActive: fc.boolean(),

    dateOfBirth: fc.oneof(
      fc.constant(undefined),
      fc.date({ max: new Date() }).map((d) => d.toISOString())
    ),

    // Keep phone within <= 20 when defined (use printable chars or digits as you prefer)
    phoneNumber: fc.oneof(
      fc.constant(undefined),
      fc.string({ minLength: 1, maxLength: 20 })
    ),

    // Keep profile image <= 500 when defined
    profileImage: fc.oneof(
      fc.constant(undefined),
      fc
        .string({ minLength: 1, maxLength: 500 })
        .map((s) => clamp(s, 500))
    ),

    createdAt: fc.date({ max: new Date() }).map((d) => d.toISOString()),

    updatedAt: fc.oneof(
      fc.constant(undefined),
      fc.date({ max: new Date() }).map((d) => d.toISOString())
    ),
  },
  { requiredKeys: ["id", "email", "firstName", "lastName", "role", "isActive", "createdAt"] }
)

export const UserFactory = {
  one: generateTestUser,
  many: generateTestUsers,
  admin: createAdminUser,
  regular: createRegularUser,
  inactive: createInactiveUser,
  entity: createTestUserEntity,
}