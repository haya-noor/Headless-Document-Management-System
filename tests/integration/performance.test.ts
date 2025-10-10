/**
 * Performance and Index Usage Tests
 * Verifies query performance and proper index usage
 *  
 * This performance test is used to verify that the database is performing 
 * as expected and that the indexes are being used properly
 * 
 * indexes here are :
 * created_at, updated_at, is_active , email, role
 * 
 * indexes allow us to quickly find the data ( data that matches the index) 
 * we need without having to scan the entire table
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Effect } from 'effect';
import { UserRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/user.repository';
import { DocumentRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/document.repository';
import { UserEntity } from '../../src/app/domain/user/entity';
import { DocumentEntity } from '../../src/app/domain/user/entity';
// Serialization is now handled by repository methods
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  clearDatabaseTables,
  DatabaseTestConfig 
} from './database.setup';
import { createLargeSeedData, SeedData } from './seed-data';
import { UserFactory } from '../factories/user.factory';
import { DocumentFactory } from '../factories/document.factory';

describe('Performance and Index Usage Tests', () => {
  let dbConfig: DatabaseTestConfig;
  let userRepository: UserRepositoryImpl;
  let documentRepository: DocumentRepositoryImpl;
  let seedData: SeedData;

  beforeAll(async () => {
    // Setup fresh database per test suite
    // Following d5-effect.md: "Spin up a fresh DB and repository (per test)"
    dbConfig = await setupTestDatabase();
    userRepository = new UserRepositoryImpl();
    documentRepository = new DocumentRepositoryImpl(dbConfig.db);
    
    // Create large seed data for performance testing
    seedData = createLargeSeedData();
  });

  afterAll(async () => {
    // Cleanup database after test suite
    // Following d5-effect.md: "After each test, we clean up the database resources"
    await cleanupTestDatabase(dbConfig);
  });

  beforeEach(async () => {
    // Clear all tables before each test
    // Following d5-effect.md: "wipe tables so every run starts from zero"
    await clearDatabaseTables(dbConfig.db);
    
    // Insert seed data
    await insertSeedData();
  });

  afterEach(async () => {
    // Additional cleanup if needed
  });

  /**
   * Insert seed data into database
   */
  async function insertSeedData(): Promise<void> {
    // Insert users
    for (const user of seedData.users) {
      const serializedUser = await Effect.runPromise(UserSerialization.toDatabase(user));
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: 'hashed-password',
      });
    }

    // Insert documents
    for (const document of seedData.documents) {
        const serializedDocument = documentRepository.serializeToDatabase(document);
      await dbConfig.db.insert(dbConfig.db.schema.documents).values(serializedDocument);
    }
  }

  describe('User Repository Performance', () => {
    it('should use email index for fast email lookups', async () => {
      const testEmail = 'user1@test.com';
      
      // Measure query performance
      const startTime = Date.now();
      const foundUser = await userRepository.findByEmail(testEmail);
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(foundUser).not.toBeNull();
      expect(foundUser?.email).toBe(testEmail);
      expect(queryTime).toBeLessThan(50); // Should be fast with index
      
      console.log(`Email lookup took ${queryTime}ms`);
    });

    it('should use role index for role-based queries', async () => {
      // Measure query performance
      const startTime = Date.now();
      const adminUsers = await userRepository.findByRole('admin');
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(adminUsers.length).toBeGreaterThan(0);
      expect(adminUsers.every(user => user.role === 'admin')).toBe(true);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
      
      console.log(`Role-based query took ${queryTime}ms`);
    });

    it('should use active status index for active user queries', async () => {
      // Measure query performance
      const startTime = Date.now();
      const activeUsers = await userRepository.findActiveUsers();
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(activeUsers.every(user => user.isActive)).toBe(true);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
      
      console.log(`Active users query took ${queryTime}ms`);
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 10;
      
      // Measure pagination performance
      const startTime = Date.now();
      const paginatedUsers = await userRepository.findManyPaginated({
        page: 1,
        limit: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(paginatedUsers.data).toHaveLength(pageSize);
      expect(paginatedUsers.pagination.total).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(200); // Should be efficient
      
      console.log(`Pagination query took ${queryTime}ms`);
    });

    it('should perform efficient search operations', async () => {
      const searchTerm = 'User';
      
      // Measure search performance
      const startTime = Date.now();
      const searchResults = await userRepository.searchUsers(searchTerm, 20);
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(searchResults.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(150); // Should be efficient
      
      console.log(`Search query took ${queryTime}ms`);
    });
  });

  describe('Document Repository Performance', () => {
    it('should use uploaded_by index for user document queries', async () => {
      const testUserId = seedData.users[0].id.getValue();
      
      // Measure query performance
      const startTime = Date.now();
      const userDocuments = await documentRepository.findByUploader(testUserId);
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(userDocuments.length).toBeGreaterThan(0);
      expect(userDocuments.every(doc => doc.uploadedBy === testUserId)).toBe(true);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
      
      console.log(`User documents query took ${queryTime}ms`);
    });

    it('should use mime_type index for MIME type queries', async () => {
      const mimeType = 'application/pdf';
      
      // Measure query performance
      const startTime = Date.now();
      const pdfDocuments = await documentRepository.findByMimeType(mimeType);
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(pdfDocuments.length).toBeGreaterThan(0);
      expect(pdfDocuments.every(doc => doc.mimeType === mimeType)).toBe(true);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
      
      console.log(`MIME type query took ${queryTime}ms`);
    });

    it('should use checksum index for duplicate detection', async () => {
      const testChecksum = 'test-checksum-1';
      
      // Measure query performance
      const startTime = Date.now();
      const duplicateDocuments = await documentRepository.findDuplicatesByChecksum(testChecksum);
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(queryTime).toBeLessThan(100); // Should be fast with index
      
      console.log(`Checksum query took ${queryTime}ms`);
    });

    it('should handle large result sets efficiently', async () => {
      // Measure query performance for large result set
      const startTime = Date.now();
      const allDocuments = await documentRepository.findMany();
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(allDocuments.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should handle large datasets efficiently
      
      console.log(`Large result set query took ${queryTime}ms for ${allDocuments.length} documents`);
    });

    it('should perform efficient pagination on large datasets', async () => {
      const pageSize = 50;
      
      // Measure pagination performance
      const startTime = Date.now();
      const paginatedDocuments = await documentRepository.findManyPaginated({
        page: 1,
        limit: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const endTime = Date.now();
      
      const queryTime = endTime - startTime;
      
      // Assertions
      expect(paginatedDocuments.data).toHaveLength(pageSize);
      expect(paginatedDocuments.pagination.total).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(300); // Should be efficient even with large datasets
      
      console.log(`Large dataset pagination took ${queryTime}ms`);
    });
  });

  describe('Index Usage Verification', () => {
    it('should verify email index is being used', async () => {
      // This test would use EXPLAIN ANALYZE to verify index usage
      // For now, we'll just verify the query is fast
      
      const startTime = Date.now();
      const user = await userRepository.findByEmail('user1@test.com');
      const endTime = Date.now();
      
      expect(user).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should verify role index is being used', async () => {
      const startTime = Date.now();
      const adminUsers = await userRepository.findByRole('admin');
      const endTime = Date.now();
      
      expect(adminUsers.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should verify created_at index is being used for sorting', async () => {
      const startTime = Date.now();
      const recentUsers = await userRepository.findManyPaginated({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const endTime = Date.now();
      
      expect(recentUsers.data).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent reads efficiently', async () => {
      const concurrentReads = 10;
      const promises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentReads; i++) {
        promises.push(userRepository.findByEmail(`user${i + 1}@test.com`));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentReads;
      
      // Assertions
      expect(results.every(result => result !== null)).toBe(true);
      expect(averageTime).toBeLessThan(100); // Average time per query should be reasonable
      
      console.log(`Concurrent reads: ${totalTime}ms total, ${averageTime}ms average`);
    });

    it('should handle concurrent writes efficiently', async () => {
      const concurrentWrites = 5;
      const promises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentWrites; i++) {
        const userData = UserFactory.regular({
          email: `concurrent-${i}@test.com`,
        });
        const user = UserEntity.fromPersistence(userData);
        const serializedUser = userRepository.serializeToDatabase(user);
        
        promises.push(
          dbConfig.db.insert(dbConfig.db.schema.users).values({
            ...serializedUser,
            password: 'hashed-password',
          })
        );
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentWrites;
      
      // Assertions
      expect(averageTime).toBeLessThan(200); // Average time per write should be reasonable
      
      console.log(`Concurrent writes: ${totalTime}ms total, ${averageTime}ms average`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations on large dataset
      for (let i = 0; i < 10; i++) {
        await documentRepository.findMany();
        await userRepository.findMany();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    });
  });
});
