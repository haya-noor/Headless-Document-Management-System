import { pgTable, varchar, integer, jsonb, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { sharedColumns, softDeleteColumns, foreignKey, commonConstraints } from './shared-columns'

/**
 * Documents table — immutable metadata and file info
 */
export const documents = pgTable('documents', {
  ...sharedColumns,
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'),
  checksum: varchar('checksum', { length: 64 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  uploadedBy: foreignKey('users', 'uploaded_by'),
  currentVersion: integer('current_version').notNull().default(1),
  ...softDeleteColumns,
}, (table) => ({
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  positiveSize: check('positive_size', commonConstraints.positiveSize),
  versionCheck: check('version_check', commonConstraints.versionCheck),
  validStorageProvider: check('valid_storage_provider', sql`storage_provider IN ('local', 's3', 'gcs')`),
  uploadedByIdx: index('idx_documents_uploaded_by').on(table.uploadedBy),
  mimeTypeIdx: index('idx_documents_mime_type').on(table.mimeType),
  storageProviderIdx: index('idx_documents_storage_provider').on(table.storageProvider),
  checksumIdx: index('idx_documents_checksum').on(table.checksum),
  activeIdx: index('idx_documents_active').on(table.isActive),
  createdAtIdx: index('idx_documents_created_at').on(table.createdAt),
}))
