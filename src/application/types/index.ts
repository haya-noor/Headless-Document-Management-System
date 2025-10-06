/**
 * Core type definitions for the document management system
 * Defines types and enums used throughout the application
 */

/**
 * User role enumeration for RBAC
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * Document permission types
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

/**
 * Audit log action types
 */
export enum AuditAction {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
}

/**
 * Metadata value type - can be string, number, boolean, or null
 */
export type MetadataValue = string | number | boolean | null;
