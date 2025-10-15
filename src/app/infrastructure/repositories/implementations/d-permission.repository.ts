/**
 * Document permission repository implementation using Drizzle ORM
 * Implements document permission data access operations
 */

import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Removed databaseService import to avoid circular dependency
import { documentPermissions } from '../../database/models';
import { DocumentPermission } from '../../../application/interfaces';
import { PaginationParams, PaginatedResponse } from '../../../domain/shared/api.interface';
import { Permission } from '../../../application/types';
import { Repository } from "../../../domain/shared/errors";

// DTO types for document permission repository
export interface DocumentPermissionFiltersDTO {
  documentId?: string;
  userId?: string;
  permission?: Permission;
  grantedBy?: string;
}

export interface CreateDocumentPermissionDTO {
  documentId: string;
  userId: string;
  permission: Permission;
  grantedBy: string;
}

export interface UpdateDocumentPermissionDTO {
  permission?: Permission;
  grantedBy?: string;
}

export class DocumentPermissionRepository {
  private db: any;

  constructor(database?: any) {
    this.db = database;
  }

  /**
   * Get database instance with null check
   */
  private getDb() {
    if (!this.db) {
      throw new Error('Database instance not provided to DocumentPermissionRepository');
    }
    return this.db;
  }

  /**
   * Find document permission by ID
   */
  async findById(id: string): Promise<DocumentPermission | null> {
    try {
      const [permission] = await this.getDb()
        .select()
        .from(documentPermissions)
        .where(eq(documentPermissions.id, id));

      return permission || null;
    } catch (error) {
      throw new Error(`Failed to find document permission by ID: ${error}`);
    }
  }

  /**
   * Find multiple document permissions with optional filtering
   */
  async findMany(filters?: DocumentPermissionFiltersDTO): Promise<DocumentPermission[]> {
    try {
      const query = this.getDb().select().from(documentPermissions);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(documentPermissions.documentId, filters.documentId));
        }
        if (filters.userId) {
          conditions.push(eq(documentPermissions.userId, filters.userId));
        }
        if (filters.permission) {
          conditions.push(eq(documentPermissions.permission, filters.permission));
        }
        if (filters.grantedBy) {
          conditions.push(eq(documentPermissions.grantedBy, filters.grantedBy));
        }
      }

      const result = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;

      return result;
    } catch (error) {
      throw new Error(`Failed to find document permissions: ${error}`);
    }
  }

  /**
   * Find document permissions with pagination
   */
  async findManyPaginated(
    pagination: PaginationParams,
    filters?: DocumentPermissionFiltersDTO
  ): Promise<PaginatedResponse<DocumentPermission>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const query = this.getDb().select().from(documentPermissions);
      const countQuery = this.getDb().select({ count: sql`count(*)` }).from(documentPermissions);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(documentPermissions.documentId, filters.documentId));
        }
        if (filters.userId) {
          conditions.push(eq(documentPermissions.userId, filters.userId));
        }
        if (filters.permission) {
          conditions.push(eq(documentPermissions.permission, filters.permission));
        }
        if (filters.grantedBy) {
          conditions.push(eq(documentPermissions.grantedBy, filters.grantedBy));
        }
      }

      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        whereCondition 
          ? query.where(whereCondition).limit(limit).offset(offset)
          : query.limit(limit).offset(offset),
        whereCondition 
          ? countQuery.where(whereCondition)
          : countQuery
      ]);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Failed to find paginated document permissions: ${error}`);
    }
  }

  /**
   * Find single document permission by filters
   */
  async findOne(filters: DocumentPermissionFiltersDTO): Promise<DocumentPermission | null> {
    try {
      const result = await this.findMany(filters);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to find document permission: ${error}`);
    }
  }

  /**
   * Create new document permission
   */
  async create(data: CreateDocumentPermissionDTO): Promise<DocumentPermission> {
    try {
      const permissionId = uuidv4();
      const now = new Date();

      // insert the document permission into the database
      const [permission] = await this.getDb()
        .insert(documentPermissions)
        // serializes the data into the database, taking the input DTO 
        // and converting it to the database format (DB row)
        .values({
          id: permissionId,
          documentId: data.documentId,
          userId: data.userId,
          permission: data.permission,
          grantedBy: data.grantedBy,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return permission;
    } catch (error) {
      throw new Error(`Failed to create document permission: ${error}`);
    }
  }

  /**
   * Create multiple document permissions
   */
  async createMany(data: CreateDocumentPermissionDTO[]): Promise<DocumentPermission[]> {
    try {
      const now = new Date();
      // mapping DTO into DB row (serializing the data)
      const permissionsToInsert = data.map(permission => ({
        id: uuidv4(),
        documentId: permission.documentId,
        userId: permission.userId,
        permission: permission.permission,
        grantedBy: permission.grantedBy,
        createdAt: now,
        updatedAt: now,
      }));

      const result = await this.getDb()
        .insert(documentPermissions)
        .values(permissionsToInsert)
        .returning();

      return result;
    } catch (error) {
      throw new Error(`Failed to create multiple document permissions: ${error}`);
    }
  }

  /**
   * Update document permission by ID
   */
  async update(id: string, data: UpdateDocumentPermissionDTO): Promise<DocumentPermission | null> {
    try {
      const [permission] = await this.getDb()
        .update(documentPermissions)
        // mapping DTO into DB row (serializing the data)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(documentPermissions.id, id))
        .returning();

      return permission || null;
    } catch (error) {
      throw new Error(`Failed to update document permission: ${error}`);
    }
  }

  /**
   * Delete document permission by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.getDb()
        .delete(documentPermissions)
        .where(eq(documentPermissions.id, id));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete document permission: ${error}`);
    }
  }

  /**
   * Check if document permission exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [permission] = await this.getDb()
        .select({ id: documentPermissions.id })
        .from(documentPermissions)
        .where(eq(documentPermissions.id, id))
        .limit(1);

      return !!permission;
    } catch (error) {
      throw new Error(`Failed to check document permission existence: ${error}`);
    }
  }

  /**
   * Count document permissions with optional filters
   */
  async count(filters?: DocumentPermissionFiltersDTO): Promise<number> {
    try {
      const query = this.getDb().select({ count: sql`count(*)` }).from(documentPermissions);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(documentPermissions.documentId, filters.documentId));
        }
        if (filters.userId) {
          conditions.push(eq(documentPermissions.userId, filters.userId));
        }
      }

      const [result] = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;

      return Number(result.count);
    } catch (error) {
      throw new Error(`Failed to count document permissions: ${error}`);
    }
  }

  /**
   * Find permissions by document ID
   */
  async findByDocumentId(documentId: string): Promise<DocumentPermission[]> {
    try {
      return await this.findMany({ documentId });
    } catch (error) {
      throw new Error(`Failed to find permissions by document ID: ${error}`);
    }
  }

  /**
   * Find permissions by user ID
   */
  async findByUserId(userId: string): Promise<DocumentPermission[]> {
    try {
      return await this.findMany({ userId });
    } catch (error) {
      throw new Error(`Failed to find permissions by user ID: ${error}`);
    }
  }

  /**
   * Find permissions by document and user
   */
  async findByDocumentAndUser(documentId: string, userId: string): Promise<DocumentPermission | null> {
    try {
      const permissions = await this.findMany({ documentId, userId });
      return permissions[0] || null;
    } catch (error) {
      throw new Error(`Failed to find permissions by document and user: ${error}`);
    }
  }

  /**
   * Check if user has specific permission for document
   */
  async hasPermission(documentId: string, userId: string, permission: string): Promise<boolean> {
    try {
      const result = await this.findOne({ documentId, userId, permission: permission as Permission });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to check user permission: ${error}`);
    }
  }

  /**
   * Grant permission to user for document
   */
  async grantPermission(permissionData: CreateDocumentPermissionDTO): Promise<DocumentPermission> {
    try {
      // Check if permission already exists
      const existing = await this.findOne({ 
        documentId: permissionData.documentId, 
        userId: permissionData.userId, 
        permission: permissionData.permission 
      });
      if (existing) {
        return existing;
      }

      return await this.create(permissionData);
    } catch (error) {
      throw new Error(`Failed to grant permission: ${error}`);
    }
  }

  /**
   * Revoke permission from user for document
   */
  async revokePermission(documentId: string, userId: string, permission: string): Promise<boolean> {
    try {
      const existing = await this.findOne({ documentId, userId, permission: permission as Permission });
      // if the permission does not exist, then we return false
      if (!existing) {
        return false;
      }

      // if the permission exists, then we delete it
      return await this.delete(existing.id);
    } catch (error) {
      throw new Error(`Failed to revoke permission: ${error}`);
    }
  }

  /**
   * Revoke all permissions for user on document
   */
  async revokeAllPermissions(documentId: string, userId: string): Promise<number> {
    try {
      const result = await this.getDb()
        .delete(documentPermissions)
        .where(and(
          eq(documentPermissions.documentId, documentId),
          eq(documentPermissions.userId, userId)
        ));

      return result.rowCount || 0;
    } catch (error) {
      throw new Error(`Failed to revoke all permissions: ${error}`);
    }
  }

  /**
   * Delete all permissions for a document
   */
  async deleteByDocumentId(documentId: string): Promise<boolean> {
    try {
      const result = await this.getDb()
        .delete(documentPermissions)
        .where(eq(documentPermissions.documentId, documentId));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete permissions by document ID: ${error}`);
    }
  }

  /**
   * Delete all permissions for a user
   */
  async deleteByUserId(userId: string): Promise<boolean> {
    try {
      const result = await this.getDb()
        .delete(documentPermissions)
        .where(eq(documentPermissions.userId, userId));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete permissions by user ID: ${error}`);
    }
  }

  /**
   * Get documents accessible by user
   */
  async getAccessibleDocuments(userId: string): Promise<string[]> {
    try {
      const permissions = await this.getDb()
        .selectDistinct({ documentId: documentPermissions.documentId })
        .from(documentPermissions)
        .where(eq(documentPermissions.userId, userId));

      return permissions.map((p: any) => p.documentId);
    } catch (error) {
      throw new Error(`Failed to get accessible documents: ${error}`);
    }
  }

  /**
   * Get users with access to document
   */
  async getDocumentUsers(documentId: string): Promise<Array<{ userId: string; permission: string }>> {
    try {
      const permissions = await this.getDb()
        .select({
          userId: documentPermissions.userId,
          permission: documentPermissions.permission,
        })
        .from(documentPermissions)
        .where(eq(documentPermissions.documentId, documentId));

      return permissions;
    } catch (error) {
      throw new Error(`Failed to get document users: ${error}`);
    }
  }

  /**
   * Check if user has any permission for document
   */
  async hasAnyPermission(documentId: string, userId: string): Promise<boolean> {
    try {
      const permissions = await this.findMany({ documentId, userId });
      return permissions.length > 0;
    } catch (error) {
      throw new Error(`Failed to check if user has any permission: ${error}`);
    }
  }

  /**
   * Get user's permissions for document
   */
  async getUserPermissions(documentId: string, userId: string): Promise<Permission[]> {
    try {
      const permissions = await this.findMany({ documentId, userId });
      return permissions.map(p => p.permission as Permission);
    } catch (error) {
      throw new Error(`Failed to get user permissions: ${error}`);
    }
  }

  /**
   * Update user permission for document
   */
  async updatePermission(
    documentId: string,
    userId: string,
    oldPermission: string,
    newPermission: string,
    grantedBy: string
  ): Promise<boolean> {
    try {
      const existing = await this.findOne({ documentId, userId, permission: oldPermission as Permission });
      if (!existing) {
        return false;
      }

      const result = await this.getDb()
        .update(documentPermissions)
        .set({
          permission: newPermission,
          grantedBy,
          updatedAt: new Date(),
        })
        .where(eq(documentPermissions.id, existing.id));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to update permission: ${error}`);
    }
  }

  /**
   * Find documents user has specific permission for
   */
  async findDocumentsByUserPermission(userId: string, permission: string): Promise<string[]> {
    try {
      const permissions = await this.findMany({ userId, permission: permission as Permission });
      return permissions.map((p: any) => p.documentId);
    } catch (error) {
      throw new Error(`Failed to find documents by user permission: ${error}`);
    }
  }

  /**
   * Find users with specific permission for document
   */
  async findUsersByDocumentPermission(documentId: string, permission: string): Promise<string[]> {
    try {
      const permissions = await this.findMany({ documentId, permission: permission as Permission });
      return permissions.map(p => p.userId);
    } catch (error) {
      throw new Error(`Failed to find users by document permission: ${error}`);
    }
  }

  /**
   * Copy permissions from one document to another
   */
  async copyPermissions(sourceDocumentId: string, targetDocumentId: string, grantedBy: string): Promise<number> {
    try {
      const sourcePermissions = await this.findByDocumentId(sourceDocumentId);
      
      if (sourcePermissions.length === 0) {
        return 0;
      }

      const permissionsToCopy = sourcePermissions.map(permission => ({
        documentId: targetDocumentId,
        userId: permission.userId,
        permission: permission.permission as Permission,
        grantedBy,
      }));

      const result = await this.createMany(permissionsToCopy);
      return result.length;
    } catch (error) {
      throw new Error(`Failed to copy permissions: ${error}`);
    }
  }

  /**
   * Remove all permissions for a document
   */
  async removeAllDocumentPermissions(documentId: string): Promise<number> {
    try {
      const result = await this.getDb()
        .delete(documentPermissions)
        .where(eq(documentPermissions.documentId, documentId));

      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to remove all document permissions: ${error}`);
    }
  }

  /**
   * Remove all permissions for a user
   */
  async removeAllUserPermissions(userId: string): Promise<number> {
    try {
      const result = await this.getDb()
        .delete(documentPermissions)
        .where(eq(documentPermissions.userId, userId));

      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to remove all user permissions: ${error}`);
    }
  }

  /**
   * Update multiple permissions by filters
   */
  async updateMany(filters: DocumentPermissionFiltersDTO, data: UpdateDocumentPermissionDTO): Promise<number> {
    try {
      const conditions: any[] = [];

      if (filters.documentId) {
        conditions.push(eq(documentPermissions.documentId, filters.documentId));
      }
      if (filters.userId) {
        conditions.push(eq(documentPermissions.userId, filters.userId));
      }
      if (filters.permission) {
        conditions.push(eq(documentPermissions.permission, filters.permission));
      }
      if (filters.grantedBy) {
        conditions.push(eq(documentPermissions.grantedBy, filters.grantedBy));
      }

      const result = await this.getDb()
        .update(documentPermissions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to update multiple permissions: ${error}`);
    }
  }

  /**
   * Delete multiple permissions by filters
   */
  async deleteMany(filters: DocumentPermissionFiltersDTO): Promise<number> {
    try {
      const conditions: any[] = [];

      if (filters.documentId) {
        conditions.push(eq(documentPermissions.documentId, filters.documentId));
      }
      if (filters.userId) {
        conditions.push(eq(documentPermissions.userId, filters.userId));
      }
      if (filters.permission) {
        conditions.push(eq(documentPermissions.permission, filters.permission));
      }
      if (filters.grantedBy) {
        conditions.push(eq(documentPermissions.grantedBy, filters.grantedBy));
      }

      const result = await this.getDb()
        .delete(documentPermissions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to delete multiple permissions: ${error}`);
    }
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(): Promise<{
    totalPermissions: number;
    permissionsByType: Record<string, number>;
    documentsWithPermissions: number;
    usersWithPermissions: number;
  }> {
    try {
      const [totalCount] = await this.getDb()
        .select({ count: sql`count(*)` })
        .from(documentPermissions);

      const permissionTypeStats = await this.getDb()
        .select({
          permission: documentPermissions.permission,
          count: sql`count(*)`
        })
        .from(documentPermissions)
        .groupBy(documentPermissions.permission);

      const [documentsCount] = await this.getDb()
        .selectDistinct({ count: sql`count(distinct ${documentPermissions.documentId})` })
        .from(documentPermissions);

      const [usersCount] = await this.getDb()
        .selectDistinct({ count: sql`count(distinct ${documentPermissions.userId})` })
        .from(documentPermissions);

      const permissionsByType = permissionTypeStats.reduce((acc: any, stat: any) => {
        acc[stat.permission] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPermissions: Number(totalCount.count),
        permissionsByType,
        documentsWithPermissions: Number(documentsCount.count),
        usersWithPermissions: Number(usersCount.count),
      };
    } catch (error) {
      throw new Error(`Failed to get permission statistics: ${error}`);
    }
  }
}
