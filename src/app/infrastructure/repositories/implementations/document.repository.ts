/**
 * Document repository implementation using Drizzle ORM
 * Implements document data access operations
 */

import { eq, and, or, like, gte, lte, inArray, sql, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Effect } from 'effect';
import { documents } from '../../database/models/schema';
import { Document, DocumentSearchFilters, PaginationParams, PaginatedResponse } from '../../../app/application/interfaces';
import { DocumentRepository, CreateDocumentDTO, UpdateDocumentDTO } from '../../../app/application/interfaces/document.interface';
import { DocumentEntity } from '../../../domain/document/entity';

export class DocumentRepositoryImpl implements DocumentRepository {
  private db: any;

  constructor(database?: any) {
    this.db = database;
  }

  /**
   * Get database instance with null check
   */
  private getDb() {
    if (!this.db) {
      throw new Error('Database instance not provided to DocumentRepository');
    }
    return this.db;
  }

  /**
   * Transform database result to Document type
   */
  private transformDocument(document: any): Document {
    return {
      ...document,
      checksum: document.checksum ?? undefined,
      tags: document.tags ?? undefined,
      metadata: document.metadata ?? undefined,
    };
  }

  // Public serialization methods (for testing and external use)
  
  /**
   * Convert DocumentEntity to database format
   * @param {DocumentEntity} document - Document domain entity
   * @returns {any} Database row
   */
  public serializeToDatabase(document: DocumentEntity): any {
    return {
      id: document.id.getValue(),
      filename: document.filename,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      storageKey: document.storageKey,
      storageProvider: document.storageProvider,
      checksum: document.checksum?.getValue() || null,
      tags: document.tags,
      metadata: document.metadata,
      uploadedBy: document.uploadedBy,
      currentVersion: document.currentVersion,
      isActive: !document.isDeleted,
      createdAt: document.createdAt.getValue(),
      updatedAt: document.updatedAt.getValue(),
      isDeleted: document.isDeleted,
    };
  }

  /**
   * Convert database row to DocumentEntity
   * @param {any} row - Database row
   * @returns {DocumentEntity} Document domain entity
   */
  public deserializeFromDatabase(row: any): DocumentEntity {
    // Validate required fields
    if (!row.id) throw new Error('Missing required field: id');
    if (!row.filename) throw new Error('Missing required field: filename');
    if (!row.originalName) throw new Error('Missing required field: originalName');
    if (!row.mimeType) throw new Error('Missing required field: mimeType');
    if (!row.size) throw new Error('Missing required field: size');
    if (!row.storageKey) throw new Error('Missing required field: storageKey');
    if (!row.storageProvider) throw new Error('Missing required field: storageProvider');
    if (!row.uploadedBy) throw new Error('Missing required field: uploadedBy');
    if (!row.currentVersion) throw new Error('Missing required field: currentVersion');
    if (!row.createdAt) throw new Error('Missing required field: createdAt');
    if (!row.updatedAt) throw new Error('Missing required field: updatedAt');

    // Validate storage provider
    if (!['local', 's3', 'gcs'].includes(row.storageProvider)) {
      throw new Error(`Invalid storage provider: ${row.storageProvider}`);
    }

    // Handle optional fields
    const checksum = row.checksum || undefined;
    const tags = Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []);
    const metadata = row.metadata || {};
    const isDeleted = row.isDeleted || false;

    // Create DocumentEntity from persistence data
    return DocumentEntity.fromPersistence({
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      storageKey: row.storageKey,
      storageProvider: row.storageProvider as 'local' | 's3' | 'gcs',
      checksum,
      tags,
      metadata,
      uploadedBy: row.uploadedBy,
      currentVersion: row.currentVersion,
      isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<Document | null> {
    try {
      const [document] = await this.getDb()
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)));

      return document ? this.transformDocument(document) : null;
    } catch (error) {
      throw new Error(`Failed to find document by ID: ${error}`);
    }
  }

  /**
   * Find multiple documents with optional filtering
   */
  async findMany(filters?: DocumentSearchFilters): Promise<Document[]> {
    try {
      const query = this.getDb().select().from(documents);
      const conditions = [eq(documents.isActive, true)];

      if (filters) {
        if (filters.uploadedBy) {
          conditions.push(eq(documents.uploadedBy, filters.uploadedBy));
        }
        if (filters.mimeType) {
          conditions.push(eq(documents.mimeType, filters.mimeType));
        }
        if (filters.tags && filters.tags.length > 0) {
          conditions.push(sql`${documents.tags} @> ${JSON.stringify(filters.tags)}`);
        }
        if (filters.filename) {
          conditions.push(like(documents.filename, `%${filters.filename}%`));
        }
        if (filters.minSize) {
          conditions.push(gte(documents.size, filters.minSize));
        }
        if (filters.maxSize) {
          conditions.push(lte(documents.size, filters.maxSize));
        }
        if (filters.dateFrom) {
          conditions.push(gte(documents.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(documents.createdAt, filters.dateTo));
        }
        if (filters.documentIds && filters.documentIds.length > 0) {
          conditions.push(inArray(documents.id, filters.documentIds));
        }
      }

      const result = await query.where(and(...conditions));
      return result.map((document: any) => this.transformDocument(document));
    } catch (error) {
      throw new Error(`Failed to find documents: ${error}`);
    }
  }

  /**
   * Find documents with pagination
   */
  async findManyPaginated(
    pagination: PaginationParams,
    filters?: DocumentSearchFilters
  ): Promise<PaginatedResponse<Document>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const query = this.getDb().select().from(documents);

      // it is a query to count the number of documents
      const countQuery = this.getDb().select({ count: sql`count(*)` }).from(documents);

      const conditions = [eq(documents.isActive, true)];

      if (filters) {
        if (filters.uploadedBy) {
          conditions.push(eq(documents.uploadedBy, filters.uploadedBy));
        }
        if (filters.mimeType) {
          conditions.push(eq(documents.mimeType, filters.mimeType));
        }
        if (filters.tags && filters.tags.length > 0) {
          conditions.push(sql`${documents.tags} @> ${JSON.stringify(filters.tags)}`);
        }
        if (filters.filename) {
          conditions.push(like(documents.filename, `%${filters.filename}%`));
        }
        if (filters.minSize) {
          conditions.push(gte(documents.size, filters.minSize));
        }
        if (filters.maxSize) {
          conditions.push(lte(documents.size, filters.maxSize));
        }
        if (filters.dateFrom) {
          conditions.push(gte(documents.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(documents.createdAt, filters.dateTo));
        }
        if (filters.documentIds && filters.documentIds.length > 0) {
          conditions.push(inArray(documents.id, filters.documentIds));
        }
      }

      // Add sorting
      const sortBy = filters?.sortBy || 'createdAt';
      const sortOrder = filters?.sortOrder || 'desc';
      
      let orderBy;
      if (sortBy === 'createdAt') {
        orderBy = sortOrder === 'desc' ? desc(documents.createdAt) : asc(documents.createdAt);
      } else if (sortBy === 'updatedAt') {
        orderBy = sortOrder === 'desc' ? desc(documents.updatedAt) : asc(documents.updatedAt);
      } else if (sortBy === 'filename') {
        orderBy = sortOrder === 'desc' ? desc(documents.filename) : asc(documents.filename);
      } else if (sortBy === 'size') {
        orderBy = sortOrder === 'desc' ? desc(documents.size) : asc(documents.size);
      } else {
        orderBy = desc(documents.createdAt);
      }

      const [data, countResult] = await Promise.all([
        query.where(and(...conditions)).orderBy(orderBy).limit(limit).offset(offset),
        countQuery.where(and(...conditions))
      ]);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((document: any) => this.transformDocument(document)),
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
      throw new Error(`Failed to find paginated documents: ${error}`);
    }
  }

  /**
   * Find single document by filters
   */
  async findOne(filters: DocumentSearchFilters): Promise<Document | null> {
    try {
      const result = await this.findMany(filters);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to find document: ${error}`);
    }
  }

  /**
   * Create new document
   */
  async create(data: CreateDocumentDTO): Promise<Document> {
    try {
      const documentId = uuidv4();
      const now = new Date();

      const [document] = await this.getDb()
        .insert(documents)

        // serializes the data into the database, taking the input DTO 
        
        .values({
          id: documentId,
          filename: data.filename,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
          storageProvider: 'local',
          checksum: data.checksum,
          tags: data.tags || [],
          metadata: data.metadata || {},
          uploadedBy: data.uploadedBy,
          currentVersion: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

        // transform the document to the Document type 
        // so we can return the document in the correct format
      return this.transformDocument(document);
    } catch (error) {
      throw new Error(`Failed to create document: ${error}`);
    }
  }

  /**
   * Create multiple documents
   */
  async createMany(data: CreateDocumentDTO[]): Promise<Document[]> {
    try {
      const now = new Date();

      // mapping DTO into DB row (serializing the data)

      const documentsToInsert = data.map(doc => ({
        id: uuidv4(),
        filename: doc.filename,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        storageKey: doc.storageKey,
        storageProvider: 'local',
        checksum: doc.checksum,
        tags: doc.tags || [],
        metadata: doc.metadata || {},
        uploadedBy: doc.uploadedBy,
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
      }));

      const result = await this.getDb()
        .insert(documents)
        .values(documentsToInsert)
        .returning();

      return result.map((document: any) => this.transformDocument(document));
    } catch (error) {
      throw new Error(`Failed to create multiple documents: ${error}`);
    }
  }

  /**
   * Update document by ID
   */
  async update(id: string, data: UpdateDocumentDTO): Promise<Document | null> {
    try {
      const [document] = await this.getDb()
        .update(documents)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .returning();

      return document ? this.transformDocument(document) : null;
    } catch (error) {
      throw new Error(`Failed to update document: ${error}`);
    }
  }

  /**
   * Delete document by ID (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.getDb()
        .delete(documents)
        .where(eq(documents.id, id));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [document] = await this.getDb()
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1);

      return !!document;
    } catch (error) {
      throw new Error(`Failed to check document existence: ${error}`);
    }
  }

  /**
   * Count documents with optional filters
   */
  async count(filters?: DocumentSearchFilters): Promise<number> {
    try {
      const query = this.getDb().select({ count: sql`count(*)` }).from(documents);
      const conditions = [eq(documents.isActive, true)];

      if (filters) {
        if (filters.uploadedBy) {
          conditions.push(eq(documents.uploadedBy, filters.uploadedBy));
        }
        if (filters.mimeType) {
          conditions.push(eq(documents.mimeType, filters.mimeType));
        }
      }

      const [result] = await query.where(and(...conditions));
      return Number(result.count);
    } catch (error) {
      throw new Error(`Failed to count documents: ${error}`);
    }
  }

  /**
   * Find documents by uploader
   */
  async findByUploader(userId: string): Promise<Document[]> {
    try {
      return await this.findMany({ uploadedBy: userId });
    } catch (error) {
      throw new Error(`Failed to find documents by uploader: ${error}`);
    }
  }

  /**
   * Find documents by tags
   */
  async findByTags(tags: string[], matchAll?: boolean): Promise<Document[]> {
    try {
      const condition = matchAll
        ? sql`${documents.tags} @> ${JSON.stringify(tags)}`
        : sql`${documents.tags} && ${JSON.stringify(tags)}`;

      const result = await this.getDb()
        .select()
        .from(documents)
        .where(and(eq(documents.isActive, true), condition));

      return result.map((document: any) => this.transformDocument(document));
    } catch (error) {
      throw new Error(`Failed to find documents by tags: ${error}`);
    }
  }

  /**
   * Find documents by metadata
   */
  async findByMetadata(metadata: Record<string, any>): Promise<Document[]> {
    try {
      const result = await this.getDb()
        .select()
        .from(documents)
        .where(and(
          eq(documents.isActive, true),
          sql`${documents.metadata} @> ${JSON.stringify(metadata)}`
        ));

      return result.map((document: any) => this.transformDocument(document));
    } catch (error) {
      throw new Error(`Failed to find documents by metadata: ${error}`);
    }
  }

  /**
   * Find documents by MIME type
   */
  async findByMimeType(mimeType: string): Promise<Document[]> {
    try {
      return await this.findMany({ mimeType });
    } catch (error) {
      throw new Error(`Failed to find documents by MIME type: ${error}`);
    }
  }

  /**
   * Search documents with filters
   */
  async searchDocuments(filters: DocumentSearchFilters): Promise<Document[]> {
    try {
      return await this.findMany(filters);
    } catch (error) {
      throw new Error(`Failed to search documents: ${error}`);
    }
  }

  /**
   * Find documents by filename pattern
   */
  async findByFilenamePattern(pattern: string): Promise<Document[]> {
    try {
      return await this.findMany({ filename: pattern });
    } catch (error) {
      throw new Error(`Failed to find documents by filename pattern: ${error}`);
    }
  }

  /**
   * Find documents within size range
   */
  async findBySizeRange(minSize: number, maxSize: number): Promise<Document[]> {
    try {
      return await this.findMany({ minSize, maxSize });
    } catch (error) {
      throw new Error(`Failed to find documents by size range: ${error}`);
    }
  }

  /**
   * Find documents within date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Document[]> {
    try {
      return await this.findMany({ dateFrom: startDate, dateTo: endDate });
    } catch (error) {
      throw new Error(`Failed to find documents by date range: ${error}`);
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    documentsByMimeType: Record<string, number>;
    documentsByUploader: Record<string, number>;
  }> {
    try {
      const [totalCount] = await this.getDb()
        .select({ count: sql`count(*)`, totalSize: sql`sum(${documents.size})` })
        .from(documents)
        .where(eq(documents.isActive, true));

      const mimeTypeStats = await this.getDb()
        .select({
          mimeType: documents.mimeType,
          count: sql`count(*)`
        })
        .from(documents)
        .where(eq(documents.isActive, true))
        .groupBy(documents.mimeType);

      const uploaderStats = await this.getDb()
        .select({
          uploadedBy: documents.uploadedBy,
          count: sql`count(*)`
        })
        .from(documents)
        .where(eq(documents.isActive, true))
        .groupBy(documents.uploadedBy);

      const documentsByMimeType = mimeTypeStats.reduce((acc: any, stat: any) => {
        acc[stat.mimeType] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const documentsByUploader = uploaderStats.reduce((acc: any, stat: any) => {
        acc[stat.uploadedBy] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalDocuments: Number(totalCount.count),
        totalSize: Number(totalCount.totalSize) || 0,
        documentsByMimeType,
        documentsByUploader,
      };
    } catch (error) {
      throw new Error(`Failed to get document statistics: ${error}`);
    }
  }

  /**
   * Find duplicate documents by checksum
   * excludeDocumentId make sures that the document is not checked against itself 
   */
  async findDuplicatesByChecksum(checksum: string, excludeDocumentId?: string): Promise<Document[]> {
    try {
      const conditions = [eq(documents.isActive, true), eq(documents.checksum, checksum)];
      
      if (excludeDocumentId) {
        conditions.push(sql`${documents.id} != ${excludeDocumentId}`);
      }

      const result = await this.getDb()
        .select()
        .from(documents)
        .where(and(...conditions));

      return result.map((document: any) => this.transformDocument(document));
    } catch (error) {
      throw new Error(`Failed to find duplicate documents: ${error}`);
    }
  }

  /**
   * Update document tags
   */
  async updateTags(documentId: string, tags: string[]): Promise<boolean> {
    try {
      const result = await this.getDb()
        .update(documents)
        .set({ tags, updatedAt: new Date() })
        .where(and(eq(documents.id, documentId), eq(documents.isActive, true)));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to update document tags: ${error}`);
    }
  }

  /**
   * Update document metadata
   */
  async updateMetadata(documentId: string, metadata: Record<string, any>): Promise<boolean> {
    try {
      const result = await this.getDb()
        .update(documents)
        .set({ metadata, updatedAt: new Date() })
        .where(and(eq(documents.id, documentId), eq(documents.isActive, true)));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to update document metadata: ${error}`);
    }
  }

  /**
   * Increment document version
   */
  async incrementVersion(documentId: string): Promise<number> {
    try {
      const [document] = await this.getDb()
        .update(documents)
        .set({ 
          currentVersion: sql`${documents.currentVersion} + 1`,
          updatedAt: new Date()
        })
        .where(and(eq(documents.id, documentId), eq(documents.isActive, true)))
        .returning({ currentVersion: documents.currentVersion });

      return document?.currentVersion || 1;
    } catch (error) {
      throw new Error(`Failed to increment document version: ${error}`);
    }
  }

  /**
   * Soft delete document
   */
  async softDelete(documentId: string): Promise<boolean> {
    try {
      const result = await this.getDb()
        .update(documents)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to soft delete document: ${error}`);
    }
  }

  /**
   * Restore soft deleted document
   */
  async restore(documentId: string): Promise<boolean> {
    try {
      const result = await this.getDb()
        .update(documents)
        .set({ isDeleted: false, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to restore document: ${error}`);
    }
  }

  /**
   * Find deleted documents
   */
  async findDeleted(userId?: string): Promise<Document[]> {
    try {
      const conditions = [eq(documents.isActive, false)];
      
      if (userId) {
        conditions.push(eq(documents.uploadedBy, userId));
      }

      const result = await this.getDb()
        .select()
        .from(documents)
        .where(and(...conditions));

      return result.map((document: any) => this.transformDocument(document));
    } catch (error) {
      throw new Error(`Failed to find deleted documents: ${error}`);
    }
  }

  /**
   * Update multiple documents by filters
   */
  async updateMany(filters: DocumentSearchFilters, data: UpdateDocumentDTO): Promise<number> {
    try {
      const conditions = [eq(documents.isActive, true)];

      if (filters.uploadedBy) {
        conditions.push(eq(documents.uploadedBy, filters.uploadedBy));
      }
      if (filters.mimeType) {
        conditions.push(eq(documents.mimeType, filters.mimeType));
      }
      if (filters.tags && filters.tags.length > 0) {
        conditions.push(sql`${documents.tags} @> ${JSON.stringify(filters.tags)}`);
      }
      if (filters.filename) {
        conditions.push(like(documents.filename, `%${filters.filename}%`));
      }

      const result = await this.getDb()
        .update(documents)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(...conditions));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to update multiple documents: ${error}`);
    }
  }

  /**
   * Delete multiple documents by filters
   */
  async deleteMany(filters: DocumentSearchFilters): Promise<number> {
    try {
      const conditions = [eq(documents.isActive, true)];

      if (filters.uploadedBy) {
        conditions.push(eq(documents.uploadedBy, filters.uploadedBy));
      }
      if (filters.mimeType) {
        conditions.push(eq(documents.mimeType, filters.mimeType));
      }
      if (filters.tags && filters.tags.length > 0) {
        conditions.push(sql`${documents.tags} @> ${JSON.stringify(filters.tags)}`);
      }
      if (filters.filename) {
        conditions.push(like(documents.filename, `%${filters.filename}%`));
      }

      const result = await this.getDb()
        .delete(documents)
        .where(and(...conditions));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete multiple documents: ${error}`);
    }
  }
}
