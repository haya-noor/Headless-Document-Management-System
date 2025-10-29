import { Effect as E } from "effect"
import { BusinessRuleViolationError } from "@/app/domain/shared/base.errors"
import { Permissions, hasPermission, type DocumentAction } from "@/app/domain/shared/permissions"

/**
 * User Context interface for access control
 */
export interface UserContext {
  readonly userId: string
  readonly workspaceId: string
  readonly roles: readonly ("admin" | "user")[]
  readonly correlationId: string
}

/**
 * Access Control Service - RBAC enforcement
 * 
 * Standard permissions:
 * - read: View/access document
 * - write/update: Modify document (synonyms)
 * - delete: Remove document
 * - manage: Full control (grant/revoke permissions)
 */
export class AccessControlService {
  /**
   * Check if user can perform action on resource
   */
  can(
    user: UserContext,
    resource: string,
    action: string,
    context?: { resourceOwnerId?: string; workspaceId?: string }
  ): boolean {
    // Admin has all permissions
    if (user.roles.includes("admin")) {
      return true
    }

    // Map action to document action
    const documentAction = this.mapActionToDocumentAction(action)
    
    // Check if user owns the resource (owners have full access)
    if (context?.resourceOwnerId && context.resourceOwnerId === user.userId) {
      return true
    }

    // Check workspace-level permissions
    if (context?.workspaceId && context.workspaceId === user.workspaceId) {
      // Workspace members have read by default
      if (documentAction === Permissions.READ) {
        return true
      }
    }

    // Map roles to permissions
    const rolePermissions: Record<string, DocumentAction[]> = {
      admin: [Permissions.READ, Permissions.WRITE, Permissions.UPDATE, Permissions.DELETE, Permissions.MANAGE],
      editor: [Permissions.READ, Permissions.WRITE, Permissions.UPDATE],
      viewer: [Permissions.READ],
    }

    const userPermissions: DocumentAction[] = []
    user.roles.forEach((role: string) => {
      const permissions = rolePermissions[role as keyof typeof rolePermissions] || []
      userPermissions.push(...permissions)
    })

    return hasPermission(userPermissions, documentAction)
  }

  /**
   * Enforce access control - throws error if access denied
   */
  enforceAccess(
    user: UserContext,
    resource: string,
    action: string,
    context?: { resourceOwnerId?: string; workspaceId?: string }
  ): E.Effect<void, BusinessRuleViolationError> {
    if (this.can(user, resource, action, context)) {
      return E.succeed(void 0)
    }

    return E.fail(
      new BusinessRuleViolationError({
        message: `Access denied: User ${user.userId} cannot ${action} ${resource}`,
        code: "ACCESS_DENIED",
        context: { userId: user.userId, resource, action, workspaceId: user.workspaceId }
      })
    )
  }

  /**
   * Map generic action to document action
   */
  private mapActionToDocumentAction(action: string): DocumentAction {
    const actionMap: Record<string, DocumentAction> = {
      "read": Permissions.READ,
      "view": Permissions.READ,
      "get": Permissions.READ,
      "write": Permissions.WRITE,
      "update": Permissions.UPDATE,
      "edit": Permissions.UPDATE,
      "delete": Permissions.DELETE,
      "remove": Permissions.DELETE,
      "manage": Permissions.MANAGE,
      "create": Permissions.WRITE,
      "publish": Permissions.WRITE,
    }
    return actionMap[action.toLowerCase()] || Permissions.READ
  }
}