/**
 * Document version repository implementation using Drizzle ORM
 * Implements document version data access operations
 */

import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseConfig } from '../../config/database';
import { documentVersions } from '../../models/schema';
import { DocumentVersion, PaginationParams, PaginatedResponse } from '../../types';
import { 
  IDocumentVersionRepository, 
  CreateDocumentVersionDTO,
  DocumentVersionFiltersDTO 
} from '../interfaces/document-version.repository';

export class DocumentVersionRepository implements IDocumentVersionRepository {
  /**
   * Find document version by ID
   */
  async findById(id: string): Promise<DocumentVersion | null> {
    try {
      const [version] = await databaseConfig.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, id));

      return version || null;
    } catch (error) {
      throw new Error(`Failed to find document version by ID: ${error}`);
    }
  }

  /**
   * Find multiple document versions with optional filtering
   */
  async findMany(filters?: DocumentVersionFiltersDTO): Promise<DocumentVersion[]> {
    try {
      const query = databaseConfig.db.select().from(documentVersions);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(documentVersions.documentId, filters.documentId));
        }
        if (filters.version) {
          conditions.push(eq(documentVersions.version, filters.version));
        }
        if (filters.uploadedBy) {
          conditions.push(eq(documentVersions.uploadedBy, filters.uploadedBy));
        }
        if (filters.dateFrom) {
          conditions.push(gte(documentVersions.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(documentVersions.createdAt, filters.dateTo));
        }
      }

      const result = conditions.length > 0 
        ? await query.where(and(...conditions)).orderBy(desc(documentVersions.version))
        : await query.orderBy(desc(documentVersions.version));

      return result;
    } catch (error) {
      throw new Error(`Failed to find document versions: ${error}`);
    }
  }

  /**
   * Find document versions with pagination
   */
  async findManyPaginated(
    pagination: PaginationParams,
    filters?: DocumentVersionFiltersDTO
  ): Promise<PaginatedResponse<DocumentVersion>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const query = databaseConfig.db.select().from(documentVersions);
      const countQuery = databaseConfig.db.select({ count: sql`count(*)` }).from(documentVersions);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(documentVersions.documentId, filters.documentId));
        }
        if (filters.version) {
          conditions.push(eq(documentVersions.version, filters.version));
        }
        if (filters.uploadedBy) {
          conditions.push(eq(documentVersions.uploadedBy, filters.uploadedBy));
        }
        if (filters.dateFrom) {
          conditions.push(gte(documentVersions.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(documentVersions.createdAt, filters.dateTo));
        }
      }

      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        whereCondition 
          ? query.where(whereCondition).orderBy(desc(documentVersions.version)).limit(limit).offset(offset)
          : query.orderBy(desc(documentVersions.version)).limit(limit).offset(offset),
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
      throw new Error(`Failed to find paginated document versions: ${error}`);
    }
  }

  /**
   * Find single document version by filters
   */
  async findOne(filters: DocumentVersionFiltersDTO): Promise<DocumentVersion | null> {
    try {
      const result = await this.findMany(filters);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to find document version: ${error}`);
    }
  }

  /**
   * Create new document version
   */
  async create(data: CreateDocumentVersionDTO): Promise<DocumentVersion> {
    try {
      const versionId = uuidv4();
      const now = new Date();

      const [version] = await databaseConfig.db
        .insert(documentVersions)
        .values({
          id: versionId,
          documentId: data.documentId,
          version: data.version,
          filename: data.filename,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
          storageProvider: data.storageProvider || 'local',
          checksum: data.checksum,
          tags: data.tags || [],
          metadata: data.metadata || {},
          uploadedBy: data.uploadedBy,
          createdAt: now,
        })
        .returning();

      return version;
    } catch (error) {
      throw new Error(`Failed to create document version: ${error}`);
    }
  }

  /**
   * Create multiple document versions
   */
  async createMany(data: CreateDocumentVersionDTO[]): Promise<DocumentVersion[]> {
    try {
      const now = new Date();
      const versionsToInsert = data.map(version => ({
        id: uuidv4(),
        documentId: version.documentId,
        version: version.version,
        filename: version.filename,
        mimeType: version.mimeType,
        size: version.size,
        storageKey: version.storageKey,
        storageProvider: version.storageProvider || 'local',
        checksum: version.checksum,
        tags: version.tags || [],
        metadata: version.metadata || {},
        uploadedBy: version.uploadedBy,
        createdAt: now,
      }));

      const result = await databaseConfig.db
        .insert(documentVersions)
        .values(versionsToInsert)
        .returning();

      return result;
    } catch (error) {
      throw new Error(`Failed to create multiple document versions: ${error}`);
    }
  }

  /**
   * Document versions are immutable - update not allowed
   */
  async update(): Promise<DocumentVersion | null> {
    throw new Error('Document versions are immutable and cannot be updated');
  }

  /**
   * Delete document version by ID (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await databaseConfig.db
        .delete(documentVersions)
        .where(eq(documentVersions.id, id));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete document version: ${error}`);
    }
  }

  /**
   * Check if document version exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [version] = await databaseConfig.db
        .select({ id: documentVersions.id })
        .from(documentVersions)
        .where(eq(documentVersions.id, id))
        .limit(1);

      return !!version;
    } catch (error) {
      throw new Error(`Failed to check document version existence: ${error}`);
    }
  }

  /**
   * Count document versions with optional filters
   */
  async count(filters?: DocumentVersionFiltersDTO): Promise<number> {
    try {
      const query = databaseConfig.db.select({ count: sql`count(*)` }).from(documentVersions);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(documentVersions.documentId, filters.documentId));
        }
        if (filters.uploadedBy) {
          conditions.push(eq(documentVersions.uploadedBy, filters.uploadedBy));
        }
      }

      const [result] = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;

      return Number(result.count);
    } catch (error) {
      throw new Error(`Failed to count document versions: ${error}`);
    }
  }

  /**
   * Find all versions for a document
   */
  async findByDocumentId(documentId: string): Promise<DocumentVersion[]> {
    try {
      return await this.findMany({ documentId });
    } catch (error) {
      throw new Error(`Failed to find versions by document ID: ${error}`);
    }
  }

  /**
   * Find specific version of a document
   */
  async findByDocumentAndVersion(documentId: string, version: number): Promise<DocumentVersion | null> {
    try {
      return await this.findOne({ documentId, version });
    } catch (error) {
      throw new Error(`Failed to find document version: ${error}`);
    }
  }

  /**
   * Find latest version of a document
   */
  async findLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    try {
      const [version] = await databaseConfig.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version))
        .limit(1);

      return version || null;
    } catch (error) {
      throw new Error(`Failed to find latest document version: ${error}`);
    }
  }

  /**
   * Get version history for a document
   */
  async getVersionHistory(documentId: string, limit?: number): Promise<DocumentVersion[]> {
    try {
      const query = databaseConfig.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version));

      if (limit) {
        return await query.limit(limit);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to get version history: ${error}`);
    }
  }

  /**
   * Get next version number for a document
   */
  async getNextVersionNumber(documentId: string): Promise<number> {
    try {
      const [result] = await databaseConfig.db
        .select({ maxVersion: sql`max(${documentVersions.version})` })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      const currentMax = Number(result?.maxVersion || 0);
      return currentMax + 1;
    } catch (error) {
      throw new Error(`Failed to get next version number: ${error}`);
    }
  }

  /**
   * Find versions by uploader
   */
  async findByUploader(userId: string): Promise<DocumentVersion[]> {
    try {
      return await this.findMany({ uploadedBy: userId });
    } catch (error) {
      throw new Error(`Failed to find versions by uploader: ${error}`);
    }
  }

  /**
   * Find versions within date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<DocumentVersion[]> {
    try {
      return await this.findMany({ dateFrom: startDate, dateTo: endDate });
    } catch (error) {
      throw new Error(`Failed to find versions by date range: ${error}`);
    }
  }

  /**
   * Delete all versions for a document
   */
  async deleteByDocumentId(documentId: string): Promise<boolean> {
    try {
      const result = await databaseConfig.db
        .delete(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete versions by document ID: ${error}`);
    }
  }

  /**
   * Get version statistics for a document
   */
  async getVersionStats(documentId: string): Promise<{
    totalVersions: number;
    latestVersion: number;
    totalSize: number;
    oldestCreatedAt: Date | null;
    newestCreatedAt: Date | null;
  }> {
    try {
      const [stats] = await databaseConfig.db
        .select({
          totalVersions: sql`count(*)`,
          latestVersion: sql`max(${documentVersions.version})`,
          totalSize: sql`sum(${documentVersions.size})`,
          oldestCreatedAt: sql`min(${documentVersions.createdAt})`,
          newestCreatedAt: sql`max(${documentVersions.createdAt})`,
        })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      return {
        totalVersions: Number(stats?.totalVersions || 0),
        latestVersion: Number(stats?.latestVersion || 0),
        totalSize: Number(stats?.totalSize || 0),
        oldestCreatedAt: stats?.oldestCreatedAt as Date | null,
        newestCreatedAt: stats?.newestCreatedAt as Date | null,
      };
    } catch (error) {
      throw new Error(`Failed to get version statistics: ${error}`);
    }
  }
}
