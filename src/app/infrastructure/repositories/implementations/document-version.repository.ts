/**
 * Document version repository implementation using Drizzle ORM
 * Implements document version data access operations
 */

import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Effect } from 'effect';
// Removed databaseService import to avoid circular dependency
import { documentVersions } from '../../database/models/schema';
import { DocumentVersion, PaginationParams, PaginatedResponse } from '../../../app/application/interfaces';
import { Repository } from '../../../app/application/interfaces/base.interface';
import { DocumentVersionEntity } from '../../../domain/document-version/entity';

// waht are the parameters: DocumentVersion, any, any, any
// DocumentVersion is the type of the document version
// any is the type of the filters
// any is the type of the data
// any is the type of the id
/*
why we need 4 parameters?
because we are using the Repository interface, and the Repository interface 
has 4 parameters:
- T: the type of the entity
- F: the type of the filters
- D: the type of the data
- ID: the type of the id

we are using the Repository interface to implement the DocumentVersionRepository
so we need to pass the 4 parameters to the Repository interface.
*/
export class DocumentVersionRepository implements Repository<DocumentVersion, any, any, any> {
  private db: any;

  constructor(database?: any) {
    this.db = database;
  }

  /**
   * Get database instance with null check
   */
  private getDb() {
    if (!this.db) {
      throw new Error('Database instance not provided to DocumentVersionRepository');
    }
    return this.db;
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

  // Public serialization methods (for testing and external use)
  
  /**
   * Convert DocumentVersionEntity to database format
   * @param {DocumentVersionEntity} version - Document version domain entity
   * @returns {any} Database row
   */
  public serializeToDatabase(version: DocumentVersionEntity): any {
    return {
      id: version.id,
      documentId: version.documentId.getValue(),
      version: version.version,
      filename: version.filename,
      mimeType: version.mimeType,
      size: version.size,
      storageKey: version.storageKey,
      storageProvider: version.storageProvider,
      checksum: version.checksum?.getValue() || null,
      tags: version.tags,
      metadata: version.metadata,
      uploadedBy: version.uploadedBy,
      createdAt: version.createdAt.getValue(),
    };
  }

  /**
   * Convert database row to DocumentVersionEntity
   * @param {any} row - Database row
   * @returns {DocumentVersionEntity} Document version domain entity
   */
  public deserializeFromDatabase(row: any): DocumentVersionEntity {
    // Validate required fields
    if (!row.id) throw new Error('Missing required field: id');
    if (!row.documentId) throw new Error('Missing required field: documentId');
    if (!row.version) throw new Error('Missing required field: version');
    if (!row.filename) throw new Error('Missing required field: filename');
    if (!row.mimeType) throw new Error('Missing required field: mimeType');
    if (!row.size) throw new Error('Missing required field: size');
    if (!row.storageKey) throw new Error('Missing required field: storageKey');
    if (!row.storageProvider) throw new Error('Missing required field: storageProvider');
    if (!row.uploadedBy) throw new Error('Missing required field: uploadedBy');
    if (!row.createdAt) throw new Error('Missing required field: createdAt');

    // Validate storage provider
    if (!['local', 's3', 'gcs'].includes(row.storageProvider)) {
      throw new Error(`Invalid storage provider: ${row.storageProvider}`);
    }

    // Handle optional fields
    const checksum = row.checksum || undefined;
    const tags = Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []);
    const metadata = row.metadata || {};

    // Create DocumentVersionEntity from persistence data
    return DocumentVersionEntity.fromPersistence({
      id: row.id,
      documentId: row.documentId,
      version: row.version,
      filename: row.filename,
      mimeType: row.mimeType,
      size: row.size,
      storageKey: row.storageKey,
      storageProvider: row.storageProvider as 'local' | 's3' | 'gcs',
      checksum,
      tags,
      metadata,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
    });
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

      return result.map((version: any) => this.transformVersion(version));
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
        data: data.map((version: any) => this.transformVersion(version)),
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

        // serializes the data into the database, taking the input DTO 
        
        .values({
          id: versionId,
          documentId: data.documentId,
          version: data.version,
          filename: data.filename,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
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

      // mapping DTO into DB row (serializing the data)

      const versionsToInsert = data.map(version => ({
        id: uuidv4(),
        documentId: version.documentId,
        version: version.version,
        filename: version.filename,
        mimeType: version.mimeType,
        size: version.size,
          storageKey: version.storageKey,
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

      return result.map((version: any) => this.transformVersion(version));
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
      return result.map((version: any) => this.transformVersion(version));
    } catch (error) {
      throw new Error(`Failed to get version history: ${error}`);
    }
  }

  /**
   * Get next version number for a document
   * So if a document currently has versions:
   * v1, v2, v3
   * then this function returns 4.
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

      return result.map((version: any) => this.transformVersion(version));
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

        // if documentId is provided, then we only get the total storage size for the document
        // if documentId is not provided, then we get the total storage size for all documents
      const [result] = documentId 
        ? await query.where(eq(documentVersions.documentId, documentId))
        : await query;

        // if result is not found, then we return 0
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

      return result.map((version: any) => this.transformVersion(version));
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

      const versionsByUploader = uploaderStats.reduce((acc: any, stat: any) => {
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
          // if the documentId is not in the map, then we add it to the map
          documentVersionMap.set(stat.documentId, []);
        }
        // if the documentId is in the map, then we add the version to the array
        documentVersionMap.get(stat.documentId)!.push(stat.version);
      }

      // Find versions beyond the keep limit
      for (const [documentId, versions] of documentVersionMap) {
        if (versions.length > keepVersions) {
          // if the number of versions is greater than the keep limit, then we keep the first keepVersions versions
          // and delete the rest
          const versionsToKeep = versions.slice(0, keepVersions);
          const versionsToDeleteForDoc = versions.slice(keepVersions);
          
          // Get IDs of versions to delete
          const deleteIds = documentStats
            .filter((s: any) => s.documentId === documentId && versionsToDeleteForDoc.includes(s.version))
            .map((s: any) => s.id);
          
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
        // if the conditions are not empty, then we use those condition
        // if the conditions are empty, then we use the undefined condition
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete multiple versions: ${error}`);
    }
  }
}
