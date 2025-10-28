/**
 * Document Factory
 * ----------------
 * Generates realistic fake Document entities and serialized inputs for tests.
 * Aligns with your domain schema & Option-based structure.
 */

import { Effect as E, Option as O } from "effect"
import { faker } from "../../setup"
import * as fc from "fast-check"
import { DocumentSchemaEntity } from "@/app/domain/document/entity"
import { DocumentValidationError } from "@/app/domain/document/errors"
import { DocumentId, DocumentVersionId, UserId, makeDocumentIdSync, makeDocumentVersionIdSync, makeUserIdSync } from "@/app/domain/refined/uuid"
import { type Document } from "@/app/domain/document/schema"

/**
 * Helpers
 */
const iso = (d: Date) => d.toISOString()

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
  createdAt: () => iso(faker.date.past({ years: 1 })),
  updatedAt: () => iso(faker.date.recent()),
}

/**
 * Generate a valid serialized document
 */
export const generateTestDocument = (overrides: Partial<Document> = {}): Document => {
  const withDescription = faker.datatype.boolean()
  const withTags = faker.datatype.boolean()

  const createdAt = documentGenerators.createdAt()
  const base = {
    id: documentGenerators.id(),
    ownerId: documentGenerators.ownerId(),
    title: documentGenerators.title(),
    description: withDescription ? documentGenerators.description() : undefined,
    tags: withTags ? documentGenerators.tags() : undefined,
    currentVersionId: documentGenerators.currentVersionId(),
    createdAt,
    updatedAt: createdAt, // updatedAt is mandatory now, defaults to createdAt
  }

  return { ...base, ...overrides } as Document
}

/**
 * Scenario: Complete document
 */
export const createCompleteDocument = (overrides: Partial<Document> = {}): Document => {
  return {
    ...generateTestDocument(),
    description: documentGenerators.description(),
    tags: documentGenerators.tags(),
    updatedAt: documentGenerators.updatedAt(),
    ...overrides,
  }
}

/**
 * Scenario: Minimal document (only required fields)
 */
export const createMinimalDocument = (overrides: Partial<Document> = {}): Document => {
  const createdAt = documentGenerators.createdAt()
  return {
    ...generateTestDocument(),
    description: undefined,
    tags: undefined,
    createdAt,
    updatedAt: createdAt, // updatedAt is mandatory, defaults to createdAt
    ...overrides,
  }
}

/**
 * Scenario: Document with specific tags
 */
export const createDocumentWithTags = (tags: string[], overrides: Partial<Document> = {}): Document => {
  return {
    ...generateTestDocument(),
    tags: tags,
    ...overrides,
  }
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
        DocumentValidationError.forField(
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
