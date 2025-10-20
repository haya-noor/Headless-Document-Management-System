/**
 * DocumentVersionEntity Tests
 * ----------------------------
 * Validates decoding, version logic, and creator handling.
 */

import { describe, it, expect } from "bun:test"
import { runEffect, faker } from "../setup"
import { Option as O } from "effect"
import { makeDocumentIdSync, makeUserIdSync } from "@/app/domain/shared/uuid"
import {
  generateTestDocumentVersion,
  createFirstVersion,
  createVersionWithCreator,
  createVersionWithoutCreator,
  createLargeFileVersion,
  createTestDocumentVersionEntity,
  documentVersionArbitrary,
} from "../factories/d-version.factory-test"
import { DocumentVersionEntity } from "@/app/domain/d-version/entity"
import { DocumentVersionValidationError } from "@/app/domain/d-version/errors"
import * as fc from "fast-check"

describe("DocumentVersionEntity", () => {
  it("should create a valid document version", async () => {
    const version = await runEffect(createTestDocumentVersionEntity())
    expect(version).toBeInstanceOf(DocumentVersionEntity)
    expect(O.getOrElse(version.checksum, () => "").length).toBe(64)
    expect(version.version).toBeGreaterThan(0)
  })

  it("should validate version number", async () => {
    const badInput = generateTestDocumentVersion({ version: 0 })
    await expect(runEffect(DocumentVersionEntity.create(badInput))).rejects.toThrow()
  })

  it("should detect first version", async () => {
    const v1 = await runEffect(DocumentVersionEntity.create(createFirstVersion(makeDocumentIdSync(faker.string.uuid()))))
    expect(v1.version).toBe(1)
  })

  it("should compare newer/older versions", async () => {
    const v1 = await runEffect(DocumentVersionEntity.create(generateTestDocumentVersion({ version: 1 })))
    const v2 = await runEffect(DocumentVersionEntity.create(generateTestDocumentVersion({ version: 3 })))

    expect(v2.isNewerThan(v1.version)).toBe(true)
    expect(v1.isOlderThan(v2.version)).toBe(true)
  })

  it("should handle creator info properly", async () => {
    const withCreator = await runEffect(DocumentVersionEntity.create(createVersionWithCreator(makeUserIdSync(faker.string.uuid()))))
    const withoutCreator = await runEffect(DocumentVersionEntity.create(createVersionWithoutCreator()))

    expect(withCreator.uploadedBy).toBeDefined()
    expect(withoutCreator.uploadedBy).toBeDefined()
  })

  it("should calculate size in MB correctly", async () => {
    const version = await runEffect(DocumentVersionEntity.create(createLargeFileVersion({ size: 2 * 1024 * 1024 })))
    expect(version.sizeInMB).toBeCloseTo(2, 0)
  })

  it.skip("should handle property-based valid data", async () => {
    await fc.assert(
      fc.asyncProperty(documentVersionArbitrary, async (data) => {
        const result = await runEffect(DocumentVersionEntity.create(data as any))
        expect(result).toBeInstanceOf(DocumentVersionEntity)
        expect(result.version).toBeGreaterThanOrEqual(1)
      }),
      { numRuns: 20 }
    )
  })
})
