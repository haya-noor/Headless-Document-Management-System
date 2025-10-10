/**
 * User Entity Test Factory
 * Follows w3-effect.md factory patterns with faker-based data generation
 */

import { Effect } from 'effect';
import { faker } from '@faker-js/faker';
import { UserEntity, UserRole } from '../../src/app/domain/user/entity';

/**
 * User factory data type
 */
type UserFactoryData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Rule 6: Base Generator Function
 * Type-safe generation with override capabilities using Faker
 */
export function generateUser(overrides?: Partial<UserFactoryData>): UserFactoryData {
  const baseData: UserFactoryData = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: faker.helpers.arrayElement(['user', 'admin'] as const),
    isActive: faker.datatype.boolean(),
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
 * Convenient presets for common testing scenarios
 */
export const UserFactory = {
  /**
   * Generate a regular user with default settings
   */
  regular: (overrides?: Partial<UserFactoryData>): UserFactoryData =>
    generateUser({ role: 'user', isActive: true, ...overrides }),

  /**
   * Generate an admin user
   */
  admin: (overrides?: Partial<UserFactoryData>): UserFactoryData =>
    generateUser({ role: 'admin', isActive: true, ...overrides }),

  /**
   * Generate an inactive user
   */
  inactive: (overrides?: Partial<UserFactoryData>): UserFactoryData =>
    generateUser({ isActive: false, ...overrides }),

  /**
   * Generate multiple users
   */
  many: (count: number, overrides?: Partial<UserFactoryData>): UserFactoryData[] =>
    Array.from({ length: count }, () => generateUser(overrides)),

  /**
   * Generate with specific email domain
   */
  withDomain: (domain: string, overrides?: Partial<UserFactoryData>): UserFactoryData => {
    const email = `${faker.internet.username()}@${domain}`;
    return generateUser({ email, ...overrides });
  },
};

/**
 * Rule 9: Entity Creation Utilities
 * Effect-based utilities for creating domain entities
 */
export const UserEntityFactory = {
  /**
   * Create UserEntity from factory data
   */
  create: (overrides?: Partial<UserFactoryData>): Effect.Effect<UserEntity, never, never> => {
    const data = generateUser(overrides);
    return Effect.succeed(UserEntity.fromPersistence(data));
  },

  /**
   * Create admin UserEntity
   */
  createAdmin: (overrides?: Partial<UserFactoryData>): Effect.Effect<UserEntity, never, never> => {
    const data = UserFactory.admin(overrides);
    return Effect.succeed(UserEntity.fromPersistence(data));
  },

  /**
   * Create regular user UserEntity
   */
  createRegular: (overrides?: Partial<UserFactoryData>): Effect.Effect<UserEntity, never, never> => {
    const data = UserFactory.regular(overrides);
    return Effect.succeed(UserEntity.fromPersistence(data));
  },

  /**
   * Create inactive UserEntity
   */
  createInactive: (overrides?: Partial<UserFactoryData>): Effect.Effect<UserEntity, never, never> => {
    const data = UserFactory.inactive(overrides);
    return Effect.succeed(UserEntity.fromPersistence(data));
  },

  /**
   * Create multiple UserEntities
   */
  createMany: (count: number, overrides?: Partial<UserFactoryData>): Effect.Effect<UserEntity[], never, never> => {
    const users = UserFactory.many(count, overrides).map(data => 
      UserEntity.fromPersistence(data)
    );
    return Effect.succeed(users);
  },

  /**
   * Create synchronously (for tests that don't use Effect)
   */
  createSync: (overrides?: Partial<UserFactoryData>): UserEntity => {
    const data = generateUser(overrides);
    return UserEntity.fromPersistence(data);
  },

  /**
   * Create admin synchronously
   */
  createAdminSync: (overrides?: Partial<UserFactoryData>): UserEntity => {
    const data = UserFactory.admin(overrides);
    return UserEntity.fromPersistence(data);
  },

  /**
   * Create regular user synchronously
   */
  createRegularSync: (overrides?: Partial<UserFactoryData>): UserEntity => {
    const data = UserFactory.regular(overrides);
    return UserEntity.fromPersistence(data);
  },
};
