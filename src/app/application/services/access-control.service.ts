
// RBAC (Role base access control)
import { Effect as E } from 'effect';
import { UserContext } from '@/presentation/http/orpc/auth';
import { BusinessRuleViolationError } from '@/app/domain/shared/base.errors';
import { logger } from '@/app/application/utils/logger';

export interface Permission {
  // permission applied to resource document, user
  resource: string;
  // operation allowed on the resource read, write,create etc 
  action: string;
  scope?: 'own' | 'workspace' | 'global';
}

// RBAC is enforced using AccessControlService 
export class AccessControlService {
  private readonly rolePermissions: Record<string, Permission[]> = {
    admin: [
      { resource: 'document', action: '*', scope: 'global' },
      { resource: 'user', action: '*', scope: 'global' },
      { resource: 'workspace', action: '*', scope: 'global' }
    ],
    editor: [
      { resource: 'document', action: 'create', scope: 'workspace' },
      { resource: 'document', action: 'read', scope: 'workspace' },
      { resource: 'document', action: 'update', scope: 'own' },
      { resource: 'document', action: 'publish', scope: 'own' }
    ],
    viewer: [
      { resource: 'document', action: 'read', scope: 'workspace' }
    ]
  };

  can(
    user: UserContext, 
    resource: string, 
    action: string, 
    context?: { resourceOwnerId?: string; workspaceId?: string }
  ): boolean {
    // gather all permissions granted by all of the user's role 
    const permissions = this.getUserPermissions(user);
    
    return permissions.some(permission => {
      // Check wildcard permissions
      if (permission.action === '*') {
        return this.checkScope(permission, user, context);
      }
      
      // Check specific action
      if (permission.resource === resource && permission.action === action) {
        return this.checkScope(permission, user, context);
      }
      
      return false;
    });
  }

  private getUserPermissions(user: UserContext): Permission[] {
    return user.roles.flatMap(role => this.rolePermissions[role] || []);
  }

   /**
   * Enforces the scope dimension of a permission.
   * - 'global'    → always true (permission applies to all workspaces/resources)
   * - 'workspace' → (currently) assumes the user is already context-validated for the workspace
   * - 'own'       → only if the resource owner equals the user
   */
  private checkScope(
    permission: Permission, 
    user: UserContext, 
    context?: { resourceOwnerId?: string; workspaceId?: string }
  ): boolean {
    switch (permission.scope) {
      case 'global':
        return true;
      case 'workspace':
        return true; // User is already in the workspace context
      case 'own':
        return context?.resourceOwnerId === user.userId;
      default:
        return true;
    }
  }
  /**
   * Effectful guard that either succeeds (void) if access is allowed,
   * or fails with a BusinessRuleViolationError(ACCESS_DENIED) if denied.
   *
   * This lets workflows compose access checks within Effect pipelines.
   */
  enforceAccess(
    user: UserContext, 
    resource: string, 
    action: string, 
    context?: { resourceOwnerId?: string; workspaceId?: string }
  ): E.Effect<void, BusinessRuleViolationError> {
    if (this.can(user, resource, action, context)) {
      return E.succeed(undefined);
    }

    logger.warn({
      userId: user.userId,
      workspaceId: user.workspaceId,
      resource,
      action,
      context
    }, 'Access denied');

    return E.fail(
      BusinessRuleViolationError.withContext(
        'ACCESS_DENIED',
        `User does not have permission to ${action} ${resource}`,
        { userId: user.userId, resource, action }
      )
    );
  }
}