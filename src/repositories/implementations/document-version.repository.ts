/**
 * Document version repository implementation using Drizzle ORM
 * Implements document version data access operations
 */

import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../../services';
import { documentVersions } from '../../db/models/schema';
import { DocumentVersion, PaginationParams, PaginatedResponse } from '../../types';
import { 
  IDocumentVersionRepository, 
  CreateDocumentVersionDTO,
  DocumentVersionFiltersDTO 
} from '../interfaces/document-version.repository';

export class DocumentVersionRepository implements IDocumentVersionRepository {
  /**
   * Get database instance with null check
   */
  private getDb() {
    return databaseService.getDatabase();
  }

  /**
   * Transform database result to DocumentVersion type
   */
  private transformVersion(version: any): DocumentVersion {
    return {
      ...version,
      checksum: version.checksum ?? undefined,
      tags: version.tags ?? undefined,
      metadata: version.metadata ?? undefined,
    };
  }

  /**
   * Find document version by ID
   */
  async findById(id: string): Promise<DocumentVersion | null> {
    try {
      const [version] = await this.getDb()
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, id));

      if (!version) return null;

      return this.transformVersion(version);
    } catch (error) {
      throw new Error(`Failed to find document version by ID: ${error}`);
    }
  }

  /**
   * Find multiple document versions with optional filtering
   */
  async findMany(filters?: DocumentVersionFiltersDTO): Promise<DocumentVersion[]> {
    try {
      const query = this.getDb().select().from(documentVersions);
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

      return result.map(version => this.transformVersion(version));
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

      const query = this.getDb().select().from(documentVersions);
      const countQuery = this.getDb().select({ count: sql`count(*)` }).from(documentVersions);
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
        data: data.map(version => this.transformVersion(version)),
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

      const [version] = await this.getDb()
        .insert(documentVersions)
        .values({
          id: versionId,
          documentId: data.documentId,
          version: data.version,
          filename: data.filename,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.s3Key,
          storageProvider: 'local',
          checksum: data.checksum,
          tags: data.tags || [],
          metadata: data.metadata || {},
          uploadedBy: data.uploadedBy,
          createdAt: now,
        })
        .returning();

      return this.transformVersion(version);
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
        storageKey: version.s3Key,
        storageProvider: 'local',
        checksum: version.checksum,
        tags: version.tags || [],
        metadata: version.metadata || {},
        uploadedBy: version.uploadedBy,
        createdAt: now,
      }));

      const result = await this.getDb()
        .insert(documentVersions)
        .values(versionsToInsert)
        .returning();

      return result.map(version => this.transformVersion(version));
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
      const result = await this.getDb()
        .delete(documentVersions)
        .where(eq(documentVersions.id, id));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete document version: ${error}`);
    }
  }

  /**
   * Check if document version exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [version] = await this.getDb()
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
      const query = this.getDb().select({ count: sql`count(*)` }).from(documentVersions);
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
      const [version] = await this.getDb()
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version))
        .limit(1);

      return version ? this.transformVersion(version) : null;
    } catch (error) {
      throw new Error(`Failed to find latest document version: ${error}`);
    }
  }

  /**
   * Get version history for a document
   */
  async getVersionHistory(documentId: string, limit?: number): Promise<DocumentVersion[]> {
    try {
      const query = this.getDb()
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version));

      const result = limit ? await query.limit(limit) : await query;
      return result.map(version => this.transformVersion(version));
    } catch (error) {
      throw new Error(`Failed to get version history: ${error}`);
    }
  }

  /**
   * Get next version number for a document
   */
  async getNextVersionNumber(documentId: string): Promise<number> {
    try {
      const [result] = await this.getDb()
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
      const result = await this.getDb()
        .delete(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete versions by document ID: ${error}`);
    }
  }

  /**
   * Get version count for a document
   */
  async getVersionCount(documentId: string): Promise<number> {
    try {
      return await this.count({ documentId });
    } catch (error) {
      throw new Error(`Failed to get version count: ${error}`);
    }
  }

  /**
   * Find versions by checksum
   */
  async findByChecksum(checksum: string): Promise<DocumentVersion[]> {
    try {
      const result = await this.getDb()
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.checksum, checksum));

      return result.map(version => this.transformVersion(version));
    } catch (error) {
      throw new Error(`Failed to find versions by checksum: ${error}`);
    }
  }

  /**
   * Get total storage size for document versions
   */
  async getTotalStorageSize(documentId?: string): Promise<number> {
    try {
      const query = this.getDb()
        .select({ totalSize: sql`sum(${documentVersions.size})` })
        .from(documentVersions);

      const [result] = documentId 
        ? await query.where(eq(documentVersions.documentId, documentId))
        : await query;

      return Number(result?.totalSize || 0);
    } catch (error) {
      throw new Error(`Failed to get total storage size: ${error}`);
    }
  }

  /**
   * Find versions by tags
   */
  async findByTags(tags: string[], matchAll?: boolean): Promise<DocumentVersion[]> {
    try {
      const condition = matchAll
        ? sql`${documentVersions.tags} @> ${JSON.stringify(tags)}`
        : sql`${documentVersions.tags} && ${JSON.stringify(tags)}`;

      const result = await this.getDb()
        .select()
        .from(documentVersions)
        .where(condition);

      return result.map(version => this.transformVersion(version));
    } catch (error) {
      throw new Error(`Failed to find versions by tags: ${error}`);
    }
  }

  /**
   * Get version statistics
   */
  async getVersionStats(): Promise<{
    totalVersions: number;
    totalSize: number;
    averageVersionsPerDocument: number;
    versionsByUploader: Record<string, number>;
  }> {
    try {
      const [totalStats] = await this.getDb()
        .select({
          totalVersions: sql`count(*)`,
          totalSize: sql`sum(${documentVersions.size})`,
        })
        .from(documentVersions);

      const uploaderStats = await this.getDb()
        .select({
          uploadedBy: documentVersions.uploadedBy,
          count: sql`count(*)`
        })
        .from(documentVersions)
        .groupBy(documentVersions.uploadedBy);

      const versionsByUploader = uploaderStats.reduce((acc, stat) => {
        acc[stat.uploadedBy] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const totalDocuments = await this.getDb()
        .selectDistinct({ documentId: documentVersions.documentId })
        .from(documentVersions);

      const averageVersionsPerDocument = totalDocuments.length > 0 
        ? Number(totalStats?.totalVersions || 0) / totalDocuments.length 
        : 0;

      return {
        totalVersions: Number(totalStats?.totalVersions || 0),
        totalSize: Number(totalStats?.totalSize || 0),
        averageVersionsPerDocument,
        versionsByUploader,
      };
    } catch (error) {
      throw new Error(`Failed to get version statistics: ${error}`);
    }
  }

  /**
   * Delete old versions (cleanup operation)
   */
  async deleteOldVersions(keepVersions: number): Promise<number> {
    try {
      // Get all documents with their version counts
      const documentStats = await this.getDb()
        .select({
          documentId: documentVersions.documentId,
          version: documentVersions.version,
          id: documentVersions.id,
        })
        .from(documentVersions)
        .orderBy(documentVersions.documentId, desc(documentVersions.version));

      // Group by document and identify versions to delete
      const versionsToDelete: string[] = [];
      const documentVersionMap = new Map<string, number[]>();

      for (const stat of documentStats) {
        if (!documentVersionMap.has(stat.documentId)) {
          documentVersionMap.set(stat.documentId, []);
        }
        documentVersionMap.get(stat.documentId)!.push(stat.version);
      }

      // Find versions beyond the keep limit
      for (const [documentId, versions] of documentVersionMap) {
        if (versions.length > keepVersions) {
          const versionsToKeep = versions.slice(0, keepVersions);
          const versionsToDeleteForDoc = versions.slice(keepVersions);
          
          // Get IDs of versions to delete
          const deleteIds = documentStats
            .filter(s => s.documentId === documentId && versionsToDeleteForDoc.includes(s.version))
            .map(s => s.id);
          
          versionsToDelete.push(...deleteIds);
        }
      }

      if (versionsToDelete.length === 0) {
        return 0;
      }

      const result = await this.getDb()
        .delete(documentVersions)
        .where(sql`${documentVersions.id} = ANY(${versionsToDelete})`);

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete old versions: ${error}`);
    }
  }

  /**
   * Delete versions for a document
   */
  async deleteVersionsForDocument(documentId: string): Promise<number> {
    try {
      const result = await this.getDb()
        .delete(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete versions for document: ${error}`);
    }
  }

  /**
   * Update multiple versions (not allowed for immutable versions)
   */
  async updateMany(): Promise<number> {
    throw new Error('Document versions are immutable and cannot be updated');
  }

  /**
   * Delete multiple versions by filters
   */
  async deleteMany(filters: DocumentVersionFiltersDTO): Promise<number> {
    try {
      const conditions: any[] = [];

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

      const result = await this.getDb()
        .delete(documentVersions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete multiple versions: ${error}`);
    }
  }
}
