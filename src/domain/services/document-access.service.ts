/**
 * DocumentAccessService domain service
 * Evaluates document access permissions using user and policy data
 * Pure domain service with no external dependencies
 */

import { Effect } from 'effect';
import { UserEntity, UserRole } from '../entities/user';
import { AccessPolicyEntity, PermissionAction, PolicySubjectType, PolicyResourceType } from '../entities/access-policy';
import { DocumentEntity } from '../entities/document';
import {
  DocumentAccessDeniedError,
  DocumentAccessEvaluationError,
  DocumentAccessUserError,
  DocumentAccessPolicyError,
  DocumentAccessPermissionError,
  DocumentAccessValidationError,
} from '../errors/document-access.errors';

/**
 * Permission evaluation result
 */
export interface PermissionEvaluationResult {
  granted: boolean;
  reason: string;
  policyId?: string;
  priority: number;
}

/**
 * DocumentAccessService class
 * Pure domain service for evaluating document access permissions
 * explicit subject policy mean:
 * explicit subject policy means a policy that is explicitly applied to a specific user
 */
export class DocumentAccessService {
  /**
   * Evaluate if user has permission to perform action on document (synchronous version)
   * Precedence: Admin > explicit subject policy(higher priority) > role policy(lower priority) > default deny
   */
  static evaluatePermissionSync(
    user: UserEntity,
    document: DocumentEntity,
    action: PermissionAction,
    policies: AccessPolicyEntity[]
  ): boolean {
    // Check if user is active
    if (!user.isActive) {
      return false;
    }

    // Check if document is accessible (not deleted)
    if (document.isDeleted) {
      return false;
    }

    // Admin users have all permissions
    if (user.isAdmin()) {
      return true;
    }

    // Filter applicable policies
    /*
    it is used to filter out policies that are not applicable to the user and document
    like: if the policy is not active or if the policy is not applicable to the user and
     document then it should be filtered out
    */
    const applicablePolicies = policies.filter(policy => 
      policy.isActive && 
      DocumentAccessService.isPolicyApplicable(policy, user, document)
    );

    // Sort by priority (lower number = higher priority)
    const sortedPolicies = DocumentAccessService.sortPoliciesByPriority(applicablePolicies);

    // Evaluate policies in order of precedence
    for (const policy of sortedPolicies) {
      const evaluation = DocumentAccessService.evaluatePolicySync(policy, user, document, action);
      if (evaluation.granted) {
        return true;
      }
    }

    // Default deny
    return false;
  }

  /**
   * Evaluate if user has permission to perform action on document
   * Precedence: Admin > explicit subject policy > role policy > default deny
   */
  static evaluatePermission(
    user: UserEntity,
    document: DocumentEntity,
    action: PermissionAction,
    policies: AccessPolicyEntity[]
  ): Effect.Effect<boolean, DocumentAccessEvaluationError, never> {
    // Check if user is active
    if (!user.isActive) {
      return Effect.fail(new DocumentAccessEvaluationError({
        documentId: document.id.getValue(),
        userId: user.id.getValue(),
        message: 'User is inactive'
      }));
    }

    // Check if document is accessible (not deleted)
    if (document.isDeleted) {
      return Effect.fail(new DocumentAccessEvaluationError({
        documentId: document.id.getValue(),
        userId: user.id.getValue(),
        message: 'Document is deleted'
      }));
    }

    // Admin users have all permissions
    if (user.isAdmin()) {
      return Effect.succeed(true);
    }

    // Filter applicable policies
    const applicablePolicies = policies.filter(policy => 
      policy.isActive && 
      DocumentAccessService.isPolicyApplicable(policy, user, document)
    );

    // Sort by priority (lower number = higher priority)
    const sortedPolicies = DocumentAccessService.sortPoliciesByPriority(applicablePolicies);

    // Evaluate policies in order of precedence
    for (const policy of sortedPolicies) {
      const evaluation = DocumentAccessService.evaluatePolicySync(policy, user, document, action);
      if (evaluation.granted) {
        return Effect.succeed(true);
      }
    }

    // Default deny
    return Effect.succeed(false);
  }

  /**
   * Sort policies by priority (lower number = higher priority)
   * If the result is negative → a comes before b.
   * If the result is positive → b comes before a.
   * If the result is 0 → their order stays the same.
   */
  private static sortPoliciesByPriority(policies: AccessPolicyEntity[]): AccessPolicyEntity[] {
    return policies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if policy is applicable to user and document
   */
  private static isPolicyApplicable(
    policy: AccessPolicyEntity,
    user: UserEntity,
    document: DocumentEntity
  ): boolean {
    // Check if policy applies to document resource type
    if (!policy.appliesToResource(PolicyResourceType.DOCUMENT, document.id.getValue())) {
      return false;
    }

    // Check subject applicability
    switch (policy.subjectType) {
      case PolicySubjectType.USER:
        return policy.appliesToSubject(PolicySubjectType.USER, user.id.getValue());
      
      case PolicySubjectType.ROLE:
        return policy.appliesToSubject(PolicySubjectType.ROLE, user.role);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate a specific policy against user and document (synchronous version)
   */
  private static evaluatePolicySync(
    policy: AccessPolicyEntity,
    user: UserEntity,
    document: DocumentEntity,
    action: PermissionAction
  ): PermissionEvaluationResult {
    // Check if policy grants the required action
    if (!policy.grantsAction(action)) {
      return {
        granted: false,
        reason: `Policy does not grant ${action} permission`,
        policyId: policy.id.getValue(),
        priority: policy.priority
      };
    }

    return {
      granted: true,
      reason: `Policy grants ${action} permission`,
      policyId: policy.id.getValue(),
      priority: policy.priority
    };
  }

  /**
   * Evaluate a specific policy against user and document
   */
  private static evaluatePolicy(
    policy: AccessPolicyEntity,
    user: UserEntity,
    document: DocumentEntity,
    action: PermissionAction
  ): Effect.Effect<PermissionEvaluationResult, DocumentAccessPolicyError, never> {
    // Check if policy grants the required action
    if (!policy.grantsAction(action)) {
      return Effect.succeed({
        granted: false,
        reason: `Policy does not grant ${action} permission`,
        policyId: policy.id.getValue(),
        priority: policy.priority
      });
    }

    return Effect.succeed({
      granted: true,
      reason: `Policy grants ${action} permission`,
      policyId: policy.id.getValue(),
      priority: policy.priority
    });
  }

  /**
   * Get user's effective permissions for a document
   */
  static getUserPermissions(
    user: UserEntity,
    document: DocumentEntity,
    policies: AccessPolicyEntity[]
  ): Effect.Effect<PermissionAction[], DocumentAccessEvaluationError, never> {
    // Check if user is active
    if (!user.isActive) {
      return Effect.fail(new DocumentAccessEvaluationError({
        documentId: document.id.getValue(),
        userId: user.id.getValue(),
        message: 'User is inactive'
      }));
    }

    // Check if document is accessible (not deleted)
    if (document.isDeleted) {
      return Effect.fail(new DocumentAccessEvaluationError({
        documentId: document.id.getValue(),
        userId: user.id.getValue(),
        message: 'Document is deleted'
      }));
    }

    // Admin users have all permissions
    if (user.isAdmin()) {
      return Effect.succeed([PermissionAction.READ, PermissionAction.WRITE, PermissionAction.DELETE, PermissionAction.MANAGE]);
    }

    const permissions: PermissionAction[] = [];
    
    // Check each permission type
    const actions = [PermissionAction.READ, PermissionAction.WRITE, PermissionAction.DELETE, PermissionAction.MANAGE];

    /*
    it is used to check if the user has permission to perform the action
    */
    for (const action of actions) {
      const hasPermission = DocumentAccessService.evaluatePermissionSync(user, document, action, policies);
      if (hasPermission) {
        permissions.push(action);
      }
    }
    
    return Effect.succeed(permissions);
  }

  /**
   * Check if user can manage document permissions
   */
  static canManagePermissions(
    user: UserEntity,
    document: DocumentEntity,
    policies: AccessPolicyEntity[]
  ): Effect.Effect<boolean, DocumentAccessEvaluationError, never> {
    return DocumentAccessService.evaluatePermission(user, document, PermissionAction.MANAGE, policies);
  }

  /**
   * Check if user is document owner
   */
  static isDocumentOwner(user: UserEntity, document: DocumentEntity): boolean {
    return document.uploadedBy === user.id.getValue();
  }
}
