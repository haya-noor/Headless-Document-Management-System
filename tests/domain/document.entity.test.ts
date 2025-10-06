/**
 * DocumentEntity Tests
 * Following w3-effect.md Essential Entity Testing Patterns
 */

import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { Effect } from 'effect';
import { DocumentEntity } from '../../src/domain/entities';
import { DocumentFactory, DocumentEntityFactory, generateDocument } from '../factories/document.factory';
import { UserEntityFactory } from '../factories/user.factory';

describe('DocumentEntity', () => {
  /**
   * Pattern 1: Basic Entity Creation & Validation
   */
  describe('creation and validation', () => {
    it('should create valid document from factory', () => {
      const doc = DocumentEntityFactory.createSync();
      
      expect(doc).toBeInstanceOf(DocumentEntity);
      expect(doc.filename).toBeTruthy();
      expect(doc.size).toBeGreaterThan(0);
      expect(doc.mimeType).toBeTruthy();
    });

    it('should create PDF document', () => {
      const doc = DocumentEntityFactory.createPdfSync();
      
      expect(doc.mimeType).toBe('application/pdf');
      // should end with .pdf
      expect(doc.filename).toMatch(/\.pdf$/);
    });

    it('should create image document', async () => {
      const doc = await Effect.runPromise(DocumentEntityFactory.createImage());
      
      expect(doc.mimeType).toBe('image/jpeg');
      expect(doc.filename).toMatch(/\.jpg$/);
    });

    it('should create document with required fields', () => {
      const doc = DocumentEntityFactory.createSync();
      
      expect(doc.id).toBeDefined();
      expect(doc.filename).toBeDefined();
      expect(doc.originalName).toBeDefined();
      expect(doc.storageKey).toBeDefined();
      expect(doc.uploadedBy).toBeDefined();
    });
  });

  /**
   * Pattern 2: Factory Constraint Testing
   */
  describe('factory constraints', () => {
    it('factory generates filename within length constraints', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = generateDocument();
          expect(doc.filename.length).toBeGreaterThan(0);
          expect(doc.filename.length).toBeLessThanOrEqual(255);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates positive size', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = generateDocument();
          expect(doc.size).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid checksum format', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = generateDocument();
          // should be 64 hex characters
          expect(doc.checksum).toMatch(/^[a-f0-9]{64}$/i);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid storage provider', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = generateDocument();
          expect(['local', 's3', 'gcs']).toContain(doc.storageProvider);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates positive version number', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = generateDocument();
          expect(doc.currentVersion).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Pattern 3: Option Type Handling
   */
  describe('optional fields and state', () => {
    it('should handle deleted state', () => {
      const activeDoc = DocumentFactory.active();
      const deletedDoc = DocumentFactory.deleted();
      
      expect(activeDoc.isDeleted).toBe(false);
      expect(deletedDoc.isDeleted).toBe(true);
    });

    it('should handle optional tags', () => {
      const withTags = DocumentFactory.withTags(['important', 'draft']);
      const withoutTags = generateDocument({ tags: [] });
      
      expect(withTags.tags).toHaveLength(2);
      expect(withoutTags.tags).toHaveLength(0);
    });

    it('should handle optional metadata', () => {
      const withMetadata = generateDocument({
        metadata: { author: 'John', department: 'IT' }
      });
      const withoutMetadata = generateDocument({ metadata: {} });
      
      expect(Object.keys(withMetadata.metadata)).toContain('author');
      expect(Object.keys(withoutMetadata.metadata)).toHaveLength(0);
    });
  });

  /**
   * Pattern 4: Computed Properties & Business Logic
   */
  describe('business logic methods', () => {
    it('getId returns string ID', () => {
      const doc = DocumentEntityFactory.createSync();
      const id = doc.getId();
      
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('getChecksum returns checksum string', () => {
      const doc = DocumentEntityFactory.createSync();
      const checksum = doc.getChecksum();
      
      expect(checksum).toBeTruthy();
      expect(checksum).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should maintain immutability', () => {
      const doc = DocumentEntityFactory.createSync();
      const originalId = doc.getId();
      const originalSize = doc.size;
      
      // Try to modify (should not affect original)
      const tags = doc.tags;
      tags.push('new-tag');
      
      expect(doc.getId()).toBe(originalId);
      expect(doc.size).toBe(originalSize);
    });
  });

  /**
   * Pattern 5: Factory Override Testing
   */
  describe('factory overrides', () => {
    it('should override filename', () => {
      const filename = 'custom-file.pdf';
      const doc = generateDocument({ filename });
      
      expect(doc.filename).toBe(filename);
    });

    it('should override storage provider', () => {
      const localDoc = DocumentFactory.withProvider('local');
      const s3Doc = DocumentFactory.withProvider('s3');
      
      expect(localDoc.storageProvider).toBe('local');
      expect(s3Doc.storageProvider).toBe('s3');
    });

    it('should override uploadedBy', () => {
      const user = UserEntityFactory.createSync();
      const doc = DocumentFactory.ownedBy(user.id.getValue());
      
      expect(doc.uploadedBy).toBe(user.id.getValue());
    });

    it('should override multiple fields', () => {
      const overrides = {
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        isDeleted: false
      };
      const doc = generateDocument(overrides);
      
      expect(doc.filename).toBe('report.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.size).toBe(1024);
      expect(doc.isDeleted).toBe(false);
    });
  });

  /**
   * Pattern 6: Error Handling & Edge Cases
   */
  describe('edge cases and validation', () => {
    it('should handle very large file sizes', () => {
      const doc = DocumentEntityFactory.createSync({ size: 10000000 });
      
      expect(doc.size).toBe(10000000);
    });

    it('should handle special characters in filename', () => {
      const doc = DocumentEntityFactory.createSync({
        filename: 'file-name_2024.pdf'
      });
      
      expect(doc.filename).toBe('file-name_2024.pdf');
    });

    it('should handle empty tags array', () => {
      const doc = DocumentEntityFactory.createSync({ tags: [] });
      
      expect(doc.tags).toHaveLength(0);
      expect(Array.isArray(doc.tags)).toBe(true);
    });

    it('should handle empty metadata object', () => {
      const doc = DocumentEntityFactory.createSync({ metadata: {} });
      
      expect(doc.metadata).toEqual({});
      expect(typeof doc.metadata).toBe('object');
    });
  });

  /**
   * Pattern 7: Serialization & Data Integrity
   */
  describe('persistence and serialization', () => {
    it('toPersistence preserves all fields', () => {
      const doc = DocumentEntityFactory.createSync();
      const persistence = doc.toPersistence();
      
      expect(persistence.id).toBe(doc.getId());
      expect(persistence.filename).toBe(doc.filename);
      expect(persistence.originalName).toBe(doc.originalName);
      expect(persistence.size).toBe(doc.size);
      expect(persistence.mimeType).toBe(doc.mimeType);
    });

    it('fromPersistence -> toPersistence round-trip maintains data', () => {
      const originalData = generateDocument();
      const entity = DocumentEntity.fromPersistence(originalData);
      const roundTrip = entity.toPersistence();
      
      expect(roundTrip.id).toBe(originalData.id);
      expect(roundTrip.filename).toBe(originalData.filename);
      expect(roundTrip.size).toBe(originalData.size);
      expect(roundTrip.tags).toEqual(originalData.tags);
    });

    it('should maintain checksum through serialization', () => {
      const doc = DocumentEntityFactory.createSync();
      const persistence = doc.toPersistence();
      const restored = DocumentEntity.fromPersistence(persistence);
      
      expect(restored.getChecksum()).toBe(doc.getChecksum());
    });

    it('should maintain dates through serialization', () => {
      const doc = DocumentEntityFactory.createSync();
      const persistence = doc.toPersistence();
      
      expect(persistence.createdAt).toBeInstanceOf(Date);
      expect(persistence.updatedAt).toBeInstanceOf(Date);
    });
  });

  /**
   * Property-based tests for domain invariants
   */
  describe('domain invariants (property-based)', () => {
    it('size is always positive', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = DocumentEntityFactory.createSync();
          expect(doc.size).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('currentVersion is always positive', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = DocumentEntityFactory.createSync();
          expect(doc.currentVersion).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('checksum is always 64 hex characters', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = DocumentEntityFactory.createSync();
          const checksum = doc.getChecksum();
          expect(checksum).toMatch(/^[a-f0-9]{64}$/i);
        }),
        { numRuns: 100 }
      );
    });

    it('id is always valid UUID', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const doc = DocumentEntityFactory.createSync();
          expect(doc.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Batch operations testing
   */
  describe('batch operations', () => {
    it('createMany generates requested number of documents', async () => {
      const docs = await Effect.runPromise(DocumentEntityFactory.createMany(5));
      
      expect(docs).toHaveLength(5);
      expect(docs.every(d => d instanceof DocumentEntity)).toBe(true);
    });

    it('createMany generates unique documents', () => {
      const docs = DocumentFactory.many(10);
      const ids = docs.map(d => d.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(10);
    });
  });

  /**
   * Scenario-based tests
   */
  describe('real-world scenarios', () => {
    it('should create document owned by specific user', () => {
      const user = UserEntityFactory.createSync();
      const doc = DocumentEntityFactory.createSync({
        uploadedBy: user.id.getValue() as any
      });
      
      expect(doc.uploadedBy).toBe(user.id.getValue());
    });

    it('should create document with metadata for categorization', () => {
      const doc = DocumentEntityFactory.createSync({
        metadata: {
          department: 'Engineering',
          project: 'API-2024',
          classification: 'confidential'
        }
      });
      
      expect(doc.metadata['department']).toBe('Engineering');
      expect(doc.metadata['project']).toBe('API-2024');
    });

    it('should create document with tags for search', () => {
      const doc = DocumentEntityFactory.createSync({
        tags: ['important', 'q4-2024', 'review']
      });
      
      expect(doc.tags).toContain('important');
      expect(doc.tags).toHaveLength(3);
    });
  });
});

