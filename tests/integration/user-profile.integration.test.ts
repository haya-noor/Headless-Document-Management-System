/**
 * User Profile Integration Tests
 * Tests specialized profile methods: complete profiles, minimal profiles, phone number lookup
 * Following d5-effect.md requirements for profile-specific functionality
 * 
 * 
 * Focuses on  complete vs minimal profiles, phone number lookup, 
 * and user existence check
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Effect, Option } from 'effect';
import { UserRepositoryImpl } from '../../src/app/infrastructure/repositories/implementations/user.repository';
import { UserEntity, UserRole } from '../../src/app/domain/user/entity';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDatabaseConfig 
} from './database.setup';

describe('User Profile Integration Tests', () => {
  let userRepository: UserRepositoryImpl;
  let dbConfig: any;

  // setup the database and the user repository 
  beforeAll(async () => {
    dbConfig = await setupTestDatabase();
    userRepository = new UserRepositoryImpl();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await dbConfig.db.delete(dbConfig.db.schema.users);
  });

  describe('Complete Profile Methods', () => {
    it('should fetch users with complete profiles', async () => {
      // Arrange - Generate realistic test data with faker
      const completeUserData = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate(),
        phoneNumber: faker.phone.number(),
        profileImage: faker.image.avatar()
      };

      const incompleteUserData = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      };

      const completeUser = UserEntity.createWithCompleteProfile({
        ...completeUserData,
        role: UserRole.USER
      });

      const incompleteUser = UserEntity.create({
        ...incompleteUserData,
        role: UserRole.USER
      });

      // Insert users
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...userRepository.serializeToDatabase(completeUser),
        password: 'hashed-password-1'
      });

      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...userRepository.serializeToDatabase(incompleteUser),
        password: 'hashed-password-2'
      });

      // Act - Fetch users with complete profiles
      const result = await userRepository.fetchWithCompleteProfiles({
        page: 1,
        limit: 10
      });

      // Assert - Use stored faker data for verification
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe(completeUserData.email);
      expect(result.data[0].dateOfBirth).toBeDefined();
      expect(result.data[0].phoneNumber).toBe(completeUserData.phoneNumber);
      expect(result.data[0].profileImage).toBe(completeUserData.profileImage);
      expect(result.pagination.total).toBe(1);
    });

    it('should fetch users with minimal profiles', async () => {
      // Arrange - Create users with different profile completeness levels
      const completeUser = UserEntity.createWithCompleteProfile({
        id: 'complete-user-2',
        email: 'complete2@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: UserRole.USER,
        dateOfBirth: new Date('1985-05-15'),
        phoneNumber: '+9876543210',
        profileImage: 'https://example.com/image2.jpg'
      });

      const incompleteUser = UserEntity.create({
        id: 'incomplete-user-2',
        email: 'incomplete2@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        role: UserRole.USER
      });

      // Insert users
      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...userRepository.serializeToDatabase(completeUser),
        password: 'hashed-password-3'
      });

      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...userRepository.serializeToDatabase(incompleteUser),
        password: 'hashed-password-4'
      });

      // Act - Fetch users with minimal profiles
      const result = await userRepository.fetchWithMinimalProfiles({
        page: 1,
        limit: 10
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('incomplete2@example.com');
      expect(result.data[0].dateOfBirth).toBeUndefined();
      expect(result.data[0].phoneNumber).toBeUndefined();
      expect(result.data[0].profileImage).toBeUndefined();
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('Phone Number Lookup', () => {
    it('should find user by phone number', async () => {
      // Arrange - Generate test data with faker and STORE the values
      const testEmail = faker.internet.email();
      const testFirstName = faker.person.firstName();
      const testLastName = faker.person.lastName();
      const testPhoneNumber = faker.phone.number();
      const testProfileImage = faker.image.avatar();
      const testDateOfBirth = faker.date.birthdate();
      
      const user = UserEntity.createWithCompleteProfile({
        id: faker.string.uuid(),
        email: testEmail,
        firstName: testFirstName,
        lastName: testLastName,
        role: UserRole.USER,
        dateOfBirth: testDateOfBirth,
        phoneNumber: testPhoneNumber, // ← Store this value
        profileImage: testProfileImage
      });

      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...userRepository.serializeToDatabase(user),
        password: faker.internet.password()
      });

      // Act - Use the STORED phone number value
      const foundUser = await userRepository.fetchByPhoneNumber(testPhoneNumber);

      // Assert - Use the STORED values for verification
      expect(Option.isSome(foundUser)).toBe(true);
      if (Option.isSome(foundUser)) {
        expect(foundUser.value.email).toBe(testEmail);
        expect(foundUser.value.phoneNumber).toBe(testPhoneNumber);
        expect(foundUser.value.firstName).toBe(testFirstName);
        expect(foundUser.value.lastName).toBe(testLastName);
      }
    });

    it('should return Option.None for non-existent phone number', async () => {
      // Arrange - Generate a phone number that we know doesn't exist
      const nonExistentPhoneNumber = faker.phone.number();
      
      // Act
      const foundUser = await userRepository.fetchByPhoneNumber(nonExistentPhoneNumber);

      // Assert
      expect(Option.isNone(foundUser)).toBe(true);
    });
  });

  describe('User Existence Check', () => {
    it('should check if user exists by ID', async () => {
      // Arrange
      const user = UserEntity.create({
        id: 'exists-user-1',
        email: 'exists1@example.com',
        firstName: 'Exists',
        lastName: 'User',
        role: UserRole.USER
      });

      await dbConfig.db.insert(dbConfig.db.schema.users).values({
        ...userRepository.serializeToDatabase(user),
        password: 'hashed-password'
      });

      // Act & Assert
      const exists = await userRepository.existsByUserId('exists-user-1');
      expect(exists).toBe(true);

      const notExists = await userRepository.existsByUserId('non-existent-id');
      expect(notExists).toBe(false);
    });
  });

  describe('Profile Completeness Helpers', () => {
    it('should check profile completeness correctly', async () => {
      // Arrange - Create user with complete profile
      const completeUser = UserEntity.createWithCompleteProfile({
        id: 'completeness-test-1',
        email: 'completeness1@example.com',
        firstName: 'Complete',
        lastName: 'Profile',
        role: UserRole.USER,
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
        profileImage: 'https://example.com/complete.jpg'
      });

      // Act & Assert
      expect(completeUser.hasCompleteProfile()).toBe(true);
      expect(completeUser.hasMinimalProfile()).toBe(true);
      expect(completeUser.getProfileCompleteness()).toBe(100);
    });

    it('should check minimal profile correctly', async () => {
      // Arrange - Create user with minimal profile
      const minimalUser = UserEntity.create({
        id: 'completeness-test-2',
        email: 'completeness2@example.com',
        firstName: 'Minimal',
        lastName: 'Profile',
        role: UserRole.USER
      });

      // Act & Assert
      expect(minimalUser.hasCompleteProfile()).toBe(false);
      expect(minimalUser.hasMinimalProfile()).toBe(true);
      expect(minimalUser.getProfileCompleteness()).toBe(50); // 3 out of 6 fields
    });
  });

  describe('Pagination with Profile Filters', () => {
    it('should paginate complete profiles correctly', async () => {
      // Arrange - Create multiple users with complete profiles
      const users = [];
      for (let i = 1; i <= 5; i++) {
        const user = UserEntity.createWithCompleteProfile({
          id: `pagination-complete-${i}`,
          email: `pagination${i}@example.com`,
          firstName: `User${i}`,
          lastName: 'Complete',
          role: UserRole.USER,
          dateOfBirth: new Date(`199${i}-01-01`),
          phoneNumber: `+123456789${i}`,
          profileImage: `https://example.com/image${i}.jpg`
        });
        users.push(user);
      }

      // Insert users
      for (const user of users) {
        await dbConfig.db.insert(dbConfig.db.schema.users).values({
          ...userRepository.serializeToDatabase(user),
          password: 'hashed-password'
        });
      }

      // Act - Test pagination
      const page1 = await userRepository.fetchWithCompleteProfiles({
        page: 1,
        limit: 2
      });

      const page2 = await userRepository.fetchWithCompleteProfiles({
        page: 2,
        limit: 2
      });

      // Assert
      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.total).toBe(5);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      expect(page2.data).toHaveLength(2);
      expect(page2.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrev).toBe(true);
    });
  });
});
