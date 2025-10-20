/**
 * DocumentVersion Factory
 * -----------------------
 * Generates valid DocumentVersion entities and serialized data for testing.
 * Uses faker + Effect schema alignment.
 */

import { Effect as E, Option as O } from "effect"
import { faker } from "../setup"
import * as fc from "fast-check"
import { DocumentVersionEntity } from "@/app/domain/d-version/entity"
import { DocumentVersionValidationError } from "@/app/domain/d-version/errors"
import { DocumentId, DocumentVersionId, UserId, makeDocumentIdSync, makeDocumentVersionIdSync, makeUserIdSync } from "@/app/domain/shared/uuid"
import { type DocumentVersion } from "@/app/domain/d-version/schema"
import { makeSha256 } from "@/app/domain/shared/checksum"
import { makeDateTimeFromAny } from "@/app/domain/shared/date-time"

/**
 * Generators for DocumentVersion fields
 */
const documentVersionGenerators = {
  id: () => makeDocumentVersionIdSync(faker.string.uuid()),
  documentId: () => makeDocumentIdSync(faker.string.uuid()),
  version: () => faker.number.int({ min: 1, max: 20 }),
  checksum: () => faker.string.hexadecimal({ length: 64, casing: "lower" }).replace("0x", ""),
  storageKey: () => {
    const folder = faker.helpers.arrayElement(["documents", "uploads", "files"])
    const filename = faker.system.fileName()
    return `${folder}/${faker.string.uuid()}/${filename}`
  },
  mimeType: () =>
    faker.helpers.arrayElement([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "text/plain",
      "application/json",
    ]),
  size: () => faker.number.int({ min: 100 * 1024, max: 50 * 1024 * 1024 }),
  uploadedBy: () => makeUserIdSync(faker.string.uuid()),
  createdAt: () => faker.date.past({ years: 2 }).toISOString(),
}

/**
 * Base serialized version generator
 */
export const generateTestDocumentVersion = (
  overrides: Partial<DocumentVersion> = {}
): DocumentVersion => {
  const withCreator = faker.datatype.boolean({ probability: 0.8 })

  return {
    id: documentVersionGenerators.id(),
    documentId: documentVersionGenerators.documentId(),
    version: documentVersionGenerators.version(),
    filename: faker.system.fileName(),
    mimeType: documentVersionGenerators.mimeType(),
    size: documentVersionGenerators.size(),
    storageKey: documentVersionGenerators.storageKey(),
    storageProvider: "local" as const,
    checksum: documentVersionGenerators.checksum() as any,
    tags: undefined,
    metadata: undefined,
    uploadedBy: documentVersionGenerators.uploadedBy(),
    createdAt: documentVersionGenerators.createdAt() as any,
    ...overrides,
  }
}

/**
 * Generate multiple versions
 */
export const generateTestDocumentVersions = (count: number): DocumentVersion[] =>
  Array.from({ length: count }, () => generateTestDocumentVersion())

/**
 * Scenario: First version of a document
 */
export const createFirstVersion = (
  documentId: DocumentId,
  overrides: Partial<DocumentVersion> = {}
): DocumentVersion => ({
  ...generateTestDocumentVersion(),
  documentId,
  version: 1,
  ...overrides,
})

/**
 * Scenario: With creator
 */
export const createVersionWithCreator = (
  uploadedBy: UserId,
  overrides: Partial<DocumentVersion> = {}
): DocumentVersion => ({
  ...generateTestDocumentVersion(),
  uploadedBy: uploadedBy,
  ...overrides,
})

/**
 * Scenario: Without creator
 */
export const createVersionWithoutCreator = (
  overrides: Partial<DocumentVersion> = {}
): DocumentVersion => ({
  ...generateTestDocumentVersion(),
  uploadedBy: makeUserIdSync(faker.string.uuid()),
  ...overrides,
})

/**
 * Scenario: Large file
 */
export const createLargeFileVersion = (
  overrides: Partial<DocumentVersion> = {}
): DocumentVersion => ({
  ...generateTestDocumentVersion(),
  size: faker.number.int({ min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 }),
  ...overrides,
})

/**
 * Create validated entity
 */
export const createTestDocumentVersionEntity = (
  overrides: Partial<DocumentVersion> = {}
): E.Effect<DocumentVersionEntity, DocumentVersionValidationError> =>
  DocumentVersionEntity.create(generateTestDocumentVersion(overrides)).pipe(
    E.mapError(
      (err) =>
        new DocumentVersionValidationError(
          "DocumentVersion",
          overrides,
          (err as Error).message || "Failed to create DocumentVersionEntity"
        )
    )
  )

/**
 * Property-based test arbitrary
 */
export const documentVersionArbitrary = fc.record({
  id: fc.uuid(),
  documentId: fc.uuid(),
  version: fc.integer({ min: 1, max: 50 }),
  filename: fc.string({ minLength: 1, maxLength: 255 }),
  checksum: fc.string({ minLength: 64, maxLength: 64 }),
  storageKey: fc.string({ minLength: 10, maxLength: 200 }),
  storageProvider: fc.constantFrom("local", "s3", "gcs"),
  mimeType: fc.constantFrom("application/pdf", "image/jpeg", "text/plain"),
  size: fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
  createdAt: fc.date(),
  uploadedBy: fc.uuid(),
})
