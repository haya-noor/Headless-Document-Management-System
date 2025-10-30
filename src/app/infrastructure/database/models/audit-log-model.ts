import { pgTable, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { foreignKey, commonConstraints } from './shared-columns'

/**
 * Audit Logs table — persistent audit trail for compliance and debugging
 */
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 36 }),
  action: varchar('action', { length: 50 }).notNull(),
  userId: foreignKey('users', 'user_id').notNull(),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull(),
  correlationId: varchar('correlation_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'success' | 'failure'
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  validUuid: commonConstraints.validUuid,
  userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
  workspaceIdIdx: index('idx_audit_logs_workspace_id').on(table.workspaceId),
  correlationIdIdx: index('idx_audit_logs_correlation_id').on(table.correlationId),
  eventTypeIdx: index('idx_audit_logs_event_type').on(table.eventType),
  resourceTypeIdx: index('idx_audit_logs_resource_type').on(table.resourceType),
  resourceIdIdx: index('idx_audit_logs_resource_id').on(table.resourceId),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}))

