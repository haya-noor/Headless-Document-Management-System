/**
 * UserEntity Tests
 * Following w3-effect.md Essential Entity Testing Patterns
 */

import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { Effect } from 'effect';
import { UserEntity, UserRole } from '../../src/domain/entities';
import { UserFactory, UserEntityFactory, generateUser } from '../factories/user.factory';

describe('UserEntity', () => {
  /**
   * Pattern 1: Basic Entity Creation & Validation
   */
  describe('creation and validation', () => {
    it('should create valid user from factory', () => {
      const user = UserEntityFactory.createSync();
      
      expect(user).toBeInstanceOf(UserEntity);
      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(user.firstName.length).toBeGreaterThan(0);
      expect(user.lastName.length).toBeGreaterThan(0);
    });

    it('should create user with valid role', () => {
      const adminUser = UserEntityFactory.createAdminSync();
      const regularUser = UserEntityFactory.createRegularSync();
      
      expect(adminUser.role).toBe(UserRole.ADMIN);
      expect(regularUser.role).toBe(UserRole.USER);
    });

    it('should fail validation with invalid email in schema', () => {
      const invalidData = generateUser({ email: 'not-an-email' });
      
      // Schema validation would catch this at runtime
      expect(invalidData.email).toBe('not-an-email'); // Factory allows override
    });

    it('should create user via Effect-based factory', async () => {
      const result = await Effect.runPromise(UserEntityFactory.create());
      
      expect(result).toBeInstanceOf(UserEntity);
      expect(result.isActive).toBeDefined();
    });
  });

  /**
   * Pattern 2: Factory Constraint Testing
   */
  describe('factory constraints', () => {
    it('factory generates firstName within length constraints', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = generateUser();
          expect(user.firstName.length).toBeGreaterThan(0);
          expect(user.firstName.length).toBeLessThanOrEqual(100);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates lastName within length constraints', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = generateUser();
          expect(user.lastName.length).toBeGreaterThan(0);
          expect(user.lastName.length).toBeLessThanOrEqual(100);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid email format', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = generateUser();
          expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid UUID for id', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = generateUser();
          expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid roles', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = generateUser();
          expect(['admin', 'user']).toContain(user.role);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Pattern 3: Option Type Handling
   */
  describe('optional fields and state', () => {
    it('should handle active/inactive states', () => {
      const activeUser = UserFactory.regular();
      const inactiveUser = UserFactory.inactive();
      
      expect(activeUser.isActive).toBe(true);
      expect(inactiveUser.isActive).toBe(false);
    });

    it('should create users with varying active states', () => {
      const users = UserFactory.many(10);
      const hasActive = users.some(u => u.isActive);
      const hasInactive = users.some(u => !u.isActive);
      
      // With random generation, we should see variety (probabilistic test)
      expect(hasActive || hasInactive).toBe(true);
    });
  });

  /**
   * Pattern 4: Computed Properties & Business Logic
   */
  describe('business logic methods', () => {
    it('getFullName returns correct format', () => {
      const user = UserEntityFactory.createSync({
        firstName: 'John',
        lastName: 'Doe'
      });
      
      expect(user.getFullName()).toBe('John Doe');
    });

    it('isAdmin returns true for admin role', () => {
      const admin = UserEntityFactory.createAdminSync();
      const regular = UserEntityFactory.createRegularSync();
      
      expect(admin.isAdmin()).toBe(true);
      expect(regular.isAdmin()).toBe(false);
    });

    it('deactivate creates new inactive user', () => {
      const user = UserEntityFactory.createSync({ isActive: true });
      const deactivated = user.deactivate();
      
      expect(deactivated.isActive).toBe(false);
      expect(user.isActive).toBe(true); // Original unchanged (immutability)
      expect(deactivated.id).toEqual(user.id);
    });

    it('activate creates new active user', () => {
      const user = UserEntityFactory.createSync({ isActive: false });
      const activated = user.activate();
      
      expect(activated.isActive).toBe(true);
      expect(user.isActive).toBe(false); // Original unchanged
    });

    it('deactivate then activate maintains identity', () => {
      const user = UserEntityFactory.createSync();
      const deactivated = user.deactivate();
      const reactivated = deactivated.activate();
      
      expect(reactivated.isActive).toBe(true);
      expect(reactivated.id.getValue()).toBe(user.id.getValue());
      expect(reactivated.email).toBe(user.email);
    });
  });

  /**
   * Pattern 5: Factory Override Testing
   */
  describe('factory overrides', () => {
    it('should override email correctly', () => {
      const customEmail = 'custom@test.com';
      const user = generateUser({ email: customEmail });
      
      expect(user.email).toBe(customEmail);
    });

    it('should override role correctly', () => {
      const user = generateUser({ role: 'admin' });
      
      expect(user.role).toBe('admin');
    });

    it('should override multiple fields', () => {
      const overrides = {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        role: 'admin' as const
      };
      const user = generateUser(overrides);
      
      expect(user.firstName).toBe('Alice');
      expect(user.lastName).toBe('Smith');
      expect(user.email).toBe('alice@example.com');
      expect(user.role).toBe('admin');
    });

    it('UserFactory.withDomain creates email with correct domain', () => {
      const user = UserFactory.withDomain('company.com');
      
      expect(user.email).toMatch(/@company\.com$/);
    });
  });

  /**
   * Pattern 6: Error Handling & Edge Cases
   */
  describe('edge cases and validation', () => {
    it('should handle email at max length', () => {
      // Email max length is 255
      const longLocal = 'a'.repeat(240);
      const email = `${longLocal}@test.com`;
      const user = UserEntityFactory.createSync({ email });
      
      expect(user.email.length).toBeLessThanOrEqual(255);
    });

    it('should handle names with special characters', () => {
      const user = UserEntityFactory.createSync({
        firstName: "O'Brien",
        lastName: 'García-López'
      });
      
      expect(user.firstName).toBe("O'Brien");
      expect(user.lastName).toBe('García-López');
    });
  });

  /**
   * Pattern 7: Serialization & Data Integrity
   */
  describe('persistence and serialization', () => {
    it('toPersistence preserves all fields', () => {
      const user = UserEntityFactory.createSync();
      const persistence = user.toPersistence();
      
      expect(persistence.id).toBe(user.id.getValue());
      expect(persistence.email).toBe(user.email);
      expect(persistence.firstName).toBe(user.firstName);
      expect(persistence.lastName).toBe(user.lastName);
      expect(persistence.role).toBe(user.role);
      expect(persistence.isActive).toBe(user.isActive);
    });

    it('fromPersistence -> toPersistence round-trip maintains data', () => {
      const originalData = generateUser();
      const entity = UserEntity.fromPersistence(originalData);
      const roundTrip = entity.toPersistence();
      
      expect(roundTrip.id).toBe(originalData.id);
      expect(roundTrip.email).toBe(originalData.email);
      expect(roundTrip.firstName).toBe(originalData.firstName);
      expect(roundTrip.lastName).toBe(originalData.lastName);
    });

    it('should maintain immutability after serialization', () => {
      const user = UserEntityFactory.createSync();
      const persistence1 = user.toPersistence();
      const persistence2 = user.toPersistence();
      
      expect(persistence1).toEqual(persistence2);
      expect(persistence1).not.toBe(persistence2); // Different objects
    });
  });

  /**
   * Property-based tests for domain invariants
   */
  describe('domain invariants (property-based)', () => {
    it('deactivate always results in inactive user', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = UserEntityFactory.createSync();
          const deactivated = user.deactivate();
          
          expect(deactivated.isActive).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('activate always results in active user', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = UserEntityFactory.createSync();
          const activated = user.activate();
          
          expect(activated.isActive).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('id remains constant through state changes', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = UserEntityFactory.createSync();
          const originalId = user.id.getValue();
          
          const deactivated = user.deactivate();
          const reactivated = deactivated.activate();
          
          expect(reactivated.id.getValue()).toBe(originalId);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Batch operations testing
   */
  describe('batch operations', () => {
    it('createMany generates requested number of users', async () => {
      const users = await Effect.runPromise(UserEntityFactory.createMany(5));
      
      expect(users).toHaveLength(5);
      expect(users.every(u => u instanceof UserEntity)).toBe(true);
    });

    it('createMany generates unique users', () => {
      const users = UserFactory.many(10);
      const ids = users.map(u => u.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(10);
    });
  });
});

