/**
 * Document Entity Test Factory
 * Follows w3-effect.md factory patterns with faker-based data generation
 */

import { Effect } from 'effect';
import { faker } from '@faker-js/faker';
import { DocumentEntity } from '../../src/domain/entities';
import crypto from 'crypto';

/**
 * Document factory data type
 */
type DocumentFactoryData = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageProvider: 'local' | 's3' | 'gcs';
  checksum: string;
  tags: string[];
  metadata: Record<string, unknown>;
  uploadedBy: string;
  currentVersion: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Rule 6: Base Generator Function using Faker
 */
export function generateDocument(overrides?: Partial<DocumentFactoryData>): DocumentFactoryData {
  const filename = faker.system.fileName();
  const baseData: DocumentFactoryData = {
    id: faker.string.uuid(),
    filename,
    originalName: filename,
    mimeType: faker.helpers.arrayElement([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/json'
    ]),
    size: faker.number.int({ min: 1, max: 10000000 }),
    storageKey: `documents/${faker.system.filePath()}`,
    storageProvider: faker.helpers.arrayElement(['local', 's3', 'gcs'] as const),
    checksum: crypto.createHash('sha256').update(faker.string.uuid()).digest('hex'),
    tags: faker.helpers.arrayElements(
      [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
      { min: 0, max: 3 }
    ),
    metadata: faker.helpers.maybe(() => ({
      [faker.lorem.word()]: faker.lorem.word(),
    }), { probability: 0.5 }) || {},
    uploadedBy: faker.string.uuid(),
    currentVersion: faker.number.int({ min: 1, max: 10 }),
    isDeleted: faker.datatype.boolean(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return {
    ...baseData,
    ...overrides,
  };
}

/**
 * Rule 7: Scenario-Based Helper Methods
 */
export const DocumentFactory = {
  /**
   * Generate a PDF document
   */
  pdf: (overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ 
      mimeType: 'application/pdf',
      filename: `${faker.lorem.slug()}.pdf`,
      originalName: `${faker.lorem.slug()}.pdf`,
      ...overrides 
    }),

  /**
   * Generate an image document
   */
  image: (overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ 
      mimeType: 'image/jpeg',
      filename: `${faker.lorem.slug()}.jpg`,
      originalName: `${faker.lorem.slug()}.jpg`,
      ...overrides 
    }),

  /**
   * Generate a text document
   */
  text: (overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ 
      mimeType: 'text/plain',
      filename: `${faker.lorem.slug()}.txt`,
      originalName: `${faker.lorem.slug()}.txt`,
      ...overrides 
    }),

  /**
   * Generate active (not deleted) document
   */
  active: (overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ isDeleted: false, ...overrides }),

  /**
   * Generate deleted document
   */
  deleted: (overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ isDeleted: true, ...overrides }),

  /**
   * Generate document with specific owner
   */
  ownedBy: (userId: string, overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ uploadedBy: userId, ...overrides }),

  /**
   * Generate with tags
   */
  withTags: (tags: string[], overrides?: Partial<DocumentFactoryData>): DocumentFactoryData =>
    generateDocument({ tags, ...overrides }),

  /**
   * Generate multiple documents
   */
  many: (count: number, overrides?: Partial<DocumentFactoryData>): DocumentFactoryData[] =>
    Array.from({ length: count }, () => generateDocument(overrides)),

  /**
   * Generate with specific storage provider
   */
  withProvider: (
    provider: 'local' | 's3' | 'gcs',
    overrides?: Partial<DocumentFactoryData>
  ): DocumentFactoryData =>
    generateDocument({ storageProvider: provider, ...overrides }),
};

/**
 * Rule 9: Entity Creation Utilities
 */
export const DocumentEntityFactory = {
  /**
   * Create DocumentEntity from factory data
   */
  create: (overrides?: Partial<DocumentFactoryData>): Effect.Effect<DocumentEntity, never, never> => {
    const data = generateDocument(overrides);
    return Effect.succeed(DocumentEntity.fromPersistence(data));
  },

  /**
   * Create PDF DocumentEntity
   */
  createPdf: (overrides?: Partial<DocumentFactoryData>): Effect.Effect<DocumentEntity, never, never> => {
    const data = DocumentFactory.pdf(overrides);
    return Effect.succeed(DocumentEntity.fromPersistence(data));
  },

  /**
   * Create image DocumentEntity
   */
  createImage: (overrides?: Partial<DocumentFactoryData>): Effect.Effect<DocumentEntity, never, never> => {
    const data = DocumentFactory.image(overrides);
    return Effect.succeed(DocumentEntity.fromPersistence(data));
  },

  /**
   * Create active DocumentEntity
   */
  createActive: (overrides?: Partial<DocumentFactoryData>): Effect.Effect<DocumentEntity, never, never> => {
    const data = DocumentFactory.active(overrides);
    return Effect.succeed(DocumentEntity.fromPersistence(data));
  },

  /**
   * Create multiple DocumentEntities
   */
  createMany: (count: number, overrides?: Partial<DocumentFactoryData>): Effect.Effect<DocumentEntity[], never, never> => {
    const documents = DocumentFactory.many(count, overrides).map(data => 
      DocumentEntity.fromPersistence(data)
    );
    return Effect.succeed(documents);
  },

  /**
   * Create synchronously
   */
  createSync: (overrides?: Partial<DocumentFactoryData>): DocumentEntity => {
    const data = generateDocument(overrides);
    return DocumentEntity.fromPersistence(data);
  },

  /**
   * Create PDF synchronously
   */
  createPdfSync: (overrides?: Partial<DocumentFactoryData>): DocumentEntity => {
    const data = DocumentFactory.pdf(overrides);
    return DocumentEntity.fromPersistence(data);
  },

  /**
   * Create active synchronously
   */
  createActiveSync: (overrides?: Partial<DocumentFactoryData>): DocumentEntity => {
    const data = DocumentFactory.active(overrides);
    return DocumentEntity.fromPersistence(data);
  },
};
