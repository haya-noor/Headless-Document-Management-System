/**
 * DocumentAccessService Tests
 * Following w3-effect.md patterns for domain service testing
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Effect } from 'effect';
import * as fc from 'fast-check';
import { 
  UserEntity, 
  UserRole, 
  DocumentEntity, 
  AccessPolicyEntity, 
  PermissionAction,
  PolicySubjectType,
  PolicyResourceType 
} from '../../src/domain/entities';
import { DocumentAccessService } from '../../src/domain/services';
import { UserEntityFactory } from '../factories/user.factory';
import { DocumentEntityFactory } from '../factories/document.factory';
import { AccessPolicyEntityFactory, AccessPolicyFactory } from '../factories/access-policy.factory';

describe('DocumentAccessService', () => {
  let regularUser: UserEntity;
  let adminUser: UserEntity;
  let inactiveUser: UserEntity;
  let document: DocumentEntity;
  let deletedDocument: DocumentEntity;

  beforeEach(() => {
    // Create test users
    regularUser = UserEntityFactory.createRegularSync();
    adminUser = UserEntityFactory.createAdminSync();
    inactiveUser = UserEntityFactory.createSync({ isActive: false });

    // Create test documents
    document = DocumentEntityFactory.createActiveSync({
      uploadedBy: regularUser.id.getValue() as any
    });
    deletedDocument = DocumentEntityFactory.createSync({ isDeleted: true });
  });

  /**
   * Admin Access Tests
   */
  describe('admin access', () => {
    it('should grant all permissions to admin user', () => {
      const hasRead = DocumentAccessService.evaluatePermissionSync(
        adminUser,
        document,
        PermissionAction.READ,
        []
      );
      const hasWrite = DocumentAccessService.evaluatePermissionSync(
        adminUser,
        document,
        PermissionAction.WRITE,
        []
      );
      const hasDelete = DocumentAccessService.evaluatePermissionSync(
        adminUser,
        document,
        PermissionAction.DELETE,
        []
      );
      const hasManage = DocumentAccessService.evaluatePermissionSync(
        adminUser,
        document,
        PermissionAction.MANAGE,
        []
      );

      expect(hasRead).toBe(true);
      expect(hasWrite).toBe(true);
      expect(hasDelete).toBe(true);
      expect(hasManage).toBe(true);
    });

    it('should grant admin access via Effect', async () => {
      const result = await Effect.runPromise(
        DocumentAccessService.evaluatePermission(
          adminUser,
          document,
          PermissionAction.DELETE,
          []
        )
      );

      expect(result).toBe(true);
    });

    it('admin should have all permissions in getUserPermissions', async () => {
      const permissions = await Effect.runPromise(
        DocumentAccessService.getUserPermissions(adminUser, document, [])
      );

      expect(permissions).toContain(PermissionAction.READ);
      expect(permissions).toContain(PermissionAction.WRITE);
      expect(permissions).toContain(PermissionAction.DELETE);
      expect(permissions).toContain(PermissionAction.MANAGE);
    });
  });

  /**
   * User State Validation Tests
   */
  describe('user state validation', () => {
    it('should deny access to inactive user', () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        inactiveUser.id.getValue(),
        [PermissionAction.READ]
      );

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        inactiveUser,
        document,
        PermissionAction.READ,
        [policy]
      );

      expect(hasAccess).toBe(false);
    });

    it('should fail with error for inactive user via Effect', async () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        inactiveUser.id.getValue(),
        [PermissionAction.READ]
      );

      try {
        await Effect.runPromise(
          DocumentAccessService.evaluatePermission(
            inactiveUser,
            document,
            PermissionAction.READ,
            [policy]
          )
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(String(error)).toContain('inactive');
      }
    });
  });

  /**
   * Document State Validation Tests
   */
  describe('document state validation', () => {
    it('should deny access to deleted document', () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ]
      );

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        deletedDocument,
        PermissionAction.READ,
        [policy]
      );

      expect(hasAccess).toBe(false);
    });

    it('should fail with error for deleted document via Effect', async () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ]
      );

      try {
        await Effect.runPromise(
          DocumentAccessService.evaluatePermission(
            regularUser,
            deletedDocument,
            PermissionAction.READ,
            [policy]
          )
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(String(error)).toContain('deleted');
      }
    });
  });

  /**
   * User-Specific Policy Tests
   */
  describe('user-specific policies', () => {
    it('should grant access when user-specific policy matches', () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ],
        { resourceId: document.getId() as any }
      );

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.READ,
        [policy]
      );

      expect(hasAccess).toBe(true);
    });

    it('should deny access when action not granted', () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ]
      );

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.DELETE,
        [policy]
      );

      expect(hasAccess).toBe(false);
    });

    it('should deny access to different user', () => {
      const otherUser = UserEntityFactory.createRegularSync();
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ]
      );

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        otherUser,
        document,
        PermissionAction.READ,
        [policy]
      );

      expect(hasAccess).toBe(false);
    });
  });

  /**
   * Role-Based Policy Tests
   */
  describe('role-based policies', () => {
    it('should grant access based on role policy', () => {
      const policy = AccessPolicyEntityFactory.createRoleBasedSync(
        'user',
        [PermissionAction.READ, PermissionAction.WRITE],
        { resourceId: undefined } // Global policy
      );

      const hasRead = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.READ,
        [policy]
      );
      const hasWrite = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.WRITE,
        [policy]
      );

      expect(hasRead).toBe(true);
      expect(hasWrite).toBe(true);
    });

    it('should not grant admin role policy to regular user', () => {
      const policy = AccessPolicyEntityFactory.createRoleBasedSync(
        'admin',
        [PermissionAction.MANAGE]
      );

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.MANAGE,
        [policy]
      );

      expect(hasAccess).toBe(false);
    });
  });

  /**
   * Policy Priority Tests
   */
  describe('policy priority', () => {
    it('should prioritize user-specific policy over role policy', () => {
      // User-specific policy: READ only (priority 10)
      const userPolicy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ],
        { priority: 10, resourceId: undefined } // Global policy
      );

      // Role policy: READ + WRITE (priority 50)
      const rolePolicy = AccessPolicyEntityFactory.createRoleBasedSync(
        'user',
        [PermissionAction.READ, PermissionAction.WRITE],
        { priority: 50, resourceId: undefined } // Global policy
      );

      // User policy should take precedence
      const canRead = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.READ,
        [userPolicy, rolePolicy]
      );

      expect(canRead).toBe(true);
    });

    it('should use higher priority policy', () => {
      const highPriority = AccessPolicyEntityFactory.createSync({
        subjectType: 'user',
        subjectId: regularUser.id.getValue() as any,
        resourceType: 'document',
        resourceId: undefined, // Global policy
        actions: ['read'] as any,
        priority: 1,
        isActive: true
      });

      const lowPriority = AccessPolicyEntityFactory.createSync({
        subjectType: 'user',
        subjectId: regularUser.id.getValue() as any,
        resourceType: 'document',
        resourceId: undefined, // Global policy
        actions: ['read', 'write', 'delete'] as any,
        priority: 100,
        isActive: true
      });

      // High priority policy grants READ
      const canRead = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.READ,
        [highPriority, lowPriority]
      );

      expect(canRead).toBe(true);
    });
  });

  /**
   * Resource-Specific Policy Tests
   */
  describe('resource-specific policies', () => {
    it('should apply policy to specific document only', () => {
      const otherDoc = DocumentEntityFactory.createActiveSync();
      
      const policy = AccessPolicyEntityFactory.createSync({
        subjectType: 'user',
        subjectId: regularUser.id.getValue() as any,
        resourceType: 'document',
        resourceId: document.getId() as any,
        actions: ['read'] as any,
        isActive: true
      });

      const canAccessDoc = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.READ,
        [policy]
      );

      const canAccessOther = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        otherDoc,
        PermissionAction.READ,
        [policy]
      );

      expect(canAccessDoc).toBe(true);
      expect(canAccessOther).toBe(false);
    });

    it('should apply global policy to all documents', () => {
      const doc1 = DocumentEntityFactory.createActiveSync();
      const doc2 = DocumentEntityFactory.createActiveSync();

      const globalPolicy = AccessPolicyFactory.global(
        PolicyResourceType.DOCUMENT,
        [PermissionAction.READ]
      );
      const entity = AccessPolicyEntity.fromPersistence({
        ...globalPolicy,
        subjectType: 'user',
        subjectId: regularUser.id.getValue() as any
      });

      const canAccessDoc1 = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        doc1,
        PermissionAction.READ,
        [entity]
      );

      const canAccessDoc2 = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        doc2,
        PermissionAction.READ,
        [entity]
      );

      expect(canAccessDoc1).toBe(true);
      expect(canAccessDoc2).toBe(true);
    });
  });

  /**
   * Inactive Policy Tests
   */
  describe('inactive policies', () => {
    it('should deny access when policy is inactive', () => {
      const policy = AccessPolicyEntityFactory.createSync({
        subjectType: 'user',
        subjectId: regularUser.id.getValue() as any,
        resourceType: 'document',
        actions: ['read'] as any,
        isActive: false
      });

      const hasAccess = DocumentAccessService.evaluatePermissionSync(
        regularUser,
        document,
        PermissionAction.READ,
        [policy]
      );

      expect(hasAccess).toBe(false);
    });
  });

  /**
   * getUserPermissions Tests
   */
  describe('getUserPermissions', () => {
    it('should return only granted permissions for regular user', async () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ],
        { resourceId: document.getId() }
      );

      const permissions = await Effect.runPromise(
        DocumentAccessService.getUserPermissions(regularUser, document, [policy])
      );

      expect(permissions).toContain(PermissionAction.READ);
      expect(permissions).not.toContain(PermissionAction.WRITE);
      expect(permissions).not.toContain(PermissionAction.DELETE);
    });

    it('should return multiple permissions from role policy', async () => {
      const policy = AccessPolicyEntityFactory.createRoleBasedSync(
        'user',
        [PermissionAction.READ, PermissionAction.WRITE],
        { resourceId: undefined } // Global policy
      );

      const permissions = await Effect.runPromise(
        DocumentAccessService.getUserPermissions(regularUser, document, [policy])
      );

      expect(permissions).toContain(PermissionAction.READ);
      expect(permissions).toContain(PermissionAction.WRITE);
    });
  });

  /**
   * canManagePermissions Tests
   */
  describe('canManagePermissions', () => {
    it('should allow admin to manage permissions', async () => {
      const canManage = await Effect.runPromise(
        DocumentAccessService.canManagePermissions(adminUser, document, [])
      );

      expect(canManage).toBe(true);
    });

    it('should deny regular user without manage permission', async () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.READ]
      );

      const canManage = await Effect.runPromise(
        DocumentAccessService.canManagePermissions(regularUser, document, [policy])
      );

      expect(canManage).toBe(false);
    });

    it('should allow user with manage permission', async () => {
      const policy = AccessPolicyEntityFactory.createUserSpecificSync(
        regularUser.id.getValue(),
        [PermissionAction.MANAGE],
        { resourceId: document.getId() }
      );

      const canManage = await Effect.runPromise(
        DocumentAccessService.canManagePermissions(regularUser, document, [policy])
      );

      expect(canManage).toBe(true);
    });
  });

  /**
   * isDocumentOwner Tests
   */
  describe('isDocumentOwner', () => {
    it('should return true when user is document owner', () => {
      const isOwner = DocumentAccessService.isDocumentOwner(regularUser, document);
      
      expect(isOwner).toBe(true);
    });

    it('should return false when user is not document owner', () => {
      const otherUser = UserEntityFactory.createRegularSync();
      const isOwner = DocumentAccessService.isDocumentOwner(otherUser, document);
      
      expect(isOwner).toBe(false);
    });
  });

  /**
   * Property-based tests for access control invariants
   */
  describe('access control invariants (property-based)', () => {
    it('admin always has access', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const admin = UserEntityFactory.createAdminSync();
          const doc = DocumentEntityFactory.createActiveSync();
          
          const hasAccess = DocumentAccessService.evaluatePermissionSync(
            admin,
            doc,
            PermissionAction.DELETE,
            []
          );
          
          expect(hasAccess).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('inactive user never has access', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const inactive = UserEntityFactory.createSync({ isActive: false });
          const doc = DocumentEntityFactory.createActiveSync();
          
          const hasAccess = DocumentAccessService.evaluatePermissionSync(
            inactive,
            doc,
            PermissionAction.READ,
            []
          );
          
          expect(hasAccess).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('deleted document never accessible', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const user = UserEntityFactory.createRegularSync();
          const deletedDoc = DocumentEntityFactory.createSync({ isDeleted: true });
          
          const hasAccess = DocumentAccessService.evaluatePermissionSync(
            user,
            deletedDoc,
            PermissionAction.READ,
            []
          );
          
          expect(hasAccess).toBe(false);
        }),
        { numRuns: 50 }
      );
    });
  });
});

