import { pgTable, varchar, text, jsonb, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { sharedColumns, foreignKey, commonConstraints } from './shared-columns'

/**
 * Audit logs — immutable records of user/document actions
 */
export const auditLogs = pgTable('audit_logs', {
  ...sharedColumns,
  documentId: foreignKey('documents', 'document_id', true),
  userId: foreignKey('users', 'user_id'),
  action: varchar('action', { length: 50 }).notNull(),
  details: jsonb('details').$type<Record<string, any>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
}, (table) => ({
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validAction: check('valid_action', sql`action IN ('upload', 'download', 'update', 'delete', 'view', 'share', 'permission_change')`),
  documentIdIdx: index('idx_audit_logs_document_id').on(table.documentId),
  userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}))
