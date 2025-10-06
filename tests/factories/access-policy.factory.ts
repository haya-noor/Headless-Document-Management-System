/**
 * AccessPolicy Entity Test Factory
 * Follows w3-effect.md factory patterns with faker-based data generation
 */

import { Effect } from 'effect';
import { faker } from '@faker-js/faker';
import { 
  AccessPolicyEntity, 
  PermissionAction, 
  PolicySubjectType, 
  PolicyResourceType
} from '../../src/domain/entities';

/**
 * AccessPolicy factory data type
 */
type AccessPolicyFactoryData = {
  id: string;
  name: string;
  description: string;
  subjectType: 'user' | 'role';
  subjectId: string;
  resourceType: 'document' | 'user';
  resourceId?: string;
  actions: string[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Rule 6: Base Generator Function using Faker
 */
export function generateAccessPolicy(overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData {
  const baseData: AccessPolicyFactoryData = {
    id: faker.string.uuid(),
    name: faker.company.catchPhrase(), 
    description: faker.lorem.sentence(),
    subjectType: faker.helpers.arrayElement(['user', 'role'] as const),
    subjectId: faker.helpers.arrayElement([faker.string.uuid(), 'admin', 'user', 'guest']),
    resourceType: faker.helpers.arrayElement(['document', 'user'] as const),
    resourceId: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.5 }),
    actions: faker.helpers.arrayElements(
      ['read', 'write', 'delete', 'manage'],
      { min: 1, max: 4 }
    ),
    isActive: faker.datatype.boolean(),
    priority: faker.number.int({ min: 1, max: 1000 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return {
    // ...baseData is a spread operator that spreads the baseData object into the new object
    // ...overrides is a spread operator that spreads the overrides object into the new object
    ...baseData,
    ...overrides,
  };
}

/**
 * Rule 7: Scenario-Based Helper Methods
 */
export const AccessPolicyFactory = {
  /**
   * Generate user-specific policy (high priority)
   */
  userSpecific: (userId: string, actions: PermissionAction[], overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({
      subjectType: 'user',
      subjectId: userId,
      resourceType: 'document',
      actions: actions as string[],
      priority: 10,
      isActive: true,
      ...overrides
    }),

  /**
   * Generate role-based policy (lower priority)
   */
  roleBased: (role: string, actions: PermissionAction[], overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({
      subjectType: 'role',
      subjectId: role,
      resourceType: 'document',
      actions: actions as string[],
      priority: 50,
      isActive: true,
      ...overrides
    }),

  /**
   * Generate read-only policy
   */
  readOnly: (overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({
      actions: ['read'],
      isActive: true,
      ...overrides
    }),

  /**
   * Generate full access policy (all actions)
   */
  fullAccess: (overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({
      actions: ['read', 'write', 'delete', 'manage'],
      isActive: true,
      ...overrides
    }),

  /**
   * Generate document-specific policy
   */
  forDocument: (documentId: string, actions: PermissionAction[], overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({
      resourceType: 'document',
      resourceId: documentId,
      actions: actions as string[],
      isActive: true,
      ...overrides
    }),

  /**
   * Generate global policy (applies to all resources of type)
   */
  global: (resourceType: PolicyResourceType, actions: PermissionAction[], overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({
      resourceType: resourceType as 'document' | 'user',
      resourceId: undefined,
      actions: actions as string[],
      isActive: true,
      ...overrides
    }),

  /**
   * Generate inactive policy
   */
  inactive: (overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    generateAccessPolicy({ isActive: false, ...overrides }),

  /**
   * Generate multiple policies
   */
  many: (count: number, overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData[] =>
    Array.from({ length: count }, () => generateAccessPolicy(overrides)),

  /**
   * Generate admin role policy
   */
  adminRole: (overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    AccessPolicyFactory.roleBased('admin', [
      PermissionAction.READ,
      PermissionAction.WRITE,
      PermissionAction.DELETE,
      PermissionAction.MANAGE
    ], { priority: 1, ...overrides }),

  /**
   * Generate user role policy (read/write only)
   */
  userRole: (overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyFactoryData =>
    AccessPolicyFactory.roleBased('user', [
      PermissionAction.READ,
      PermissionAction.WRITE
    ], { priority: 100, ...overrides }),
};

/**
 * Rule 9: Entity Creation Utilities
 */
export const AccessPolicyEntityFactory = {
  /**
   * Create AccessPolicyEntity from factory data
   */
  create: (overrides?: Partial<AccessPolicyFactoryData>): Effect.Effect<AccessPolicyEntity, never, never> => {
    const data = generateAccessPolicy(overrides);
    return Effect.succeed(AccessPolicyEntity.fromPersistence(data));
  },

  /**
   * Create user-specific AccessPolicyEntity
   */
  createUserSpecific: (
    userId: string,
    actions: PermissionAction[],
    overrides?: Partial<AccessPolicyFactoryData>
  ): Effect.Effect<AccessPolicyEntity, never, never> => {
    const data = AccessPolicyFactory.userSpecific(userId, actions, overrides);
    return Effect.succeed(AccessPolicyEntity.fromPersistence(data));
  },

  /**
   * Create role-based AccessPolicyEntity
   */
  createRoleBased: (
    role: string,
    actions: PermissionAction[],
    overrides?: Partial<AccessPolicyFactoryData>
  ): Effect.Effect<AccessPolicyEntity, never, never> => {
    const data = AccessPolicyFactory.roleBased(role, actions, overrides);
    return Effect.succeed(AccessPolicyEntity.fromPersistence(data));
  },

  /**
   * Create read-only AccessPolicyEntity
   */
  createReadOnly: (overrides?: Partial<AccessPolicyFactoryData>): Effect.Effect<AccessPolicyEntity, never, never> => {
    const data = AccessPolicyFactory.readOnly(overrides);
    return Effect.succeed(AccessPolicyEntity.fromPersistence(data));
  },

  /**
   * Create full access AccessPolicyEntity
   */
  createFullAccess: (overrides?: Partial<AccessPolicyFactoryData>): Effect.Effect<AccessPolicyEntity, never, never> => {
    const data = AccessPolicyFactory.fullAccess(overrides);
    return Effect.succeed(AccessPolicyEntity.fromPersistence(data));
  },

  /**
   * Create multiple AccessPolicyEntities
   */
  createMany: (count: number, overrides?: Partial<AccessPolicyFactoryData>): Effect.Effect<AccessPolicyEntity[], never, never> => {
    const policies = AccessPolicyFactory.many(count, overrides).map(data => 
      AccessPolicyEntity.fromPersistence(data)
    );
    return Effect.succeed(policies);
  },

  /**
   * Create synchronously
   */
  createSync: (overrides?: Partial<AccessPolicyFactoryData>): AccessPolicyEntity => {
    const data = generateAccessPolicy(overrides);
    return AccessPolicyEntity.fromPersistence(data);
  },

  /**
   * Create user-specific synchronously
   */
  createUserSpecificSync: (
    userId: string,
    actions: PermissionAction[],
    overrides?: Partial<AccessPolicyFactoryData>
  ): AccessPolicyEntity => {
    const data = AccessPolicyFactory.userSpecific(userId, actions, overrides);
    return AccessPolicyEntity.fromPersistence(data);
  },

  /**
   * Create role-based synchronously
   */
  createRoleBasedSync: (
    role: string,
    actions: PermissionAction[],
    overrides?: Partial<AccessPolicyFactoryData>
  ): AccessPolicyEntity => {
    const data = AccessPolicyFactory.roleBased(role, actions, overrides);
    return AccessPolicyEntity.fromPersistence(data);
  },
};
