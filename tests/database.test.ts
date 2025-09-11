/**
 * Database and repository tests
 * Tests database operations and repository pattern implementation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { UserRepository } from '../src/repositories/implementations/user.repository';
import { UserRole } from '../src/types';
import { hashPassword } from '../src/utils/password';
import { testUtils } from './setup';

describe('Database Operations', () => {
  let userRepository: UserRepository;

  beforeEach(async () => {
    userRepository = new UserRepository();
    await testUtils.cleanDatabase();
  });

  afterEach(async () => {
    await testUtils.cleanDatabase();
  });

  describe('User Repository', () => {
    test('should create user successfully', async () => {
      const userData = {
        email: 'repo-test@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Repository',
        lastName: 'Test',
        role: UserRole.USER,
      };

      const user = await userRepository.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.role).toBe(UserRole.USER);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test('should find user by email', async () => {
      const userData = {
        email: 'findme@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Find',
        lastName: 'Me',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    test('should find user by ID', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Find',
        lastName: 'ById',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    test('should update user successfully', async () => {
      const userData = {
        email: 'update@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Original',
        lastName: 'Name',
      };

      const createdUser = await userRepository.create(userData);
      const updatedUser = await userRepository.update(createdUser.id, {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.firstName).toBe('Updated');
      expect(updatedUser?.lastName).toBe('Name');
      expect(updatedUser?.email).toBe(userData.email);
    });

    test('should check if email is taken', async () => {
      const userData = {
        email: 'taken@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Taken',
        lastName: 'Email',
      };

      await userRepository.create(userData);

      const isTaken = await userRepository.isEmailTaken('taken@example.com');
      const isNotTaken = await userRepository.isEmailTaken('available@example.com');

      expect(isTaken).toBe(true);
      expect(isNotTaken).toBe(false);
    });

    test('should find users by role', async () => {
      // Create admin user
      const adminData = {
        email: 'admin@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      };

      // Create regular user
      const userData = {
        email: 'user@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Regular',
        lastName: 'User',
        role: UserRole.USER,
      };

      await userRepository.create(adminData);
      await userRepository.create(userData);

      const admins = await userRepository.findByRole(UserRole.ADMIN);
      const users = await userRepository.findByRole(UserRole.USER);

      expect(admins).toHaveLength(1);
      expect(admins[0].email).toBe('admin@example.com');
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user@example.com');
    });

    test('should search users by name and email', async () => {
      const users = [
        {
          email: 'john.doe@example.com',
          password: await hashPassword('TestPass123!'),
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          email: 'jane.smith@example.com',
          password: await hashPassword('TestPass123!'),
          firstName: 'Jane',
          lastName: 'Smith',
        },
        {
          email: 'bob.johnson@example.com',
          password: await hashPassword('TestPass123!'),
          firstName: 'Bob',
          lastName: 'Johnson',
        },
      ];

      for (const user of users) {
        await userRepository.create(user);
      }

      // Search by first name
      const johnResults = await userRepository.searchUsers('john');
      expect(johnResults).toHaveLength(2); // John Doe and Bob Johnson

      // Search by email
      const janeResults = await userRepository.searchUsers('jane.smith');
      expect(janeResults).toHaveLength(1);
      expect(janeResults[0].email).toBe('jane.smith@example.com');

      // Search by last name
      const smithResults = await userRepository.searchUsers('smith');
      expect(smithResults).toHaveLength(1);
      expect(smithResults[0].firstName).toBe('Jane');
    });

    test('should handle pagination', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 15; i++) {
        users.push({
          email: `user${i}@example.com`,
          password: await hashPassword('TestPass123!'),
          firstName: `User${i}`,
          lastName: 'Test',
        });
      }

      for (const user of users) {
        await userRepository.create(user);
      }

      // Test pagination
      const page1 = await userRepository.findManyPaginated({
        page: 1,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      const page2 = await userRepository.findManyPaginated({
        page: 2,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(page1.data).toHaveLength(5);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      expect(page2.data).toHaveLength(5);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrev).toBe(true);

      // Ensure different data on different pages
      expect(page1.data[0].email).not.toBe(page2.data[0].email);
    });

    test('should deactivate and activate users', async () => {
      const userData = {
        email: 'activate@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Activate',
        lastName: 'Test',
      };

      const user = await userRepository.create(userData);
      expect(user.isActive).toBe(true);

      // Deactivate user
      const deactivated = await userRepository.deactivateUser(user.id);
      expect(deactivated).toBe(true);

      // Verify user is deactivated
      const deactivatedUser = await userRepository.findById(user.id);
      expect(deactivatedUser?.isActive).toBe(false);

      // Activate user
      const activated = await userRepository.activateUser(user.id);
      expect(activated).toBe(true);

      // Verify user is activated
      const activatedUser = await userRepository.findById(user.id);
      expect(activatedUser?.isActive).toBe(true);
    });

    test('should update password', async () => {
      const userData = {
        email: 'password@example.com',
        password: await hashPassword('TestPass123!'),
        firstName: 'Password',
        lastName: 'Test',
      };

      const user = await userRepository.create(userData);
      const newHashedPassword = await hashPassword('NewTestPass123!');

      const updated = await userRepository.updatePassword(user.id, newHashedPassword);
      expect(updated).toBe(true);

      // Note: We can't easily verify the password change without exposing the hash
      // This would typically be tested through the service layer
    });

    test('should count users with filters', async () => {
      // Create test users
      const users = [
        { email: 'admin1@example.com', role: UserRole.ADMIN },
        { email: 'admin2@example.com', role: UserRole.ADMIN },
        { email: 'user1@example.com', role: UserRole.USER },
        { email: 'user2@example.com', role: UserRole.USER },
        { email: 'user3@example.com', role: UserRole.USER },
      ];

      for (const user of users) {
        await userRepository.create({
          ...user,
          password: await hashPassword('TestPass123!'),
          firstName: 'Count',
          lastName: 'Test',
        });
      }

      const totalCount = await userRepository.count();
      const adminCount = await userRepository.count({ role: UserRole.ADMIN });
      const userCount = await userRepository.count({ role: UserRole.USER });

      expect(totalCount).toBe(5);
      expect(adminCount).toBe(2);
      expect(userCount).toBe(3);
    });
  });
});
