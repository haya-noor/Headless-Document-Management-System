
// RBAC (Role base access control)
import { Effect as E } from 'effect';
import { UserContext } from '@/presentation/http/middleware/auth.middleware';
import { BusinessRuleViolationError } from '@/app/domain/shared/base.errors';
import logger from '@/presentation/utils/logger';

export interface Permission {
  resource: string;
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

  can(user: UserContext, resource: string, action: string, context?: { resourceOwnerId?: string }): boolean {
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

  private checkScope(permission: Permission, user: UserContext, context?: { resourceOwnerId?: string }): boolean {
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

  enforceAccess(
    user: UserContext, 
    resource: string, 
    action: string, 
    context?: { resourceOwnerId?: string }
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