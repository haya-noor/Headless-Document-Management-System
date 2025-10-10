/**
 * Document E2E ( End to End) Round-trip Integration Tests
 * Tests the complete workflow: create document → add version → fetch latest → update → list
 * Following d5-effect.md acceptance criteria
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Effect } from 'effect';
import { faker } from '@faker-js/faker';
import { UserRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/user.repository';
import { DocumentRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/document.repository';
import { DocumentVersionRepository } from '../../src/app/infrastructure/repositories/implementations/document-version.repository';
import { UserEntity, UserRole } from '../../src/app/domain/user/entity';
import { DocumentEntity } from '../../src/app/domain/user/entity';
import { DocumentVersionEntity } from '../../src/app/domain/user/entity';

import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  clearDatabaseTables,
  DatabaseTestConfig 
} from './database.setup';
import { UserFactory } from '../factories/user.factory';
import { DocumentFactory } from '../factories/document.factory';

describe('Document E2E Round-trip Tests', () => {
  let dbConfig: DatabaseTestConfig;
  let userRepository: UserRepositoryImpl;
  let documentRepository: DocumentRepositoryImpl;
  let documentVersionRepository: DocumentVersionRepository;
  let testUser: UserEntity;

  beforeAll(async () => {
    // Setup fresh database per test suite
    dbConfig = await setupTestDatabase();
    userRepository = new UserRepositoryImpl();
    documentRepository = new DocumentRepositoryImpl(dbConfig.db);
    documentVersionRepository = new DocumentVersionRepository(dbConfig.db);
  });

  afterAll(async () => {
    // Cleanup database after test suite
    await cleanupTestDatabase(dbConfig);
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await clearDatabaseTables(dbConfig.db);
    
    // Create test user
    const userData = UserFactory.regular({
      email: 'e2e@test.com',
      firstName: 'E2E',
      lastName: 'User',
    });
    testUser = UserEntity.fromPersistence(userData);
    const serializedUser = userRepository.serializeToDatabase(testUser);
    
    await dbConfig.db.insert(dbConfig.db.schema.users).values({
      ...serializedUser,
      password: 'hashed-password',
    });
  });

  afterEach(async () => {
    // Additional cleanup if needed
  });

  describe('Complete E2E Workflow', () => {
    it('should complete full round-trip: create document → add version → fetch latest → update → list', async () => {
      // Step 1: Create document with faker data
      const testFilename = faker.system.fileName({ extensionCount: 1 });
      const testOriginalName = faker.system.fileName({ extensionCount: 1 });
      const testStorageKey = `storage/${faker.string.alphanumeric(10)}`;
      const testChecksum = faker.string.alphanumeric(16);
      const testTags = [faker.word.adjective(), faker.word.noun()];
      
      const documentData = DocumentFactory.create({
        filename: testFilename,
        originalName: testOriginalName,
        mimeType: faker.system.mimeType(),
        size: faker.number.int({ min: 100, max: 10000 }),
        storageKey: testStorageKey,
        storageProvider: 'local',
        checksum: testChecksum,
        tags: testTags,
        metadata: {
          description: faker.lorem.sentence(),
          category: faker.word.noun(),
        },
        uploadedBy: testUser.id.getValue(),
      });
      
      const document = DocumentEntity.fromPersistence(documentData);
      const serializedDocument = documentRepository.serializeToDatabase(document);
      
      await dbConfig.db.insert(dbConfig.db.schema.documents).values(serializedDocument);

      // Verify document was created
      const createdDocument = await documentRepository.findById(document.id.getValue());
      expect(createdDocument).not.toBeNull();
      expect(createdDocument?.filename).toBe(testFilename);
      expect(createdDocument?.currentVersion).toBe(1);

      // Step 2: Add version with faker data
      const versionFilename = faker.system.fileName({ extensionCount: 1 });
      const versionStorageKey = `storage/${faker.string.alphanumeric(10)}-v2`;
      const versionChecksum = faker.string.alphanumeric(16);
      const versionTags = [...testTags, faker.word.noun()];
      
      const versionData = {
        id: `${document.id.getValue()}-v2`,
        documentId: document.id.getValue(),
        version: 2,
        filename: versionFilename,
        mimeType: faker.system.mimeType(),
        size: faker.number.int({ min: 2000, max: 20000 }), // Different size
        storageKey: versionStorageKey,
        storageProvider: 'local' as const,
        checksum: versionChecksum,
        tags: versionTags,
        metadata: {
          description: faker.lorem.sentence(),
          category: faker.word.noun(),
          version: 2,
        },
        uploadedBy: testUser.id.getValue(),
      };
      
      const documentVersion = DocumentVersionEntity.fromPersistence(versionData);
      const serializedVersion = documentVersionRepository.serializeToDatabase(documentVersion);
      
      await dbConfig.db.insert(dbConfig.db.schema.documentVersions).values(serializedVersion);

      // Update document's current version
      await documentRepository.update(document.id.getValue(), {
        currentVersion: 2,
      });

      // Step 3: Fetch latest version
      const latestVersion = await documentVersionRepository.findLatestVersion(document.id.getValue());
      expect(latestVersion).not.toBeNull();
      expect(latestVersion?.version).toBe(2);
      expect(latestVersion?.filename).toBe(versionFilename);
      expect(latestVersion?.size).toBeGreaterThan(0);

      // Step 4: Update document with faker data
      const updatedFilename = faker.system.fileName({ extensionCount: 1 });
      const updatedTags = [...testTags, faker.word.adjective()];
      
      const updateData = {
        filename: updatedFilename,
        tags: updatedTags,
        metadata: {
          description: faker.lorem.sentence(),
          category: faker.word.noun(),
          updated: true,
        },
      };
      
      const updatedDocument = await documentRepository.update(document.id.getValue(), updateData);
      expect(updatedDocument).not.toBeNull();
      expect(updatedDocument?.filename).toBe(updatedFilename);
      expect(updatedDocument?.tags).toEqual(updatedTags);
      expect(updatedDocument?.metadata.updated).toBe(true);

      // Step 5: List documents
      const documents = await documentRepository.findMany({
        uploadedBy: testUser.id.getValue(),
      });
      
      expect(documents).toHaveLength(1);
      expect(documents[0].id).toBe(document.id.getValue());
      expect(documents[0].filename).toBe(updatedFilename);
      expect(documents[0].currentVersion).toBe(2);

      // Verify version history
      const versionHistory = await documentVersionRepository.getVersionHistory(document.id.getValue());
      // version.toBe(2) = version is 2 (latest)
      expect(versionHistory).toHaveLength(2);
      // versionHistory[0].version is the latest version
      // versionHistory[1].version is the oldest version
      expect(versionHistory[0].version).toBe(2); // Latest first
      expect(versionHistory[1].version).toBe(1);
    });

    it('should handle multiple documents with multiple versions', async () => {
      const documents: DocumentEntity[] = [];
      const versions: DocumentVersionEntity[] = [];

      // Create multiple documents
      for (let i = 1; i <= 3; i++) {
        const documentData = DocumentFactory.create({
          id: `e2e-doc-${i}`,
          filename: `e2e-document-${i}.pdf`,
          originalName: `E2E Document ${i}.pdf`,
          mimeType: 'application/pdf',
          size: 1024 * i,
          storageKey: `storage/e2e-document-${i}`,
          storageProvider: 'local',
          checksum: `e2e-checksum-doc-${i}`,
          tags: [`e2e`, `doc-${i}`],
          metadata: {
            description: `E2E document ${i}`,
            index: i,
          },
          uploadedBy: testUser.id.getValue(),
        });
        
        const document = DocumentEntity.fromPersistence(documentData);
        documents.push(document);
        
        const serializedDocument = documentRepository.serializeToDatabase(document);
        await dbConfig.db.insert(dbConfig.db.schema.documents).values(serializedDocument);

        // Create multiple versions for each document
        for (let v = 1; v <= 3; v++) {
          const versionData = {
            id: `e2e-doc-${i}-v${v}`,
            documentId: document.id.getValue(),
            version: v,
            filename: `e2e-document-${i}-v${v}.pdf`,
            mimeType: 'application/pdf',
            size: 1024 * i + (v * 100),
            storageKey: `storage/e2e-document-${i}-v${v}`,
            storageProvider: 'local' as const,
            checksum: `e2e-checksum-doc-${i}-v${v}`,
            tags: [`e2e`, `doc-${i}`, `version-${v}`],
            metadata: {
              description: `E2E document ${i} version ${v}`,
              index: i,
              version: v,
            },
            uploadedBy: testUser.id.getValue(),
          };
          
          const documentVersion = DocumentVersionEntity.fromPersistence(versionData);
          versions.push(documentVersion);
          
          const serializedVersion = documentVersionRepository.serializeToDatabase(documentVersion);
          await dbConfig.db.insert(dbConfig.db.schema.documentVersions).values(serializedVersion);
        }

        // Update document's current version
        await documentRepository.update(document.id.getValue(), {
          currentVersion: 3,
        });
      }

      // Verify all documents were created
      const allDocuments = await documentRepository.findMany({
        uploadedBy: testUser.id.getValue(),
      });
      expect(allDocuments).toHaveLength(3);

      // Verify version history for each document
      for (const document of documents) {
        const versionHistory = await documentVersionRepository.getVersionHistory(document.id.getValue());
        expect(versionHistory).toHaveLength(3);
        expect(versionHistory[0].version).toBe(3); // Latest first
        expect(versionHistory[2].version).toBe(1); // Oldest last
      }

      // Test pagination
      const paginatedDocuments = await documentRepository.findManyPaginated({
        page: 1,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      // toHaveLength(2) = length is 2 (2 documents) per page
      expect(paginatedDocuments.data).toHaveLength(2);
      // total = total number of documents, that is 3 in this case
      expect(paginatedDocuments.pagination.total).toBe(3);
      // hasNext = true if there is a next page
      expect(paginatedDocuments.pagination.hasNext).toBe(true);
    });

    it('should handle document updates with version tracking', async () => {
      // Create initial document
      const documentData = DocumentFactory.create({
        filename: 'version-tracked-document.pdf',
        originalName: 'Version Tracked Document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageKey: 'storage/version-tracked-document',
        storageProvider: 'local',
        checksum: 'version-checksum-1',
        tags: ['versioned'],
        metadata: {
          description: 'Version tracked document',
        },
        uploadedBy: testUser.id.getValue(),
      });
      
      const document = DocumentEntity.fromPersistence(documentData);
      const serializedDocument = documentRepository.serializeToDatabase(document);
      await dbConfig.db.insert(dbConfig.db.schema.documents).values(serializedDocument);

      // Create initial version
      const initialVersionData = {
        id: `${document.id.getValue()}-v1`,
        documentId: document.id.getValue(),
        version: 1,
        filename: 'version-tracked-document-v1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageKey: 'storage/version-tracked-document-v1',
        storageProvider: 'local' as const,
        checksum: 'version-checksum-1',
        tags: ['versioned', 'initial'],
        metadata: {
          description: 'Initial version',
          version: 1,
        },
        uploadedBy: testUser.id.getValue(),
      };
      
      const initialVersion = DocumentVersionEntity.fromPersistence(initialVersionData);
      const serializedInitialVersion = await Effect.runPromise(DocumentVersionSerialization.toDatabase(initialVersion));
      await dbConfig.db.insert(dbConfig.db.schema.documentVersions).values(serializedInitialVersion);

      // Update document (this should create a new version)
      const updateData = {
        filename: 'version-tracked-document-updated.pdf',
        size: 2048,
        tags: ['versioned', 'updated'],
        metadata: {
          description: 'Updated version',
          updated: true,
        },
      };
      
      const updatedDocument = await documentRepository.update(document.id.getValue(), updateData);
      expect(updatedDocument).not.toBeNull();
      expect(updatedDocument?.filename).toBe('version-tracked-document-updated.pdf');
      expect(updatedDocument?.size).toBe(2048);

      // Create new version record for the update
      const newVersionData = {
        id: `${document.id.getValue()}-v2`,
        documentId: document.id.getValue(),
        version: 2,
        filename: 'version-tracked-document-v2.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        storageKey: 'storage/version-tracked-document-v2',
        storageProvider: 'local' as const,
        checksum: 'version-checksum-2',
        tags: ['versioned', 'updated'],
        metadata: {
          description: 'Updated version',
          version: 2,
          updated: true,
        },
        uploadedBy: testUser.id.getValue(),
      };
      
      const newVersion = DocumentVersionEntity.fromPersistence(newVersionData);
      const serializedNewVersion = await Effect.runPromise(DocumentVersionSerialization.toDatabase(newVersion));
      await dbConfig.db.insert(dbConfig.db.schema.documentVersions).values(serializedNewVersion);

      // Update document's current version
      await documentRepository.update(document.id.getValue(), {
        currentVersion: 2,
      });

      // Verify version history
      const versionHistory = await documentVersionRepository.getVersionHistory(document.id.getValue());
      expect(versionHistory).toHaveLength(2);
      expect(versionHistory[0].version).toBe(2);
      expect(versionHistory[0].size).toBe(2048);
      expect(versionHistory[1].version).toBe(1);
      expect(versionHistory[1].size).toBe(1024);

      // Verify latest version
      const latestVersion = await documentVersionRepository.findLatestVersion(document.id.getValue());
      expect(latestVersion?.version).toBe(2);
      expect(latestVersion?.size).toBe(2048);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity between documents and versions', async () => {
      // Create document
      const documentData = DocumentFactory.create({
        uploadedBy: testUser.id.getValue(),
      });
      const document = DocumentEntity.fromPersistence(documentData);
      const serializedDocument = documentRepository.serializeToDatabase(document);
      await dbConfig.db.insert(dbConfig.db.schema.documents).values(serializedDocument);

      // Create version
      const versionData = {
        id: `${document.id.getValue()}-v1`,
        documentId: document.id.getValue(),
        version: 1,
        filename: 'integrity-test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageKey: 'storage/integrity-test',
        storageProvider: 'local' as const,
        checksum: 'integrity-checksum',
        tags: ['integrity'],
        metadata: { test: 'integrity' },
        uploadedBy: testUser.id.getValue(),
      };
      
      const documentVersion = DocumentVersionEntity.fromPersistence(versionData);
      const serializedVersion = documentVersionRepository.serializeToDatabase(documentVersion);
      await dbConfig.db.insert(dbConfig.db.schema.documentVersions).values(serializedVersion);

      // Verify relationship
      const versions = await documentVersionRepository.findByDocumentId(document.id.getValue());
      expect(versions).toHaveLength(1);
      expect(versions[0].documentId.getValue()).toBe(document.id.getValue());

      // Verify document exists
      const foundDocument = await documentRepository.findById(document.id.getValue());
      expect(foundDocument).not.toBeNull();
    });

    it('should handle concurrent operations correctly', async () => {
      // This test would verify that concurrent document operations
      // don't cause data corruption or race conditions
      
      const documentData = DocumentFactory.create({
        uploadedBy: testUser.id.getValue(),
      });
      const document = DocumentEntity.fromPersistence(documentData);
      const serializedDocument = documentRepository.serializeToDatabase(document);
      await dbConfig.db.insert(dbConfig.db.schema.documents).values(serializedDocument);

      // Simulate concurrent updates
      const updatePromises = [
        documentRepository.update(document.id.getValue(), { filename: 'concurrent-1.pdf' }),
        documentRepository.update(document.id.getValue(), { filename: 'concurrent-2.pdf' }),
        documentRepository.update(document.id.getValue(), { filename: 'concurrent-3.pdf' }),
      ];

      const results = await Promise.all(updatePromises);
      
      // At least one update should succeed
      const successfulUpdates = results.filter(result => result !== null);
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });
  });
});
