import { pgTable, varchar, integer, jsonb, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { sharedColumns, foreignKey, commonConstraints } from './shared-columns'

/**
 * Access policies — RBAC policies for users and documents
 */
export const accessPolicies = pgTable('access_policies', {
  ...sharedColumns,
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  subjectType: varchar('subject_type', { length: 10 }).notNull(),
  subjectId: foreignKey('users', 'subject_id'),
  resourceType: varchar('resource_type', { length: 10 }).notNull(),
  resourceId: foreignKey('documents', 'resource_id', true),
  actions: jsonb('actions').$type<string[]>().notNull(),
  isActive: varchar('is_active', { length: 1 }).notNull().default('Y'),
  priority: integer('priority').notNull().default(100),
}, (table) => ({
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validSubjectType: check('valid_subject_type', sql`subject_type IN ('user', 'role')`),
  validResourceType: check('valid_resource_type', sql`resource_type IN ('document', 'user')`),
  validActions: check('valid_actions', sql`jsonb_array_length(actions) > 0 AND jsonb_array_length(actions) <= 4`),
  validPriority: check('valid_priority', sql`priority >= 1 AND priority <= 1000`),
  validActive: check('valid_active', sql`is_active IN ('Y', 'N')`),
  subjectIdIdx: index('idx_access_policies_subject_id').on(table.subjectId),
  resourceIdIdx: index('idx_access_policies_resource_id').on(table.resourceId),
  subjectTypeIdx: index('idx_access_policies_subject_type').on(table.subjectType),
  resourceTypeIdx: index('idx_access_policies_resource_type').on(table.resourceType),
  priorityIdx: index('idx_access_policies_priority').on(table.priority),
  activeIdx: index('idx_access_policies_active').on(table.isActive),
  createdAtIdx: index('idx_access_policies_created_at').on(table.createdAt),
}))