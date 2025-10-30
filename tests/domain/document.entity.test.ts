/**
 * DocumentEntity Tests (Bun)
 * --------------------------
 * Validates decoding, optional fields, and behavior for DocumentSchemaEntity.
 */

import { describe, it, expect } from "bun:test"
import { runEffect } from "../setup"
import { Option as O } from "effect"
import {
  generateTestDocument,
  createCompleteDocument,
  createMinimalDocument,
  createDocumentWithTags,
  createTestDocumentEntity,
  documentArbitrary,
} from "../factories/domain-factory/document.factory-test"
import { DocumentSchemaEntity } from "@/app/domain/document/entity"
import { DocumentValidationError } from "@/app/domain/document/errors"
import * as fc from "fast-check"

describe("DocumentSchemaEntity", () => {
  it("should create a valid DocumentEntity", async () => {
    const doc = await runEffect(createTestDocumentEntity())
    expect(doc).toBeInstanceOf(DocumentSchemaEntity)
    expect(typeof doc.title).toBe("string")
  })

  it("should handle missing optional fields", async () => {
    const doc = await runEffect(DocumentSchemaEntity.create(createMinimalDocument()))
    expect(O.isNone(doc.description)).toBe(true)
    expect(O.isNone(doc.tags)).toBe(true)
  })

  it("should reject invalid title", async () => {
    const badInput = generateTestDocument({ title: "" })
    await expect(runEffect(DocumentSchemaEntity.create(badInput))).rejects.toThrow()
  })

  it("should add and remove tags correctly", async () => {
    const doc = await runEffect(DocumentSchemaEntity.create(createDocumentWithTags(["alpha", "beta"])))
    const updated = await runEffect(doc.addTags(["gamma"]))
    const tags = O.getOrElse(updated.tags, () => [])
    expect(tags).toContain("alpha")
    expect(tags).toContain("gamma")

    const removed = await runEffect(updated.removeTags(["alpha"]))
    const newTags = O.getOrElse(removed.tags, () => [])
    expect(newTags).not.toContain("alpha")
  })

  it("should update title and mark modified", async () => {
    const doc = await runEffect(DocumentSchemaEntity.create(createMinimalDocument({ title: "Old" })))
    const updated = await runEffect(doc.rename("New Title"))
    expect(updated.title).toBe("New Title")
    expect(updated.isModified).toBe(true)
  })

  it("should serialize and recreate entity", async () => {
    const doc = await runEffect(createTestDocumentEntity())
    const serialized = await runEffect(doc.serialized())
    const recreated = await runEffect(DocumentSchemaEntity.create(serialized))
    expect(recreated.id).toBe(doc.id)
    expect(recreated.title).toBe(doc.title)
  })

  it.skip("should handle property-based data", async () => {
    await fc.assert(
      fc.asyncProperty(documentArbitrary, async (data) => {
        const result = await runEffect(DocumentSchemaEntity.create(data as any))
        expect(result).toBeInstanceOf(DocumentSchemaEntity)
        expect(result.title.length).toBeGreaterThan(0)
      }),
      { numRuns: 20 }
    )
  })
})
