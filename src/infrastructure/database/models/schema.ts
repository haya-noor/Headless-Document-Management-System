/**
 * 
 * We declare the indexes and constraints in the schema.ts file, but they are not 
 * actually created in the database until you run db:migrate
 * 
 * When we run db:migrate, Drizzle:
 * - Reads your schema.ts file
 * - Analyzes all the index() definitions
 * - Generates SQL migration files
 * - Creates the indexes in the database
 * 
 */

import { pgTable, text, timestamp, jsonb, boolean, varchar, integer, unique, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { sharedColumns, softDeleteColumns, foreignKey, commonConstraints, commonIndexes } from './shared-columns';

/**
 * Users table - stores user authentication and profile information
 * Uses application-generated UUIDs as primary keys
 */
export const users = pgTable('users', {
  ...sharedColumns,
  email: varchar('email', { length: 255 }).notNull(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' or 'user'
  ...softDeleteColumns,
}, (table) => ({
  // Unique constraints
  emailUnique: unique().on(table.email),
  
  // Check constraints
  validEmail: check('valid_email', commonConstraints.validEmail),
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validRole: check('valid_role', sql`role IN ('admin', 'user')`),
  
  /*
  Indexes 
  -- This is what actually gets created in the database
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_active ON users(is_active);
    CREATE INDEX idx_users_created_at ON users(created_at);

  When you run drizzle-kit generate, Drizzle:
  Reads your schema.ts file
  Analyzes all the index() definitions
  Generates SQL migration files

  so drizzle automatically creates the indexes when you run db:migrate 
  */
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
  activeIdx: index('idx_users_active').on(table.isActive),
  createdAtIdx: index('idx_users_created_at').on(table.createdAt),
}));

/**
 * Documents table - stores document metadata and file information
 * Immutable versioning is handled through separate document_versions table
 * Updated to align with Effect-based domain entities
 */
export const documents = pgTable('documents', {
  ...sharedColumns,
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(), // Storage key/path (FileReferenceVO)
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'), // Storage provider type
  checksum: varchar('checksum', { length: 64 }), // SHA-256 hash (ChecksumVO)
  tags: jsonb('tags').$type<string[]>().default([]), // Array of tags
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}), // Key-value metadata

  // document table has uploaded_by is FK to users.id
  uploadedBy: foreignKey('users', 'uploaded_by'),

  currentVersion: integer('current_version').notNull().default(1),
  ...softDeleteColumns,
}, (table) => ({
  // Check constraints
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  positiveSize: check('positive_size', commonConstraints.positiveSize),
  versionCheck: check('version_check', commonConstraints.versionCheck),
  validStorageProvider: check('valid_storage_provider', sql`storage_provider IN ('local', 's3', 'gcs')`),
  
  // Indexes
  uploadedByIdx: index('idx_documents_uploaded_by').on(table.uploadedBy),
  mimeTypeIdx: index('idx_documents_mime_type').on(table.mimeType),
  storageProviderIdx: index('idx_documents_storage_provider').on(table.storageProvider),
  checksumIdx: index('idx_documents_checksum').on(table.checksum),
  activeIdx: index('idx_documents_active').on(table.isActive),
  createdAtIdx: index('idx_documents_created_at').on(table.createdAt),
}));

/**
 * Access policies table - RBAC(Role-Based Access Control) policies for document access control
 * Defines who can access what resources with what permissions
 * Updated to align with Effect-based domain entities
 */
export const accessPolicies = pgTable('access_policies', {
  ...sharedColumns,
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  subjectType: varchar('subject_type', { length: 20 }).notNull(), // 'user' or 'role'
  subjectId: varchar('subject_id', { length: 36 }), // nullable for role-based policies
  resourceType: varchar('resource_type', { length: 20 }).notNull(), // 'document' or 'global'
  resourceId: varchar('resource_id', { length: 36 }), // nullable for global policies
  actions: jsonb('actions').$type<string[]>().notNull(), // array of permissions
  priority: integer('priority').notNull().default(50), // lower number = higher priority
  ...softDeleteColumns,
}, (table) => ({
  // Check constraints
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validSubjectType: check('valid_subject_type', sql`subject_type IN ('user', 'role')`),
  validResourceType: check('valid_resource_type', sql`resource_type IN ('document', 'global')`),
  validPriority: check('valid_priority', sql`priority > 0 AND priority <= 100`),
  
  // Indexes
  subjectTypeIdx: index('idx_access_policies_subject_type').on(table.subjectType),
  subjectIdIdx: index('idx_access_policies_subject_id').on(table.subjectId),
  resourceTypeIdx: index('idx_access_policies_resource_type').on(table.resourceType),
  resourceIdIdx: index('idx_access_policies_resource_id').on(table.resourceId),
  priorityIdx: index('idx_access_policies_priority').on(table.priority),
  activeIdx: index('idx_access_policies_active').on(table.isActive),
  createdAtIdx: index('idx_access_policies_created_at').on(table.createdAt),
}));

/**
 * Document versions table - immutable file versions for audit trail
 * Each document update creates a new version entry
 * Updated to align with Effect-based domain entities
 */
export const documentVersions = pgTable('document_versions', {
  ...sharedColumns,
  documentId: foreignKey('documents', 'document_id'),
  version: integer('version').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(), // FileReferenceVO
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'),
  checksum: varchar('checksum', { length: 64 }), // ChecksumVO
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

  // document_versions table has uploaded_by is FK to users.id
  uploadedBy: foreignKey('users', 'uploaded_by'),

}, (table) => ({
  // Check constraints
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  versionCheck: check('version_check', commonConstraints.versionCheck),
  positiveSize: check('positive_size', commonConstraints.positiveSize),
  validStorageProvider: check('valid_storage_provider', sql`storage_provider IN ('local', 's3', 'gcs')`),
  
  // Unique constraint for document version combination
  documentVersionUnique: unique().on(table.documentId, table.version),
  
  // Indexes
  documentIdIdx: index('idx_document_versions_document_id').on(table.documentId),
  versionIdx: index('idx_document_versions_version').on(table.version),
  uploadedByIdx: index('idx_document_versions_uploaded_by').on(table.uploadedBy),
  createdAtIdx: index('idx_document_versions_created_at').on(table.createdAt),
}));

/**
 * Document permissions table - RBAC for document access control
 * Defines who can read, write, or delete specific documents
 * Note: This table is deprecated in favor of access_policies table
 * Kept for backward compatibility during migration
 */
export const documentPermissions = pgTable('document_permissions', {
  ...sharedColumns,
  documentId: foreignKey('documents', 'document_id'),
  userId: foreignKey('users', 'user_id'),
  permission: varchar('permission', { length: 20 }).notNull(), // 'read', 'write', 'delete'
  // grantedBy is the user who granted the permission
  grantedBy: foreignKey('users', 'granted_by'),
}, (table) => ({
  // Check constraints
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validPermission: check('valid_permission', sql`permission IN ('read', 'write', 'delete')`),
  
  // Unique constraint for user-document-permission combination
  userDocumentPermissionUnique: unique().on(table.userId, table.documentId, table.permission),
  
  // Indexes
  documentIdIdx: index('idx_document_permissions_document_id').on(table.documentId),
  userIdIdx: index('idx_document_permissions_user_id').on(table.userId),
  permissionIdx: index('idx_document_permissions_permission').on(table.permission),
  createdAtIdx: index('idx_document_permissions_created_at').on(table.createdAt),
}));

/**
 * Audit logs table - tracks all document operations for compliance
 * Immutable log entries for who did what and when
 */
export const auditLogs = pgTable('audit_logs', {
  ...sharedColumns,
  documentId: foreignKey('documents', 'document_id', true), // nullable
  userId: foreignKey('users', 'user_id'),
  action: varchar('action', { length: 50 }).notNull(), // 'upload', 'download', 'update', 'delete', etc.
  details: jsonb('details').$type<Record<string, any>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
}, (table) => ({
  // Check constraints
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validAction: check('valid_action', sql`action IN ('upload', 'download', 'update', 'delete', 'view', 'share', 'permission_change')`),
  
  // Indexes
  documentIdIdx: index('idx_audit_logs_document_id').on(table.documentId),
  userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}));


// Define relationships between tables
/*
many: one to many
one: one to one
*/
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  documentPermissions: many(documentPermissions),
  auditLogs: many(auditLogs),
  accessPolicies: many(accessPolicies),
}));
/*

*/
export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploadedByUser: one(users, {
    //documents.uploadedBy is the FK column on documents table
    fields: [documents.uploadedBy],
    // the FK reference is the users.id column (each document was uploaded by a user
    //one user)
    references: [users.id],
  }),
  versions: many(documentVersions),
  permissions: many(documentPermissions),
  auditLogs: many(auditLogs),
  accessPolicies: many(accessPolicies),
}));

/*
Document relation:
Many-to-One relationship
Each documentVersion belongs to one document.
But one document can have many documentVersions.
documentVersions.documentId is a foreign key referencing documents.id.

uploadedByUser relation:
Many-to-One relationship
Each documentVersion is uploaded by one user.
But one user can upload many documentVersions.
documentVersions.uploadedBy is a foreign key referencing users.id.
*/
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
/*
Document relation: Many-to-One
Each documentPermission belongs to one document.
One document can have many permissions.
documentPermissions.documentId → documents.id

User relation: Many-to-One
Each permission is granted to one user.
One user can have many document permissions.
documentPermissions.userId → users.id

GrantedByUser relation: Many-to-One
Each permission was granted by one user (e.g., an admin or document owner).
One user can grant many permissions.
documentPermissions.grantedBy → users.id
*/
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

/*
user: 
one user can be the author of many audit log rows.
references(means FK): [users.id]

Document: 
one document can have many audit logs.
*/
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


/*
many → one (many policies point to one user/document).

Each access policy may apply to one user (the subject).
Each access policy may target one document (the resource).
Sometimes the subject might not be a user, but a role.
Sometimes the resource might not be a document, but a global resource.
*/
export const accessPoliciesRelations = relations(accessPolicies, ({ one }) => ({
  subjectUser: one(users, {
    fields: [accessPolicies.subjectId],
    references: [users.id],
    relationName: 'subjectUser',
  }),
  resourceDocument: one(documents, {
    fields: [accessPolicies.resourceId],
    references: [documents.id],
    relationName: 'resourceDocument',
  }),
}));
