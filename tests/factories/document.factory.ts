/**
 * Document Factory
 * ----------------
 * Generates realistic fake Document entities and serialized inputs for tests.
 * Aligns with your domain schema & Option-based structure.
 */

import { Effect as E, Option as O } from "effect"
import { faker } from "../setup"
import * as fc from "fast-check"
import { DocumentSchemaEntity } from "../../src/app/domain/document/entity"
import { DocumentValidationError } from "../../src/app/domain/document/errors"
import { DocumentId, DocumentVersionId, UserId, makeDocumentIdSync, makeDocumentVersionIdSync, makeUserIdSync } from "../../src/app/domain/shared/uuid"
import { type Document } from "../../src/app/domain/document/schema"

/**
 * Generators for Document fields
 */
const documentGenerators = {
  id: () => makeDocumentIdSync(faker.string.uuid()),
  ownerId: () => makeUserIdSync(faker.string.uuid()),
  title: () => faker.lorem.words({ min: 2, max: 6 }),
  description: () => faker.lorem.sentences({ min: 1, max: 3 }),
  tags: () => faker.helpers.arrayElements(["finance", "hr", "legal", "engineering", "marketing", "sales"], 2),
  currentVersionId: () => makeDocumentVersionIdSync(faker.string.uuid()),
  createdAt: () => faker.date.past({ years: 1 }).toISOString(),
  updatedAt: () => faker.date.recent().toISOString(),
}

/**
 * Generate a valid serialized document
 */
export const generateTestDocument = (overrides: Partial<Document> = {}): Document => {
  const withDescription = faker.datatype.boolean()
  const withTags = faker.datatype.boolean()
  const withUpdatedAt = faker.datatype.boolean()

  const base = {
    id: documentGenerators.id(),
    ownerId: documentGenerators.ownerId(),
    title: documentGenerators.title(),
    description: withDescription ? documentGenerators.description() : undefined,
    tags: withTags ? documentGenerators.tags() : undefined,
    currentVersionId: documentGenerators.currentVersionId(),
    createdAt: documentGenerators.createdAt(),
    updatedAt: withUpdatedAt ? documentGenerators.updatedAt() : undefined,
  }

  // Apply overrides and ensure null values become undefined
  const result = { ...base, ...overrides }
  
  // Convert null to undefined for all optional fields
  if (result.description === null) result.description = undefined
  if (result.tags === null) result.tags = undefined
  if (result.updatedAt === null) result.updatedAt = undefined
  
  // Also handle the case where overrides might have null values
  Object.keys(overrides).forEach(key => {
    if (result[key] === null && ['description', 'tags', 'updatedAt'].includes(key)) {
      result[key] = undefined
    }
  })

  return result
}

/**
 * Scenario: Complete document
 */
export const createCompleteDocument = (overrides: Partial<Document> = {}): Document => {
  const result = {
    ...generateTestDocument(),
    description: documentGenerators.description(),
    tags: documentGenerators.tags(),
    updatedAt: documentGenerators.updatedAt(),
    ...overrides,
  }
  
  // Ensure null values become undefined
  if (result.description === null) result.description = undefined
  if (result.tags === null) result.tags = undefined
  if (result.updatedAt === null) result.updatedAt = undefined
  
  return result
}

/**
 * Scenario: Minimal document (only required fields)
 */
export const createMinimalDocument = (overrides: Partial<Document> = {}): Document => {
  const result = {
    ...generateTestDocument(),
    description: undefined,
    tags: undefined,
    updatedAt: undefined,
    ...overrides,
  }
  
  // Ensure null values become undefined
  if (result.description === null) result.description = undefined
  if (result.tags === null) result.tags = undefined
  if (result.updatedAt === null) result.updatedAt = undefined
  
  return result
}

/**
 * Scenario: Document with specific tags
 */
export const createDocumentWithTags = (tags: string[], overrides: Partial<Document> = {}): Document => {
  const result = {
    ...generateTestDocument(),
    tags: tags,
    ...overrides,
  }
  
  // Ensure null values become undefined
  if (result.description === null) result.description = undefined
  if (result.tags === null) result.tags = undefined
  if (result.updatedAt === null) result.updatedAt = undefined
  
  return result
}

/**
 * Factory: Create a single DocumentEntity
 */
export const createTestDocumentEntity = (
  overrides: Partial<Document> = {}
): E.Effect<DocumentSchemaEntity, DocumentValidationError> =>
  DocumentSchemaEntity.create(generateTestDocument(overrides)).pipe(
    E.mapError(
      (err) =>
        new DocumentValidationError(
          "Document",
          overrides,
          (err as Error).message || "Failed to create DocumentSchemaEntity"
        )
    )
  )

/**
 * Property-based test generator
 */
export const documentArbitrary = fc.record({
  id: fc.uuid().filter(uuid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)),
  ownerId: fc.uuid().filter(uuid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)),
  title: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.oneof(
    fc.constant(undefined),
    fc.string({ maxLength: 500 })
  ),
  tags: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 })
  ),
  currentVersionId: fc.uuid().filter(uuid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.oneof(
    fc.constant(undefined),
    fc.date().map(d => d.toISOString())
  ),
})
