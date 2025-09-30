/**
 * Effect Integration Tests
 * Tests the new Effect-based document entities and value objects
 */

import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { DocumentEntity, DocumentVersionEntity } from "../src/domain/entities";
import { DocumentIdVO, ChecksumVO, DateTimeVO } from "../src/domain/value-objects";

describe("Effect Integration", () => {
  describe("Value Objects", () => {
    it("should create DocumentIdVO from valid UUID", async () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      
      const result = await Effect.runPromise(
        DocumentIdVO.fromString(validUuid)
      );
      
      expect(result).toBeInstanceOf(DocumentIdVO);
      expect(result.getValue()).toBe(validUuid);
    });

    it("should create ChecksumVO from valid SHA-256", async () => {
      const validChecksum = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
      
      const result = await Effect.runPromise(
        ChecksumVO.fromString(validChecksum)
      );
      
      expect(result).toBeInstanceOf(ChecksumVO);
      expect(result.getValue()).toBe(validChecksum);
    });

    it("should create DateTimeVO from current date", async () => {
      const result = await Effect.runPromise(
        DateTimeVO.now()
      );
      
      expect(result).toBeInstanceOf(DateTimeVO);
      expect(result.getValue()).toBeInstanceOf(Date);
    });
  });

  describe("Document Entity", () => {
    it("should create document entity with value objects", () => {
      const document = DocumentEntity.create({
        id: "550e8400-e29b-41d4-a716-446655440000",
        filename: "test.pdf",
        originalName: "test.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageKey: "documents/test.pdf",
        storageProvider: "local",
        checksum: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
        tags: ["test"],
        metadata: { category: "test" },
        uploadedBy: "user-123"
      });

      expect(document).toBeInstanceOf(DocumentEntity);
      expect(document.getId()).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(document.getChecksum()).toBe("a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
    });

    it("should convert to persistence format", () => {
      const document = DocumentEntity.create({
        id: "550e8400-e29b-41d4-a716-446655440000",
        filename: "test.pdf",
        originalName: "test.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageKey: "documents/test.pdf",
        storageProvider: "local",
        checksum: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
        tags: ["test"],
        metadata: { category: "test" },
        uploadedBy: "user-123"
      });

      const persistence = document.toPersistence();
      
      expect(persistence.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(persistence.filename).toBe("test.pdf");
      expect(persistence.checksum).toBe("a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
    });
  });

  describe("Document Version Entity", () => {
    it("should create document version entity", () => {
      const version = DocumentVersionEntity.create({
        id: "version-123",
        documentId: "550e8400-e29b-41d4-a716-446655440000",
        version: 1,
        filename: "test.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageKey: "documents/test.pdf",
        storageProvider: "local",
        checksum: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
        tags: ["test"],
        metadata: { category: "test" },
        uploadedBy: "user-123"
      });

      expect(version).toBeInstanceOf(DocumentVersionEntity);
      expect(version.getDocumentId()).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(version.getChecksum()).toBe("a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
    });
  });
});
