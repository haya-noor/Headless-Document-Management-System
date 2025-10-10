/**
 * Seed Data for Integration Tests
 * Deterministic test data for consistent testing
 * we use seed data to create the same data every time for testing otherwise
 * we would get different data every time we run the tests and that would make the 
 * tests flaky(randomly failing)
 */

import { Effect } from 'effect';
import { UserEntity, UserRole } from '../../src/app/domain/user/entity';
import { DocumentEntity } from '../../src/app/domain/user/entity';
import { DocumentVersionEntity } from '../../src/app/domain/user/entity';
import { UserFactory } from '../factories/user.factory';
import { DocumentFactory } from '../factories/document.factory';

/**
 * Seed data configuration
 */
export interface SeedDataConfig {
  users: {
    count: number;
    adminCount: number;
    inactiveCount: number;
  };
  documents: {
    count: number;
    versionsPerDocument: number;
  };
}

/**
 * Default seed configuration
 */
export const DEFAULT_SEED_CONFIG: SeedDataConfig = {
  users: {
    // count is the total number of users, that is 10 in this case
    count: 10,
    // adminCount is the number of admin users, that is 2 in this case
    adminCount: 2,
    // inactiveCount is the number of inactive users, that is 1 in this case
    inactiveCount: 1,
  },
  documents: {
    // count is the total number of documents, that is 20 in this case
    count: 20,
    // versionsPerDocument is the number of versions per document, that is 3 in this case
    versionsPerDocument: 3,
  },
};

/**
 * Seed data types
 */
export interface SeedData {
  users: UserEntity[];
  documents: DocumentEntity[];
  documentVersions: DocumentVersionEntity[];
}

/**
 * Create deterministic seed data using Faker with fixed seed
 * This ensures the same "random" data is generated every time
 */
export function createSeedData(config: SeedDataConfig = DEFAULT_SEED_CONFIG): SeedData {
  // Set faker seed for deterministic data
  // Same seed = Same sequence of "random" values every time
  const faker = require('@faker-js/faker');

  /*
  faker.seed(12345) = “Generate random data deterministically 
  always the same output for this seed.
  */
  faker.seed(12345); // Fixed seed for consistent data


  const users: UserEntity[] = [];
  const documents: DocumentEntity[] = [];
  const documentVersions: DocumentVersionEntity[] = [];

  // Create users using Faker for realistic but deterministic data
  for (let i = 0; i < config.users.count; i++) {
    const isAdmin = i < config.users.adminCount;
    const isInactive = i >= config.users.count - config.users.inactiveCount;
    
    // Use Faker to generate realistic data, but with predictable patterns
    const userData = UserFactory.regular({
      // Let Faker generate realistic data based on seed
      // This will be the SAME every time due to fixed seed
      role: isAdmin ? 'admin' : 'user',
      isActive: !isInactive,
    });
    
    users.push(UserEntity.fromPersistence(userData));
  }

  // Create documents using Faker for realistic but deterministic data
  for (let i = 0; i < config.documents.count; i++) {
    const uploaderIndex = i % users.length;
    const uploader = users[uploaderIndex];
    
    // Use Faker to generate realistic document data
    // Same seed ensures same "random" values every time
    const documentData = DocumentFactory.create({
      // Let Faker generate realistic filenames, sizes, etc.
      // This will be the SAME every time due to fixed seed
      uploadedBy: uploader.id.getValue(),
    });
    
    documents.push(DocumentEntity.fromPersistence(documentData));
  }

  // Create document versions using Faker for realistic data
  for (const document of documents) {
    for (let v = 1; v <= config.documents.versionsPerDocument; v++) {
      // Use Faker to generate realistic version data
      // Each version will have slightly different but deterministic data
      const versionData = {
        id: `${document.id.getValue()}-v${v}`,
        documentId: document.id.getValue(),
        version: v,
        filename: faker.system.fileName(), // Realistic filename from Faker
        mimeType: faker.helpers.arrayElement(['application/pdf', 'image/jpeg', 'text/plain']),
        size: faker.number.int({ min: document.size, max: document.size + 1000 }),
        storageKey: faker.system.filePath(), // Realistic storage path
        storageProvider: 'local' as const,
        checksum: faker.string.alphanumeric(64), // Realistic checksum
        tags: faker.helpers.arrayElements(['urgent', 'draft', 'final', 'review'], { min: 1, max: 3 }),
        metadata: {
          version: v,
          description: faker.lorem.sentence(),
          createdBy: faker.person.fullName(),
        },
        uploadedBy: document.uploadedBy,
      };
      
      documentVersions.push(DocumentVersionEntity.fromPersistence(versionData));
    }
  }

  return {
    users,
    documents,
    documentVersions,
  };
}

/**
 * Create minimal seed data for basic tests
 */
export function createMinimalSeedData(): SeedData {
  return createSeedData({
    users: {
      count: 3,
      adminCount: 1,
      inactiveCount: 0,
    },
    documents: {
      count: 5,
      versionsPerDocument: 2,
    },
  });
}

/**
 * Create large seed data for performance tests
 */
export function createLargeSeedData(): SeedData {
  return createSeedData({
    users: {
      count: 100,
      adminCount: 10,
      inactiveCount: 5,
    },
    documents: {
      count: 500,
      versionsPerDocument: 5,
    },
  });
}

/**
 * Create seed data with specific characteristics
 */
export function createCustomSeedData(overrides: Partial<SeedDataConfig>): SeedData {
  const config = { ...DEFAULT_SEED_CONFIG, ...overrides };
  return createSeedData(config);
}
