/**
 * AccessPolicyEntity Tests
 * Following w3-effect.md Essential Entity Testing Patterns
 */

import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { Effect } from 'effect';
import { 
  AccessPolicyEntity, 
  PermissionAction, 
  PolicySubjectType, 
  PolicyResourceType 
} from '../../src/domain/entities';
import { 
  AccessPolicyFactory, 
  AccessPolicyEntityFactory, 
  generateAccessPolicy 
} from '../factories/access-policy.factory';
import { UserEntityFactory } from '../factories/user.factory';
import { DocumentEntityFactory } from '../factories/document.factory';

describe('AccessPolicyEntity', () => {
  /**
   * Pattern 1: Basic Entity Creation & Validation
   */
  describe('creation and validation', () => {
    it('should create valid policy from factory', () => {
      const policy = AccessPolicyEntityFactory.createSync();
      
      expect(policy).toBeInstanceOf(AccessPolicyEntity);
      // should be truthy, not null, undefined, empty
      expect(policy.name).toBeTruthy(); 
      expect(policy.actions.length).toBeGreaterThan(0);
    });

    it('should create user-specific policy', () => {
      const userId = 'user-123';
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        userId,
        [PermissionAction.READ]
      );
      expect(policy.subjectType).toBe(PolicySubjectType.USER);
      expect(policy.subjectId).toBe(userId);
    });

    it('should create role-based policy', () => {
      const policy = AccessPolicyEntityFactory.createRoleBasedSync(
        'admin',
        
        [PermissionAction.READ, PermissionAction.WRITE]
      );
      
      expect(policy.subjectType).toBe(PolicySubjectType.ROLE);
      expect(policy.subjectId).toBe('admin');
    });

    it('should create policy via Effect-based factory', async () => {
      const policy = await Effect.runPromise(AccessPolicyEntityFactory.create());
      
      expect(policy).toBeInstanceOf(AccessPolicyEntity);
      expect(policy.isActive).toBeDefined();
    });
  });

  /**
   * Pattern 2: Factory Constraint Testing
   * fc = fast-check (property-based testing library)
   * fc.assert = assert that the property-based test 
   * fc.property = defines a property to test 
   * fc.constant = generate constant values (null in this case, so it runs the test 50 times)
   */
  describe('factory constraints', () => {
    it('factory generates name within length constraints', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = generateAccessPolicy();
          expect(policy.name.length).toBeGreaterThan(0);
          expect(policy.name.length).toBeLessThanOrEqual(255);
        }),
        { numRuns: 50 } // number of runs for the property-based test
      );
    });

    it('factory generates description within constraints', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = generateAccessPolicy();
          expect(policy.description.length).toBeLessThanOrEqual(1000);
        }),
        { numRuns: 50 }
      );
    });

    // actions include read, write, delete, manage
    it('factory generates at least one action', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = generateAccessPolicy();
          expect(policy.actions.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates positive priority', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = generateAccessPolicy();
          expect(policy.priority).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid subject types', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = generateAccessPolicy();
          expect(['user', 'role']).toContain(policy.subjectType);
        }),
        { numRuns: 50 }
      );
    });

    it('factory generates valid resource types', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = generateAccessPolicy();
          expect(['document', 'user']).toContain(policy.resourceType);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Pattern 3: Option Type Handling
   * checks if policy is active or inactive
   * inactive = deleted
   * active = not deleted
   */
  describe('optional fields and state', () => {
    it('should handle active/inactive states', () => {
      const activePolicy = AccessPolicyFactory.readOnly();
      const inactivePolicy = AccessPolicyFactory.inactive();
      
      expect(activePolicy.isActive).toBe(true);
      expect(inactivePolicy.isActive).toBe(false);
    });

    // tests whether policies are resource specific or global
    /*
    doc-123: policies only for this specific document id
    global: Has no specific resource id (undefined = .toBeUndefined()) 
    */
    it('should handle optional resourceId', () => {
      const specificPolicy = AccessPolicyFactory.forDocument('doc-123', [PermissionAction.READ]);
      const globalPolicy = AccessPolicyFactory.global(PolicyResourceType.DOCUMENT, [PermissionAction.READ]);
      
      expect(specificPolicy.resourceId).toBe('doc-123');
      expect(globalPolicy.resourceId).toBeUndefined();
    });
  });

  /**
   * Pattern 4: Computed Properties & Business Logic
   */
  describe('business logic methods', () => {
    it('appliesToSubject checks subject match correctly', () => {
      const userId = 'user-123';
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        userId,
        [PermissionAction.READ] // read is the most basic action 
      );
      // Does the policy apply to correct user?, given policy created for user-123
      // should return true
      expect(policy.appliesToSubject(PolicySubjectType.USER, userId)).toBe(true);

      // Does the policy apply to other user?, given policy created for user-123 
      // should return false
      expect(policy.appliesToSubject(PolicySubjectType.USER, 'other-user')).toBe(false);
    });

    it('appliesToResource checks resource match for specific resource', () => {
      const docId = 'doc-123';
      const policy = AccessPolicyFactory.forDocument(docId, [PermissionAction.READ]);
      const entity = AccessPolicyEntity.fromPersistence(policy);
      
      // Does the policy apply to specific document?, given policy created for doc-123
      // should return true
      expect(entity.appliesToResource(PolicyResourceType.DOCUMENT, docId)).toBe(true);

      // Does the policy apply to other document?, given policy created for doc-123
      // should return false
      expect(entity.appliesToResource(PolicyResourceType.DOCUMENT, 'other-doc')).toBe(false);
    });


    it('appliesToResource checks resource match for global policy', () => {
      const policy = AccessPolicyFactory.global(PolicyResourceType.DOCUMENT, [PermissionAction.READ]);
      const entity = AccessPolicyEntity.fromPersistence(policy);
      
      // Does the policy apply to any document?, given policy created for any document
      // should return true
      expect(entity.appliesToResource(PolicyResourceType.DOCUMENT, 'any-doc-1')).toBe(true);

      // Does the policy apply to any document?, given policy created for any document
      // should return true
      expect(entity.appliesToResource(PolicyResourceType.DOCUMENT, 'any-doc-2')).toBe(true);
    });

    it('grantsAction checks if action is included', () => {
      const policy = AccessPolicyEntityFactory.createSync({
        actions: ['read', 'write'] as any
      });
      
      expect(policy.grantsAction(PermissionAction.READ)).toBe(true);
      expect(policy.grantsAction(PermissionAction.WRITE)).toBe(true);
      expect(policy.grantsAction(PermissionAction.DELETE)).toBe(false);
    });

    it('hasHigherPriorityThan compares priorities correctly', () => {
      const highPriority = AccessPolicyEntityFactory.createSync({ priority: 10 });
      const lowPriority = AccessPolicyEntityFactory.createSync({ priority: 100 });
      
      expect(highPriority.hasHigherPriorityThan(lowPriority)).toBe(true);
      expect(lowPriority.hasHigherPriorityThan(highPriority)).toBe(false);
    });

    it('updateActions creates new policy with updated actions', () => {
      const policy = AccessPolicyEntityFactory.createSync({
        // initial actions: read
        actions: ['read'] as any
      });
      const updated = policy.updateActions([PermissionAction.READ, PermissionAction.WRITE]);
      // updated actions: read, write
      //
      expect(updated.actions).toContain(PermissionAction.READ);
      expect(updated.actions).toContain(PermissionAction.WRITE);
      expect(policy.actions).toHaveLength(1); // Original unchanged
    });

    
    it('deactivate creates new inactive policy', () => {
      const policy = AccessPolicyEntityFactory.createSync({ isActive: true });
      const deactivated = policy.deactivate();
      
      // deactivated policy is inactive
      expect(deactivated.isActive).toBe(false);

      expect(policy.isActive).toBe(true); // Original unchanged
    });

    it('activate creates new active policy', () => {
      const policy = AccessPolicyEntityFactory.createSync({ isActive: false });
      const activated = policy.activate();
      
      expect(activated.isActive).toBe(true);
      expect(policy.isActive).toBe(false); // Original unchanged
    });

    it('updatePriority creates new policy with updated priority', () => {
      const policy = AccessPolicyEntityFactory.createSync({ priority: 100 });
      const updated = policy.updatePriority(50);
      
      expect(updated.priority).toBe(50);
      expect(policy.priority).toBe(100); // Original unchanged
    });
  });

  /**
   * Pattern 5: Factory Override Testing
   * Tests that you can set a custom priority, actions, subject type (user or role) and id
   */
  describe('factory overrides', () => {
    it('should override priority', () => {
      const policy = generateAccessPolicy({ priority: 5 });
      
      expect(policy.priority).toBe(5);
    });

    
    it('should override actions', () => {
      const policy = generateAccessPolicy({
        actions: ['manage'] as any
      });
      
      expect(policy.actions).toContain('manage');
    });

    it('should override subject type and id', () => {
      const policy = generateAccessPolicy({
        subjectType: 'role',
        subjectId: 'admin' as any
      });
      
      expect(policy.subjectType).toBe('role');
      expect(policy.subjectId).toBe('admin');
    });
  });

  /**
   * Pattern 6: Error Handling & Edge Cases
   */
  describe('edge cases and validation', () => {
    it('should handle all possible actions', () => {
      const policy = AccessPolicyFactory.fullAccess();
      
      expect(policy.actions).toContain('read');
      expect(policy.actions).toContain('write');
      expect(policy.actions).toContain('delete');
      expect(policy.actions).toContain('manage');
    });

    it('should handle single action', () => {
      const policy = AccessPolicyFactory.readOnly();
      // readOnly policy has only one action: read
      expect(policy.actions).toHaveLength(1);

      expect(policy.actions[0]).toBe('read');
    });
  });

  /**
   * Pattern 7: Serialization & Data Integrity
   * Tests that the entitiy can convert itself to a format suitable for DB storage
   * Rounds trip: converts to persistence format and back to entity
   */
  describe('persistence and serialization', () => {
    it('toPersistence preserves all fields', () => {
      const policy = AccessPolicyEntityFactory.createSync();
      const persistence = policy.toPersistence();
      
      expect(persistence.id).toBe(policy.id.getValue());
      expect(persistence.name).toBe(policy.name);
      expect(persistence.description).toBe(policy.description);
      expect(persistence.priority).toBe(policy.priority);
      expect(persistence.actions).toEqual(policy.actions);
    });

    it('fromPersistence -> toPersistence round-trip maintains data', () => {
      const originalData = generateAccessPolicy();
      const entity = AccessPolicyEntity.fromPersistence(originalData);
      const roundTrip = entity.toPersistence();
      
      expect(roundTrip.id).toBe(originalData.id);
      expect(roundTrip.name).toBe(originalData.name);
      expect(roundTrip.priority).toBe(originalData.priority);
      expect(roundTrip.actions).toEqual(originalData.actions);
    });
  });

  /**
   * Property-based tests for domain invariants (properties that should always be true)
   */
  describe('domain invariants (property-based)', () => {
    it('priority is always positive', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = AccessPolicyEntityFactory.createSync();
          expect(policy.priority).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('deactivate always results in inactive policy', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = AccessPolicyEntityFactory.createSync();
          const deactivated = policy.deactivate();
          
          expect(deactivated.isActive).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('actions array is never empty', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const policy = AccessPolicyEntityFactory.createSync();
          expect(policy.actions.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Batch operations testing
   */
  describe('batch operations', () => {
    it('createMany generates requested number of policies', async () => {
      const policies = await Effect.runPromise(AccessPolicyEntityFactory.createMany(5));
      
      // should generate 5 policies
      expect(policies).toHaveLength(5);
      // p = policy, should be an instance of AccessPolicyEntity
      expect(policies.every(p => p instanceof AccessPolicyEntity)).toBe(true);
    });

    it('createMany generates unique policies', () => {
      const policies = AccessPolicyFactory.many(10);
      const ids = policies.map(p => p.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(10);
    });
  });

  /**
   * Scenario-based tests
   */
  describe('real-world scenarios', () => {
    it('should create admin role policy with full access', () => {
      const policy = AccessPolicyFactory.adminRole();
      const entity = AccessPolicyEntity.fromPersistence(policy);
      
      expect(entity.subjectType).toBe(PolicySubjectType.ROLE);
      expect(entity.subjectId).toBe('admin');
      expect(entity.actions).toContain(PermissionAction.MANAGE);
      expect(entity.priority).toBe(1); // Highest priority
    });

    it('should create user role policy with limited access', () => {
      const policy = AccessPolicyFactory.userRole();
      const entity = AccessPolicyEntity.fromPersistence(policy);
      
      expect(entity.subjectType).toBe(PolicySubjectType.ROLE);
      expect(entity.subjectId).toBe('user');
      expect(entity.actions).not.toContain(PermissionAction.DELETE);
      expect(entity.priority).toBe(100); // Lower priority
    });

    it('should create document-specific policy for user', () => {
      const user = UserEntityFactory.createSync();
      const doc = DocumentEntityFactory.createSync();
      
      const policy = AccessPolicyFactory.forDocument(
        doc.getId(),
        [PermissionAction.READ, PermissionAction.WRITE]
      );
      const entity = AccessPolicyEntity.fromPersistence({
        ...policy,
        subjectType: 'user',
        subjectId: user.id.getValue() as any
      });
      
      expect(entity.appliesToResource(PolicyResourceType.DOCUMENT, doc.getId())).toBe(true);
      expect(entity.appliesToSubject(PolicySubjectType.USER, user.id.getValue())).toBe(true);
    });
  });
});

