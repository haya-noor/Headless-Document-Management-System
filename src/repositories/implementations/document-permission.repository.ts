/**
 * Document permission repository implementation using Drizzle ORM
 * Implements document permission data access operations
 */

import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseConfig } from '../../config/database';
import { documentPermissions } from '../../models/schema';
import { DocumentPermission, PaginationParams, PaginatedResponse } from '../../types';
import { 
  IDocumentPermissionRepository, 
  CreateDocumentPermissionDTO,
  UpdateDocumentPermissionDTO,
  DocumentPermissionFiltersDTO 
} from '../interfaces/document-permission.repository';

export class DocumentPermissionRepository implements IDocumentPermissionRepository {
  /**
   * Find document permission by ID
   */
  async findById(id: string): Promise<DocumentPermission | null> {
    try {
      const [permission] = await databaseConfig.db
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
      const query = databaseConfig.db.select().from(documentPermissions);
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

      const query = databaseConfig.db.select().from(documentPermissions);
      const countQuery = databaseConfig.db.select({ count: sql`count(*)` }).from(documentPermissions);
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

      const [permission] = await databaseConfig.db
        .insert(documentPermissions)
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
      const permissionsToInsert = data.map(permission => ({
        id: uuidv4(),
        documentId: permission.documentId,
        userId: permission.userId,
        permission: permission.permission,
        grantedBy: permission.grantedBy,
        createdAt: now,
        updatedAt: now,
      }));

      const result = await databaseConfig.db
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
      const [permission] = await databaseConfig.db
        .update(documentPermissions)
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
      const result = await databaseConfig.db
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
      const [permission] = await databaseConfig.db
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
      const query = databaseConfig.db.select({ count: sql`count(*)` }).from(documentPermissions);
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
  async findByDocumentAndUser(documentId: string, userId: string): Promise<DocumentPermission[]> {
    try {
      return await this.findMany({ documentId, userId });
    } catch (error) {
      throw new Error(`Failed to find permissions by document and user: ${error}`);
    }
  }

  /**
   * Check if user has specific permission for document
   */
  async hasPermission(documentId: string, userId: string, permission: string): Promise<boolean> {
    try {
      const result = await this.findOne({ documentId, userId, permission });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to check user permission: ${error}`);
    }
  }

  /**
   * Grant permission to user for document
   */
  async grantPermission(
    documentId: string,
    userId: string,
    permission: string,
    grantedBy: string
  ): Promise<DocumentPermission> {
    try {
      // Check if permission already exists
      const existing = await this.findOne({ documentId, userId, permission });
      if (existing) {
        return existing;
      }

      return await this.create({
        documentId,
        userId,
        permission,
        grantedBy,
      });
    } catch (error) {
      throw new Error(`Failed to grant permission: ${error}`);
    }
  }

  /**
   * Revoke permission from user for document
   */
  async revokePermission(documentId: string, userId: string, permission: string): Promise<boolean> {
    try {
      const existing = await this.findOne({ documentId, userId, permission });
      if (!existing) {
        return false;
      }

      return await this.delete(existing.id);
    } catch (error) {
      throw new Error(`Failed to revoke permission: ${error}`);
    }
  }

  /**
   * Revoke all permissions for user on document
   */
  async revokeAllPermissions(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await databaseConfig.db
        .delete(documentPermissions)
        .where(and(
          eq(documentPermissions.documentId, documentId),
          eq(documentPermissions.userId, userId)
        ));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to revoke all permissions: ${error}`);
    }
  }

  /**
   * Delete all permissions for a document
   */
  async deleteByDocumentId(documentId: string): Promise<boolean> {
    try {
      const result = await databaseConfig.db
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
      const result = await databaseConfig.db
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
      const permissions = await databaseConfig.db
        .selectDistinct({ documentId: documentPermissions.documentId })
        .from(documentPermissions)
        .where(eq(documentPermissions.userId, userId));

      return permissions.map(p => p.documentId);
    } catch (error) {
      throw new Error(`Failed to get accessible documents: ${error}`);
    }
  }

  /**
   * Get users with access to document
   */
  async getDocumentUsers(documentId: string): Promise<Array<{ userId: string; permission: string }>> {
    try {
      const permissions = await databaseConfig.db
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
   * Get permission statistics
   */
  async getPermissionStats(): Promise<{
    totalPermissions: number;
    permissionsByType: Record<string, number>;
    documentsWithPermissions: number;
    usersWithPermissions: number;
  }> {
    try {
      const [totalCount] = await databaseConfig.db
        .select({ count: sql`count(*)` })
        .from(documentPermissions);

      const permissionTypeStats = await databaseConfig.db
        .select({
          permission: documentPermissions.permission,
          count: sql`count(*)`
        })
        .from(documentPermissions)
        .groupBy(documentPermissions.permission);

      const [documentsCount] = await databaseConfig.db
        .selectDistinct({ count: sql`count(distinct ${documentPermissions.documentId})` })
        .from(documentPermissions);

      const [usersCount] = await databaseConfig.db
        .selectDistinct({ count: sql`count(distinct ${documentPermissions.userId})` })
        .from(documentPermissions);

      const permissionsByType = permissionTypeStats.reduce((acc, stat) => {
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
