import { relations } from 'drizzle-orm'
import { users } from './users-model'
import { documents } from './documents-model'
import { documentVersions } from './d-version-model'
import { documentPermissions } from './d-permission-model'
import { accessPolicies } from './access-policy-model'
import { auditLogs } from './audit-logs-model'

/**
 * Relations across models (normalized for Drizzle introspection)
 */
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  documentPermissions: many(documentPermissions),
  auditLogs: many(auditLogs),
  accessPolicies: many(accessPolicies),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploadedByUser: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  versions: many(documentVersions),
  permissions: many(documentPermissions),
  auditLogs: many(auditLogs),
  accessPolicies: many(accessPolicies),
}))

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  uploadedByUser: one(users, { fields: [documentVersions.uploadedBy], references: [users.id] }),
}))

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, { fields: [documentPermissions.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentPermissions.userId], references: [users.id] }),
  grantedByUser: one(users, { fields: [documentPermissions.grantedBy], references: [users.id] }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  document: one(documents, { fields: [auditLogs.documentId], references: [documents.id] }),
}))

export const accessPoliciesRelations = relations(accessPolicies, ({ one }) => ({
  subjectUser: one(users, { fields: [accessPolicies.subjectId], references: [users.id] }),
  resourceDocument: one(documents, { fields: [accessPolicies.resourceId], references: [documents.id] }),
}))
