import { pgTable, varchar, integer, jsonb, check, unique, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { sharedColumns, foreignKey, commonConstraints } from './shared-columns'

/**
 * Document versions — immutable file snapshots
 */
export const documentVersions = pgTable('document_versions', {
  ...sharedColumns,
  documentId: foreignKey('documents', 'document_id'),
  version: integer('version').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'),
  checksum: varchar('checksum', { length: 64 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  uploadedBy: foreignKey('users', 'uploaded_by'),
}, (table) => ({
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  versionCheck: check('version_check', commonConstraints.versionCheck),
  positiveSize: check('positive_size', commonConstraints.positiveSize),
  validStorageProvider: check('valid_storage_provider', sql`storage_provider IN ('local', 's3', 'gcs')`),
  documentVersionUnique: unique().on(table.documentId, table.version),
  documentIdIdx: index('idx_document_versions_document_id').on(table.documentId),
  versionIdx: index('idx_document_versions_version').on(table.version),
  uploadedByIdx: index('idx_document_versions_uploaded_by').on(table.uploadedBy),
  createdAtIdx: index('idx_document_versions_created_at').on(table.createdAt),
}))
