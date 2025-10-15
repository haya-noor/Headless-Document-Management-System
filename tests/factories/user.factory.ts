/**
 * User Factory
 * ------------
 * Generates valid User domain entities using Effect + faker
 * Aligned with schema and Option-based structure in your domain.
 */

import { Effect as E, Option as O } from "effect"
import { faker } from "../setup"
import * as fc from "fast-check"
import { UserEntity } from "../../src/app/domain/user/entity"
import { UserValidationError } from "../../src/app/domain/user/errors"
import { makeUserIdSync } from "../../src/app/domain/shared/uuid"
import { type SerializedUser } from "../../src/app/domain/user/entity"

/**
 * Generators for User fields
 */
const userGenerators = {
  id: () => makeUserIdSync(faker.string.uuid()),
  email: () => faker.internet.email().toLowerCase(),
  firstName: () => faker.person.firstName(),
  lastName: () => faker.person.lastName(),
  role: () => faker.helpers.arrayElement(["admin", "user"]) as "admin" | "user",
  isActive: () => faker.datatype.boolean(),
  dateOfBirth: () => faker.date.birthdate({ min: 1970, max: 2000, mode: "year" }).toISOString(),
  phoneNumber: () => faker.phone.number(),
  profileImage: () => faker.image.avatar(),
  createdAt: () => faker.date.past({ years: 1 }).toISOString(),
  updatedAt: () => faker.date.recent().toISOString(),
}

/**
 * Base generator for serialized User
 */
export const generateTestUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => {
  const withDOB = faker.datatype.boolean()
  const withPhone = faker.datatype.boolean()
  const withImage = faker.datatype.boolean()
  const withUpdated = faker.datatype.boolean()

  return {
    id: userGenerators.id(),
    email: userGenerators.email(),
    firstName: userGenerators.firstName(),
    lastName: userGenerators.lastName(),
    role: userGenerators.role(),
    isActive: userGenerators.isActive(),
    dateOfBirth: withDOB ? userGenerators.dateOfBirth() : undefined,
    phoneNumber: withPhone ? userGenerators.phoneNumber() : undefined,
    profileImage: withImage ? userGenerators.profileImage() : undefined,
    createdAt: userGenerators.createdAt(),
    updatedAt: withUpdated ? userGenerators.updatedAt() : undefined,
    ...overrides,
  }
}

/**
 * Generate multiple test users
 */
export const generateTestUsers = (count: number): SerializedUser[] =>
  Array.from({ length: count }, () => generateTestUser())

/**
 * Scenario: Admin User
 */
export const createAdminUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => ({
  ...generateTestUser(),
  role: "admin",
  ...overrides,
})

/**
 * Scenario: Regular User
 */
export const createRegularUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => ({
  ...generateTestUser(),
  role: "user",
  ...overrides,
})

/**
 * Scenario: Inactive User
 */
export const createInactiveUser = (overrides: Partial<SerializedUser> = {}): SerializedUser => ({
  ...generateTestUser(),
  isActive: false,
  ...overrides,
})

/**
 * Create validated UserEntity
 */
export const createTestUserEntity = (
  overrides: Partial<SerializedUser> = {}
): E.Effect<UserEntity, UserValidationError> =>
  UserEntity.create(generateTestUser(overrides)).pipe(
    E.mapError(
      (err) =>
        new UserValidationError(
          "User",
          overrides,
          (err as Error).message || "Failed to create UserEntity"
        )
    )
  )

/**
 * Fast-check generator for property-based testing
 */
export const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  firstName: fc.string({ minLength: 1, maxLength: 100 }),
  lastName: fc.string({ minLength: 1, maxLength: 100 }),
  role: fc.constantFrom("admin", "user"),
  isActive: fc.boolean(),
  dateOfBirth: fc.oneof(fc.constant(undefined), fc.date().map(d => d.toISOString())),
  phoneNumber: fc.oneof(fc.constant(undefined), fc.string()),
  profileImage: fc.oneof(fc.constant(undefined), fc.string()),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.oneof(fc.constant(undefined), fc.date().map(d => d.toISOString())),
})
