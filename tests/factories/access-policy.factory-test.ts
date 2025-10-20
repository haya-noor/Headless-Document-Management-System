/**
 * Access Policy Factory
 * ---------------------
 * Builds valid AccessPolicy entities and serialized inputs for testing
 * Consistent with Effect-based domain models and schema definitions
 */

import { Effect as E } from "effect"
import { faker } from "../setup"
import * as fc from "fast-check"
import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import { AccessPolicyValidationError } from "@/app/domain/access-policy/errors"
import { type AccessPolicy, type AccessPolicySerialized } from "@/app/domain/access-policy/schema"
import {
  AccessPolicyId,
  DocumentId,
  UserId,
  makeAccessPolicyIdSync,
  makeUserIdSync,
  makeDocumentIdSync,
} from "@/app/domain/shared/uuid"

/**
 * Reusable random generators for AccessPolicy test data
 */
const accessPolicyGenerators = {
  id: () => makeAccessPolicyIdSync(faker.string.uuid()),
  resourceId: () => makeDocumentIdSync(faker.string.uuid()),
  subjectId: () => makeUserIdSync(faker.string.uuid()),

  actions: {
    read: () => ["read"] as const,
    write: () => ["read", "write"] as const,
    admin: () => ["read", "write", "delete", "manage"] as const,
    random: () => {
      const all = ["read", "write", "delete", "manage"] as const
      const count = faker.number.int({ min: 1, max: all.length })
      return faker.helpers.arrayElements(all, count)
    },
  },

  subjectType: () => faker.helpers.arrayElement(["user", "role"] as const),
  createdAt: () => faker.date.past({ years: 1 }).toISOString(),
  updatedAt: () => faker.date.recent({ days: 10 }).toISOString(),
  isActive: () => faker.datatype.boolean(),
  priority: () => faker.number.int({ min: 1, max: 1000 }),
}

/**
 * Generate a valid AccessPolicy (serialized form)
 */
export const generateAccessPolicy = (
  overrides: Partial<AccessPolicySerialized> = {}
): AccessPolicySerialized => {
  const subjectType = overrides.subjectType ?? accessPolicyGenerators.subjectType()

  const base: AccessPolicySerialized = {
    id: accessPolicyGenerators.id(),
    name: faker.lorem.words({ min: 2, max: 5 }),
    description: faker.lorem.sentence(),
    resourceType: "document",
    resourceId: accessPolicyGenerators.resourceId(),
    subjectType,
    subjectId: accessPolicyGenerators.subjectId(),
    actions: accessPolicyGenerators.actions.random(),
    isActive: accessPolicyGenerators.isActive(),
    priority: accessPolicyGenerators.priority(),
    createdAt: accessPolicyGenerators.createdAt(),
    updatedAt: accessPolicyGenerators.updatedAt(),
  }

  return { ...base, ...overrides }
}

/**
 * Create a valid AccessPolicyEntity (Effect-based)
 */
export const createAccessPolicyEntity = (
  overrides: Partial<AccessPolicySerialized> = {}
): E.Effect<AccessPolicyEntity, AccessPolicyValidationError> =>
  AccessPolicyEntity.create(generateAccessPolicy(overrides)).pipe(
    E.mapError(
      (err) =>
        new AccessPolicyValidationError(
          "AccessPolicy",
          overrides,
          (err as Error).message || "Failed to create AccessPolicyEntity"
        )
    )
  )

/**
 * Predefined Scenarios
 */
export const createUserReadPolicy = (
  userId: UserId,
  documentId: DocumentId
): AccessPolicySerialized =>
  generateAccessPolicy({
    subjectType: "user",
    subjectId: userId,
    resourceId: documentId,
    actions: accessPolicyGenerators.actions.read(),
  })

export const createUserWritePolicy = (
  userId: UserId,
  documentId: DocumentId
): AccessPolicySerialized =>
  generateAccessPolicy({
    subjectType: "user",
    subjectId: userId,
    resourceId: documentId,
    actions: accessPolicyGenerators.actions.write(),
  })

export const createUserAdminPolicy = (
  userId: UserId,
  documentId: DocumentId
): AccessPolicySerialized =>
  generateAccessPolicy({
    subjectType: "user",
    subjectId: userId,
    resourceId: documentId,
    actions: accessPolicyGenerators.actions.admin(),
  })

export const createRolePolicy = (
  subjectId: UserId,
  documentId: DocumentId
): AccessPolicySerialized =>
  generateAccessPolicy({
    subjectType: "role",
    subjectId,
    resourceId: documentId,
    actions: accessPolicyGenerators.actions.random(),
  })

/**
Property-based generator for AccessPolicy
accessPolicyArbitrary generates random valid inputs (matching your schema).
Each generated input is passed to AccessPolicyEntity.create.
fast-check automatically re-runs the test dozens or hundreds 
of times with new random values, ensuring your schema and entity are robust.
 */
export const accessPolicyArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  resourceType: fc.constant("document"),
  resourceId: fc.uuid(),
  subjectType: fc.constantFrom("user", "role"),
  subjectId: fc.uuid(),
  actions: fc.array(fc.constantFrom("read", "write", "delete", "manage"), {
    minLength: 1,
    maxLength: 4,
  }),
  isActive: fc.boolean(),
  priority: fc.integer({ min: 1, max: 1000 }),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
})
