/**
 * User Repository Integration Tests
 * Tests against real Postgres database using Testcontainers
 * Following d5-effect.md requirements for E2E 
 * 
 * 
 * Full repository layer testing: CRUD, queries, pagination, search, filtering,
 *  edge cases
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Effect, Option } from 'effect';
import { faker } from '@faker-js/faker';
import { UserRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/user.repository';
import { UserEntity, UserRole } from '../../src/app/domain/user/entity';
// Serialization is now handled by repository methods
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  clearDatabaseTables,
  DatabaseTestConfig 
} from './database.setup';
import { createMinimalSeedData, SeedData } from './seed-data';
import { UserFactory } from '../factories/user.factory';

describe('User Repository Integration Tests', () => {
  let dbConfig: DatabaseTestConfig;
  let userRepository: UserRepositoryImpl;
  let seedData: SeedData;

  beforeAll(async () => {
    // Setup fresh database per test suite
    // Following d5-effect.md: "Spin up a fresh DB and repository (per test)"
    dbConfig = await setupTestDatabase();
    userRepository = new UserRepositoryImpl();
    
    // Create seed data
    seedData = createMinimalSeedData();
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
  });

  afterEach(async () => {
    // Additional cleanup if needed
  });

  describe('Basic CRUD Operations', () => {
    it('should create and find user by ID', async () => {
      // Arrange - Generate test data with faker
      const testEmail = faker.internet.email();
      const testFirstName = faker.person.firstName();
      const testLastName = faker.person.lastName();
      
      const userData = UserFactory.regular({
        email: testEmail,
        firstName: testFirstName,
        lastName: testLastName,
      });
      const user = UserEntity.fromPersistence(userData);

      // Act - Create user equivalent to add()
      const serializedUser = userRepository.serializeToDatabase(user);
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: faker.internet.password(), // Generate random password
      });

      // Act - Find user, equivalent to fetchByUserId()
      const foundUser = await userRepository.findById(user.id.getValue());

      // Assert
      expect(Option.isSome(foundUser)).toBe(true);
      if (Option.isSome(foundUser)) {
        expect(foundUser.value.email).toBe(testEmail);
        expect(foundUser.value.firstName).toBe(testFirstName);
        expect(foundUser.value.lastName).toBe(testLastName);
      }
    });


    // Update: change fields and persist, equivalent to update() 
    
    it('should update user and persist changes', async () => {
      // Arrange - Generate test data with faker
      const originalEmail = faker.internet.email();
      const originalFirstName = faker.person.firstName();
      const originalLastName = faker.person.lastName();
      const updatedFirstName = faker.person.firstName();
      const updatedLastName = faker.person.lastName();
      
      const userData = UserFactory.regular({
        email: originalEmail,
        firstName: originalFirstName,
        lastName: originalLastName,
      });
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: faker.internet.password(),
      });

      // Act - Update user
      const updateData = {
        firstName: updatedFirstName,
        lastName: updatedLastName,
      };
      const updatedUser = await userRepository.update(user.id.getValue(), updateData);

      // Assert , verify mutation is persisted 
      expect(Option.isSome(updatedUser)).toBe(true);
      if (Option.isSome(updatedUser)) {
        expect(updatedUser.value.firstName).toBe(updatedFirstName);
        expect(updatedUser.value.lastName).toBe(updatedLastName);
        expect(updatedUser.value.email).toBe(originalEmail); // Unchanged
      }
    });

    it('should delete user and verify deletion', async () => {
      // Arrange - Generate test data with faker
      const testEmail = faker.internet.email();
      
      const userData = UserFactory.regular({
        email: testEmail,
      });
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: faker.internet.password(),
      });

      // Act - Delete user, equivalent to remove() 
      const deleted = await userRepository.delete(user.id.getValue());

      // Assert
      expect(deleted).toBe(true);
      
      // Verify user is gone (equivalent to fetchByUserId returning Option.None)
      const foundUser = await userRepository.findById(user.id.getValue());
      expect(Option.isNone(foundUser)).toBe(true);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Insert seed users
      for (const user of seedData.users) {
        const serializedUser = userRepository.serializeToDatabase(user);
        await dbConfig.db.insert(dbConfig.db.schema.users).values({
          ...serializedUser,
          password: 'hashed-password',
        });
      }
    });

// find user by email
    it('should find user by email', async () => {
      // Arrange - Generate test data with faker
      const testEmail = faker.internet.email();
      const userData = UserFactory.regular({ email: testEmail });
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: faker.internet.password(),
      });

      // Act
      const foundUser = await userRepository.findByEmail(testEmail);

      // Assert
      expect(Option.isSome(foundUser)).toBe(true);
      if (Option.isSome(foundUser)) {
        expect(foundUser.value.email).toBe(testEmail);
      }
    });

    it('should find users by role', async () => {
      // Arrange - Generate test data with faker
      const adminUserData = UserFactory.regular({ role: 'admin' });
      const adminUser = UserEntity.fromPersistence(adminUserData);
      const serializedAdminUser = userRepository.serializeToDatabase(adminUser);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedAdminUser,
        password: faker.internet.password(),
      });

      // Act
      const adminUsers = await userRepository.findByRole(UserRole.ADMIN);

      // Assert
      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].role).toBe(UserRole.ADMIN);
    });

    it('should find active users', async () => {
      // Arrange - Generate test data with faker
      const activeUserData = UserFactory.regular({ isActive: true });
      const activeUser = UserEntity.fromPersistence(activeUserData);
      const serializedActiveUser = userRepository.serializeToDatabase(activeUser);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedActiveUser,
        password: faker.internet.password(),
      });

      // Act
      const activeUsers = await userRepository.findActiveUsers();

      // Assert
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(activeUsers.every(user => user.isActive)).toBe(true);
    });

    // check if user exists, equivalent to exists()

    
    it('should check if user exists', async () => {
      // Arrange - Generate test data with faker
      const testEmail = faker.internet.email();
      const userData = UserFactory.regular({ email: testEmail });
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: faker.internet.password(),
      });

      // Act
      const exists = await userRepository.exists(user.id.getValue());
      const notExists = await userRepository.exists(faker.string.uuid());

      // Assert
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should check if email is taken', async () => {
      // Arrange - Generate test data with faker
      const testEmail = faker.internet.email();
      const userData = UserFactory.regular({ email: testEmail });
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: faker.internet.password(),
      });

      // Act
      const isTaken = await userRepository.isEmailTaken(testEmail);
      const isNotTaken = await userRepository.isEmailTaken(faker.internet.email());

      // Assert
      expect(isTaken).toBe(true);
      expect(isNotTaken).toBe(false);
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Insert faker-generated users
      const users = [];
      for (let i = 0; i < 5; i++) {
        const userData = UserFactory.regular({
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        });
        const user = UserEntity.fromPersistence(userData);
        users.push(user);
      }

      for (const user of users) {
        const serializedUser = userRepository.serializeToDatabase(user);
        await dbConfig.db.insert(dbConfig.db.schema.users).values({
          ...serializedUser,
          password: faker.internet.password(),
        });
      }
    });

    it('should paginate users correctly', async () => {
      // Act
      const page1 = await userRepository.findManyPaginated({
        page: 1,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Assert
      expect(page1.data).toHaveLength(2);
      // page is the page number, that is 1 in this case
      expect(page1.pagination.page).toBe(1);
      // limit here is the number of records per page, that is 2 in this case
      expect(page1.pagination.limit).toBe(2);
      // total is the total number of records, that is 5 in this case
      expect(page1.pagination.total).toBe(5); // Based on faker-generated data
      // hasNext is true if there is a next page
      // hasPrev is true if there is a previous page
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);
    });

    it('should handle second page correctly', async () => {
      // Act
      const page2 = await userRepository.findManyPaginated({
        page: 2,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Assert
      expect(page2.data).toHaveLength(2); // Second page with 2 users
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrev).toBe(true);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Insert seed users
      for (const user of seedData.users) {
        const serializedUser = userRepository.serializeToDatabase(user);
        await dbConfig.db.insert(dbConfig.db.schema.users).values({
          ...serializedUser,
          password: 'hashed-password',
        });
      }
    });

    it('should search users by name', async () => {
      // Act
      const searchResults = await userRepository.searchUsers('User1', 10);

      // Assert
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some(user => user.firstName.includes('User1'))).toBe(true);
    });

    it('should filter users by role', async () => {
      // Act
      const filteredUsers = await userRepository.findMany({
        role: UserRole.USER,
      });

      // Assert
      expect(filteredUsers.length).toBeGreaterThan(0);
      expect(filteredUsers.every(user => user.role === UserRole.USER)).toBe(true);
    });

    it('should filter users by active status', async () => {
      // Act
      const activeUsers = await userRepository.findMany({
        isActive: true,
      });

      // Assert
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(activeUsers.every(user => user.isActive)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent user ID', async () => {
      // Act
      const foundUser = await userRepository.findById('non-existent-id');

      // Assert
      expect(Option.isNone(foundUser)).toBe(true);
    });

    it('should handle unique email constraint', async () => {
      // Arrange
      const userData1 = UserFactory.regular({
        email: 'unique@test.com',
      });
      const userData2 = UserFactory.regular({
        email: 'unique@test.com', // Same email
      });

      const user1 = UserEntity.fromPersistence(userData1);
      const user2 = UserEntity.fromPersistence(userData2);

      const serializedUser1 = await Effect.runPromise(UserSerialization.toDatabase(user1));
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser1,
        password: 'hashed-password',
      });

      // Act & Assert - Should throw error for duplicate email
      const serializedUser2 = await Effect.runPromise(UserSerialization.toDatabase(user2));
      await expect(
        dbConfig.db.insert(dbConfig.db.schema.users).values({
          ...serializedUser2,
          password: 'hashed-password',
        })
      ).rejects.toThrow();
    });

    it('should handle cascade delete', async () => {
      // This test would verify that when a user is deleted,
      // related documents are handled appropriately
      // (implementation depends on business rules)
      
      // For now, just verify user deletion works
      const userData = UserFactory.regular();
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: 'hashed-password',
      });

      const deleted = await userRepository.delete(user.id.getValue());
      expect(deleted).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should leverage proper indexes for email queries', async () => {
      // This test would verify that email queries use the email index
      // and don't perform sequential scans
      
      // Insert test user
      const userData = UserFactory.regular({
        email: 'performance@test.com',
      });
      const user = UserEntity.fromPersistence(userData);
      const serializedUser = userRepository.serializeToDatabase(user);
      
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...serializedUser,
        password: 'hashed-password',
      });

      // Act
      const startTime = Date.now();
      const foundUser = await userRepository.findByEmail('performance@test.com');
      const endTime = Date.now();

      // Assert
      expect(Option.isSome(foundUser)).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast with index
    });
  });
});
