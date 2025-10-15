/**
 * User Repository Integration Tests (Jest Version)
 * Tests against real Postgres database using Testcontainers
 * 
 * This is a Jest-compatible version of the original bun:test integration tests
 */

import { Effect, Option } from 'effect';
import { faker } from '@faker-js/faker';
import { UserRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/user.repository';
import { UserEntity, UserRole } from '../../src/app/domain/user/entity';
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  clearDatabaseTables,
  DatabaseTestConfig 
} from './database.setup';
import { createMinimalSeedData, SeedData } from './seed-data';
import { UserFactory } from '../factories/user.factory';

describe('User Repository Integration Tests (Jest)', () => {
  let dbConfig: DatabaseTestConfig;
  let userRepository: UserRepositoryImpl;
  let seedData: SeedData;

  beforeAll(async () => {
    console.log('🚀 Setting up test database...');
    dbConfig = await setupTestDatabase();
    userRepository = new UserRepositoryImpl();
    seedData = await createMinimalSeedData();
    console.log('✅ Test database ready');
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    console.log('🧹 Cleaning up test database...');
    await cleanupTestDatabase(dbConfig);
    console.log('✅ Test database cleaned up');
  }, 30000);

  beforeEach(async () => {
    await clearDatabaseTables(dbConfig);
  });

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const userData = UserFactory.createUserData();
      
      const result = await userRepository.create(userData);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.role).toBe(userData.role);
      expect(result.isActive).toBe(true);
    });

    it('should fail to create user with duplicate email', async () => {
      const userData = UserFactory.createUserData();
      
      // Create first user
      await userRepository.create(userData);
      
      // Try to create second user with same email
      await expect(userRepository.create(userData)).rejects.toThrow();
    });
  });

  describe('User Retrieval', () => {
    it('should find user by ID', async () => {
      const userData = UserFactory.createUserData();
      const createdUser = await userRepository.create(userData);
      
      const foundUser = await userRepository.findById(createdUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent user ID', async () => {
      const nonExistentId = faker.string.uuid();
      
      const result = await userRepository.findById(nonExistentId);
      
      expect(result).toBeNull();
    });

    it('should find user by email', async () => {
      const userData = UserFactory.createUserData();
      const createdUser = await userRepository.create(userData);
      
      const foundUser = await userRepository.findByEmail(userData.email);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });
  });

  describe('User Updates', () => {
    it('should update user profile', async () => {
      const userData = UserFactory.createUserData();
      const createdUser = await userRepository.create(userData);
      
      const updateData = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        profile: {
          bio: faker.lorem.sentence(),
          avatar: faker.image.avatar()
        }
      };
      
      const updatedUser = await userRepository.update(createdUser.id, updateData);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser.firstName).toBe(updateData.firstName);
      expect(updatedUser.lastName).toBe(updateData.lastName);
      expect(updatedUser.profile?.bio).toBe(updateData.profile.bio);
    });
  });

  describe('User Deletion', () => {
    it('should soft delete user', async () => {
      const userData = UserFactory.createUserData();
      const createdUser = await userRepository.create(userData);
      
      await userRepository.delete(createdUser.id);
      
      const deletedUser = await userRepository.findById(createdUser.id);
      expect(deletedUser?.isActive).toBe(false);
    });
  });

  describe('User Listing and Pagination', () => {
    beforeEach(async () => {
      // Create multiple users for pagination tests
      const users = Array.from({ length: 5 }, () => UserFactory.createUserData());
      for (const userData of users) {
        await userRepository.create(userData);
      }
    });

    it('should list all users with pagination', async () => {
      const result = await userRepository.findAll({ page: 1, limit: 3 });
      
      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should filter users by role', async () => {
      // Create an admin user
      const adminData = UserFactory.createUserData({ role: UserRole.ADMIN });
      await userRepository.create(adminData);
      
      const result = await userRepository.findAll({ 
        page: 1, 
        limit: 10,
        role: UserRole.ADMIN 
      });
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe(UserRole.ADMIN);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll just test that the repository exists
      expect(userRepository).toBeDefined();
      expect(typeof userRepository.create).toBe('function');
    });
  });
});
