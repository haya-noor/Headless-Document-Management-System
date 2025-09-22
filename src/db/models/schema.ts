/**
 * Database schema definitions using Drizzle ORM
 * Defines all tables and relationships for the document management system
 */

import { pgTable, text, timestamp, jsonb, boolean, varchar, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users table - stores user authentication and profile information
 * Uses application-generated UUIDs as primary keys
 */
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(), // Application-generated UUID
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' or 'user'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Documents table - stores document metadata and file information
 * Immutable versioning is handled through separate document_versions table
 */
export const documents = pgTable('documents', {
  id: varchar('id', { length: 36 }).primaryKey(), // Application-generated UUID
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(), // Storage key/path
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'), // Storage provider type
  checksum: varchar('checksum', { length: 64 }), // SHA-256 hash
  tags: jsonb('tags').$type<string[]>().default([]), // Array of tags
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}), // Key-value metadata
  uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
  currentVersion: integer('current_version').notNull().default(1),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Document versions table - immutable file versions for audit trail
 * Each document update creates a new version entry
 */
export const documentVersions = pgTable('document_versions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('document_id', { length: 36 }).notNull(),
  version: integer('version').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'),
  checksum: varchar('checksum', { length: 64 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  uploadedBy: varchar('uploaded_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Document permissions table - RBAC for document access control
 * Defines who can read, write, or delete specific documents
 */
export const documentPermissions = pgTable('document_permissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('document_id', { length: 36 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  permission: varchar('permission', { length: 20 }).notNull(), // 'read', 'write', 'delete'
  grantedBy: varchar('granted_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Audit logs table - tracks all document operations for compliance
 * Immutable log entries for who did what and when
 */
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('document_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'upload', 'download', 'update', 'delete', etc.
  details: jsonb('details').$type<Record<string, any>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Token blacklist table - stores invalidated JWT tokens
 * Used for logout functionality to invalidate tokens
 */
export const tokenBlacklist = pgTable('token_blacklist', {
  id: varchar('id', { length: 36 }).primaryKey(),
  token: text('token').notNull().unique(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relationships between tables
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  documentPermissions: many(documentPermissions),
  auditLogs: many(auditLogs),
  blacklistedTokens: many(tokenBlacklist),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  versions: many(documentVersions),
  permissions: many(documentPermissions),
  auditLogs: many(auditLogs),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
  uploadedByUser: one(users, {
    fields: [documentVersions.uploadedBy],
    references: [users.id],
  }),
}));

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, {
    fields: [documentPermissions.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentPermissions.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [documentPermissions.grantedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [auditLogs.documentId],
    references: [documents.id],
  }),
}));

export const tokenBlacklistRelations = relations(tokenBlacklist, ({ one }) => ({
  user: one(users, {
    fields: [tokenBlacklist.userId],
    references: [users.id],
  }),
}));
