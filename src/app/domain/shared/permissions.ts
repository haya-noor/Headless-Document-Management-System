import { Schema as S } from "effect"

/**
 * Standard Permissions for the Document Management System
 * 
 * Default permissions available across the system:
 * - read: View/access document
 * - write/update: Modify document content and metadata
 * - delete: Remove document
 * - manage: Full control (grant/revoke permissions, delete, etc.)
 * 
 * Permission scopes:
 * - document.*: Document-level permissions
 * - workspace.*: Workspace-level permissions
 * - global.*: System-wide permissions
 */

/**
 * Core document actions
 */
export const DocumentActions = S.Literal("read", "write", "update", "delete", "manage")

export type DocumentAction = S.Schema.Type<typeof DocumentActions>

/**
 * Permission constants for consistent usage
 */
export const Permissions = {
  // Document actions
  READ: "read" as const,
  WRITE: "write" as const,
  UPDATE: "update" as const,
  DELETE: "delete" as const,
  MANAGE: "manage" as const,
} as const

/**
 * Permission mapping - maps actions to equivalent permissions
 * Some systems use "write", others use "update" - we standardize here
 */
export const PermissionAliases = {
  write: ["write", "update"] as const,
  update: ["write", "update"] as const,
  read: ["read"] as const,
  delete: ["delete"] as const,
  manage: ["read", "write", "update", "delete", "manage"] as const,
} as const

/**
 * Default role permissions
 */
export const DefaultRolePermissions = {
  admin: {
    document: [Permissions.READ, Permissions.WRITE, Permissions.UPDATE, Permissions.DELETE, Permissions.MANAGE],
    workspace: [Permissions.MANAGE],
    global: [Permissions.MANAGE],
  },
  editor: {
    document: [Permissions.READ, Permissions.WRITE, Permissions.UPDATE],
    workspace: [Permissions.READ],
  },
  viewer: {
    document: [Permissions.READ],
    workspace: [Permissions.READ],
  },
} as const

/**
 * Check if an action is allowed by permission list
 */
export function hasPermission(
  permissions: string[],
  requiredAction: DocumentAction
): boolean {
  // Admin has all permissions
  if (permissions.includes("*") || permissions.includes(Permissions.MANAGE)) {
    return true
  }

  // Check direct permission
  if (permissions.includes(requiredAction)) {
    return true
  }

  // Check aliases (write <-> update)
  const aliases = PermissionAliases[requiredAction as keyof typeof PermissionAliases]
  if (aliases) {
    return aliases.some(alias => permissions.includes(alias))
  }

  return false
}

