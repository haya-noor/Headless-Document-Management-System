/**
 * Document permission repository interface
 * Defines document permission-specific data access operations
 */

import { DocumentPermission, Permission } from '../../types';
import { BaseRepository } from './base.repository';

/**
 * Document permission creation data transfer object
 */
export interface CreateDocumentPermissionDTO {
  documentId: string;
  userId: string;
  permission: Permission;
  grantedBy: string;
}

/**
 * Document permission update data transfer object
 */
export interface UpdateDocumentPermissionDTO {
  permission?: Permission;
  grantedBy?: string;
}

/**
 * Document permission filter data transfer object
 */
export interface DocumentPermissionFiltersDTO {
  documentId?: string;
  userId?: string;
  permission?: Permission;
  grantedBy?: string;
}

/**
 * Document permission repository interface
 * Extends base repository with permission-specific operations
 */
export interface IDocumentPermissionRepository extends BaseRepository<
  DocumentPermission,
  CreateDocumentPermissionDTO,
  UpdateDocumentPermissionDTO,
  DocumentPermissionFiltersDTO
> {
  /**
   * Find permissions for a specific document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<DocumentPermission[]>} Array of permissions for the document
   */
  findByDocumentId(documentId: string): Promise<DocumentPermission[]>;

  /**
   * Find permissions for a specific user
   * @param {string} userId - User unique identifier
   * @returns {Promise<DocumentPermission[]>} Array of permissions for the user
   */
  findByUserId(userId: string): Promise<DocumentPermission[]>;

  /**
   * Find specific permission for user and document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @returns {Promise<DocumentPermission | null>} Permission or null if not found
   */
  findByDocumentAndUser(documentId: string, userId: string): Promise<DocumentPermission | null>;

  /**
   * Check if user has specific permission for document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @param {Permission} permission - Permission to check
   * @returns {Promise<boolean>} True if user has permission
   */
  hasPermission(documentId: string, userId: string, permission: Permission): Promise<boolean>;

  /**
   * Check if user has any permission for document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user has any permission
   */
  hasAnyPermission(documentId: string, userId: string): Promise<boolean>;

  /**
   * Get user's permissions for document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @returns {Promise<Permission[]>} Array of permissions user has for document
   */
  getUserPermissions(documentId: string, userId: string): Promise<Permission[]>;

  /**
   * Grant permission to user for document
   * @param {CreateDocumentPermissionDTO} permissionData - Permission data
   * @returns {Promise<DocumentPermission>} Created permission
   */
  grantPermission(permissionData: CreateDocumentPermissionDTO): Promise<DocumentPermission>;

  /**
   * Revoke permission from user for document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @param {Permission} permission - Permission to revoke
   * @returns {Promise<boolean>} True if permission was revoked
   */
  revokePermission(documentId: string, userId: string, permission: Permission): Promise<boolean>;

  /**
   * Revoke all permissions from user for document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @returns {Promise<number>} Number of permissions revoked
   */
  revokeAllPermissions(documentId: string, userId: string): Promise<number>;

  /**
   * Update user permission for document
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @param {Permission} oldPermission - Current permission
   * @param {Permission} newPermission - New permission
   * @param {string} grantedBy - User granting the permission
   * @returns {Promise<boolean>} True if permission was updated
   */
  updatePermission(
    documentId: string,
    userId: string,
    oldPermission: Permission,
    newPermission: Permission,
    grantedBy: string
  ): Promise<boolean>;

  /**
   * Find documents user has specific permission for
   * @param {string} userId - User unique identifier
   * @param {Permission} permission - Permission to filter by
   * @returns {Promise<string[]>} Array of document IDs user has permission for
   */
  findDocumentsByUserPermission(userId: string, permission: Permission): Promise<string[]>;

  /**
   * Find users with specific permission for document
   * @param {string} documentId - Document unique identifier
   * @param {Permission} permission - Permission to filter by
   * @returns {Promise<string[]>} Array of user IDs with permission for document
   */
  findUsersByDocumentPermission(documentId: string, permission: Permission): Promise<string[]>;

  /**
   * Copy permissions from one document to another
   * @param {string} sourceDocumentId - Source document ID
   * @param {string} targetDocumentId - Target document ID
   * @param {string} grantedBy - User copying the permissions
   * @returns {Promise<number>} Number of permissions copied
   */
  copyPermissions(sourceDocumentId: string, targetDocumentId: string, grantedBy: string): Promise<number>;

  /**
   * Remove all permissions for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<number>} Number of permissions removed
   */
  removeAllDocumentPermissions(documentId: string): Promise<number>;

  /**
   * Remove all permissions for a user
   * @param {string} userId - User unique identifier
   * @returns {Promise<number>} Number of permissions removed
   */
  removeAllUserPermissions(userId: string): Promise<number>;
}
