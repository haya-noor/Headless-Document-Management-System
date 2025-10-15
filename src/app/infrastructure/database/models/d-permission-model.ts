import { pgTable, varchar, check, unique, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { sharedColumns, foreignKey, commonConstraints } from './shared-columns'

/**
 * Document permissions — legacy per-document RBAC
 */
export const documentPermissions = pgTable('document_permissions', {
  ...sharedColumns,
  documentId: foreignKey('documents', 'document_id'),
  userId: foreignKey('users', 'user_id'),
  permission: varchar('permission', { length: 20 }).notNull(),
  grantedBy: foreignKey('users', 'granted_by'),
}, (table) => ({
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validPermission: check('valid_permission', sql`permission IN ('read', 'write', 'delete')`),
  userDocumentPermissionUnique: unique().on(table.userId, table.documentId, table.permission),
  documentIdIdx: index('idx_document_permissions_document_id').on(table.documentId),
  userIdIdx: index('idx_document_permissions_user_id').on(table.userId),
  permissionIdx: index('idx_document_permissions_permission').on(table.permission),
  createdAtIdx: index('idx_document_permissions_created_at').on(table.createdAt),
}))
