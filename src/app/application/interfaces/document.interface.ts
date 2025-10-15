/**
 * Effect-based Document Repository Interface
 * Defines document-specific data access operations using Effect
 * Following d4-effect.md requirements for effectful signatures and typed errors
 * 
 * Uses Effect Schema concepts with pick/omit to eliminate repetition
 */

import { Effect } from 'effect';
import { Schema } from '@effect/schema';
import { Repository, DatabaseError, NotFoundError, ValidationError } from "../shared/errors";
import { PaginationParams, PaginatedResponse } from '../../domain/shared/api.interface';
import { DocumentEntity, DocumentSchema } from '../../domain/document/entity';

/**
 * Base document fields schema - core document properties
 */
const BaseDocumentFieldsSchema = Schema.Struct({
  filename: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ),
  originalName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ),
  mimeType: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  size: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ),
  storageKey: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(500)
  ),
  storageProvider: Schema.Literal('local', 's3', 'gcs'),
  uploadedBy: Schema.String.pipe(Schema.brand('UserId')),
});

/**
 * Optional document fields schema - fields that can be optional
 */
const OptionalDocumentFieldsSchema = Schema.Struct({
  checksum: Schema.optional(Schema.String.pipe(Schema.brand('Checksum'))),
  tags: Schema.optional(Schema.Array(Schema.String)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  currentVersion: Schema.optional(Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  )),
});

/**
 * Document creation data transfer object schema
 * Combines base fields with optional fields for creation
 */
export const CreateDocumentDTOSchema = Schema.Struct({
  ...BaseDocumentFieldsSchema.fields,
  ...OptionalDocumentFieldsSchema.fields,
});

/**
 * Document update data transfer object schema
 * All fields are optional for updates, plus additional update-specific fields
 */
export const UpdateDocumentDTOSchema = Schema.Struct({
  filename: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  )),
  originalName: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  )),
  mimeType: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  )),
  size: Schema.optional(Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  )),
  storageKey: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(500)
  )),
  storageProvider: Schema.optional(Schema.Literal('local', 's3', 'gcs')),
  uploadedBy: Schema.optional(Schema.String.pipe(Schema.brand('UserId'))),
  checksum: Schema.optional(Schema.String.pipe(Schema.brand('Checksum'))),
  tags: Schema.optional(Schema.Array(Schema.String)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  currentVersion: Schema.optional(Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  )),
  isActive: Schema.optional(Schema.Boolean),
});

/**
 * Document filter data transfer object schema
 * Fields for filtering and searching documents
 * Uses field schemas where appropriate
 */
export const DocumentFilterDTOSchema = Schema.Struct({
  uploadedBy: Schema.optional(Schema.String.pipe(Schema.brand('UserId'))),
  mimeType: Schema.optional(Schema.String),
  storageProvider: Schema.optional(Schema.Literal('local', 's3', 'gcs')),
  tags: Schema.optional(Schema.Array(Schema.String)),
  isActive: Schema.optional(Schema.Boolean),
  search: Schema.optional(Schema.String), // Search in filename, originalName
  minSize: Schema.optional(Schema.Number.pipe(Schema.positive())),
  maxSize: Schema.optional(Schema.Number.pipe(Schema.positive())),
  createdAfter: Schema.optional(Schema.Date),
  createdBefore: Schema.optional(Schema.Date),
});

/**
 * Document creation data transfer object type
 */
export type CreateDocumentDTO = Schema.Schema.Type<typeof CreateDocumentDTOSchema>;

/**
 * Document update data transfer object type
 */
export type UpdateDocumentDTO = Schema.Schema.Type<typeof UpdateDocumentDTOSchema>;

/**
 * Document filter data transfer object type
 */
export type DocumentFilterDTO = Schema.Schema.Type<typeof DocumentFilterDTOSchema>;

/**
 * Document statistics schema
 */
export const DocumentStatisticsSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.nonNegative()),
  byMimeType: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  byProvider: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  totalSize: Schema.Number.pipe(Schema.nonNegative()),
});

/**
 * Document statistics type
 */
export type DocumentStatistics = Schema.Schema.Type<typeof DocumentStatisticsSchema>;

/**
 * Document permission interface
 */
export interface DocumentPermission {
  id: string;
  documentId: string;
  userId: string;
  permission: string;
  grantedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document interface
 */
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageProvider: 'local' | 's3' | 'gcs';
  checksum?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  uploadedBy: string;
  currentVersion: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

/**
 * Document search filters interface
 */
export interface DocumentSearchFilters {
  uploadedBy?: string;
  mimeType?: string;
  tags?: string[];
  filename?: string;
  minSize?: number;
  maxSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  documentIds?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Derived schemas using pick and omit for specific use cases
 */

/**
 * Document summary schema - only essential fields for listing
 */
export const DocumentSummarySchema = Schema.Struct({
  id: DocumentSchema.fields.id,
  filename: DocumentSchema.fields.filename,
  originalName: DocumentSchema.fields.originalName,
  mimeType: DocumentSchema.fields.mimeType,
  size: DocumentSchema.fields.size,
  uploadedBy: DocumentSchema.fields.uploadedBy,
  createdAt: DocumentSchema.fields.createdAt,
  isDeleted: DocumentSchema.fields.isDeleted,
});

/**
 * Document metadata schema - only metadata fields
 */
export const DocumentMetadataSchema = Schema.Struct({
  id: DocumentSchema.fields.id,
  filename: DocumentSchema.fields.filename,
  originalName: DocumentSchema.fields.originalName,
  mimeType: DocumentSchema.fields.mimeType,
  size: DocumentSchema.fields.size,
  checksum: DocumentSchema.fields.checksum,
  tags: DocumentSchema.fields.tags,
  metadata: DocumentSchema.fields.metadata,
  currentVersion: DocumentSchema.fields.currentVersion,
});

/**
 * Document storage schema - only storage-related fields
 */
export const DocumentStorageSchema = Schema.Struct({
  id: DocumentSchema.fields.id,
  storageKey: DocumentSchema.fields.storageKey,
  storageProvider: DocumentSchema.fields.storageProvider,
  size: DocumentSchema.fields.size,
  checksum: DocumentSchema.fields.checksum,
});

/**
 * Document audit schema - only audit fields
 */
export const DocumentAuditSchema = Schema.Struct({
  id: DocumentSchema.fields.id,
  uploadedBy: DocumentSchema.fields.uploadedBy,
  createdAt: DocumentSchema.fields.createdAt,
  updatedAt: DocumentSchema.fields.updatedAt,
  isDeleted: DocumentSchema.fields.isDeleted,
});

/**
 * Document without sensitive data - omits sensitive fields
 */
export const DocumentPublicSchema = Schema.Struct({
  id: DocumentSchema.fields.id,
  filename: DocumentSchema.fields.filename,
  originalName: DocumentSchema.fields.originalName,
  mimeType: DocumentSchema.fields.mimeType,
  size: DocumentSchema.fields.size,
  storageProvider: DocumentSchema.fields.storageProvider,
  tags: DocumentSchema.fields.tags,
  metadata: DocumentSchema.fields.metadata,
  uploadedBy: DocumentSchema.fields.uploadedBy,
  currentVersion: DocumentSchema.fields.currentVersion,
  isDeleted: DocumentSchema.fields.isDeleted,
  createdAt: DocumentSchema.fields.createdAt,
  updatedAt: DocumentSchema.fields.updatedAt,
});

/**
 * Document creation input schema - omits system-generated fields
 */
export const DocumentCreationInputSchema = Schema.Struct({
  filename: DocumentSchema.fields.filename,
  originalName: DocumentSchema.fields.originalName,
  mimeType: DocumentSchema.fields.mimeType,
  size: DocumentSchema.fields.size,
  storageKey: DocumentSchema.fields.storageKey,
  storageProvider: DocumentSchema.fields.storageProvider,
  checksum: DocumentSchema.fields.checksum,
  tags: DocumentSchema.fields.tags,
  metadata: DocumentSchema.fields.metadata,
  uploadedBy: DocumentSchema.fields.uploadedBy,
  currentVersion: DocumentSchema.fields.currentVersion,
});

/**
 * Document update input schema - only updatable fields
 */
export const DocumentUpdateInputSchema = Schema.Struct({
  filename: DocumentSchema.fields.filename,
  originalName: DocumentSchema.fields.originalName,
  mimeType: DocumentSchema.fields.mimeType,
  tags: DocumentSchema.fields.tags,
  metadata: DocumentSchema.fields.metadata,
  currentVersion: DocumentSchema.fields.currentVersion,
});

/**
 * Document search result schema - optimized for search results
 */
export const DocumentSearchResultSchema = Schema.Struct({
  id: DocumentSchema.fields.id,
  filename: DocumentSchema.fields.filename,
  originalName: DocumentSchema.fields.originalName,
  mimeType: DocumentSchema.fields.mimeType,
  size: DocumentSchema.fields.size,
  uploadedBy: DocumentSchema.fields.uploadedBy,
  createdAt: DocumentSchema.fields.createdAt,
  tags: DocumentSchema.fields.tags,
});

/**
 * Type exports for the derived schemas
 */
export type DocumentSummary = Schema.Schema.Type<typeof DocumentSummarySchema>;
export type DocumentMetadata = Schema.Schema.Type<typeof DocumentMetadataSchema>;
export type DocumentStorage = Schema.Schema.Type<typeof DocumentStorageSchema>;
export type DocumentAudit = Schema.Schema.Type<typeof DocumentAuditSchema>;
export type DocumentPublic = Schema.Schema.Type<typeof DocumentPublicSchema>;
export type DocumentCreationInput = Schema.Schema.Type<typeof DocumentCreationInputSchema>;
export type DocumentUpdateInput = Schema.Schema.Type<typeof DocumentUpdateInputSchema>;
export type DocumentSearchResult = Schema.Schema.Type<typeof DocumentSearchResultSchema>;

/**
 * Effect-based Document repository interface
 * Provides Effect-based operations for document management with proper validation
 */
export interface DocumentRepository {
  /**
   * Create a new document with validation
   * @param {CreateDocumentDTO} data - Document creation data
   * @returns {Effect.Effect<DocumentEntity, ValidationError | DatabaseError>} Created document or error
   */
  create(data: CreateDocumentDTO): Effect.Effect<DocumentEntity, ValidationError | DatabaseError>;

  /**
   * Update a document with validation
   * @param {string} id - Document ID
   * @param {UpdateDocumentDTO} data - Document update data
   * @returns {Effect.Effect<DocumentEntity, ValidationError | NotFoundError | DatabaseError>} Updated document or error
   */
  update(id: string, data: UpdateDocumentDTO): Effect.Effect<DocumentEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Find a document by ID
   * @param {string} id - Document ID
   * @returns {Effect.Effect<DocumentEntity | null, DatabaseError>} Document or null if not found
   */
  findById(id: string): Effect.Effect<DocumentEntity | null, DatabaseError>;

  /**
   * Find all documents with pagination
   * @param {PaginationParams} params - Pagination parameters
   * @returns {Effect.Effect<PaginatedResponse<DocumentEntity>, DatabaseError>} Paginated documents or error
   */
  findAll(params: PaginationParams): Effect.Effect<PaginatedResponse<DocumentEntity>, DatabaseError>;

  /**
   * Delete a document by ID
   * @param {string} id - Document ID
   * @returns {Effect.Effect<boolean, DatabaseError>} Success or error
   */
  delete(id: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Find documents by uploader with validation
   * @param {string} userId - User ID who uploaded the documents
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findByUploader(userId: string): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find documents by MIME type with validation
   * @param {string} mimeType - MIME type to filter by
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findByMimeType(mimeType: string): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find documents by storage provider with validation
   * @param {'local' | 's3' | 'gcs'} provider - Storage provider to filter by
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findByStorageProvider(provider: 'local' | 's3' | 'gcs'): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find documents by checksum with validation
   * @param {string} checksum - SHA-256 checksum to search for
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents with matching checksum or error
   */
  findByChecksum(checksum: string): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find duplicate documents by checksum with validation
   * @param {string} checksum - SHA-256 checksum to search for
   * @param {string} excludeDocumentId - Document ID to exclude from results
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of duplicate documents or error
   */
  findDuplicatesByChecksum(checksum: string, excludeDocumentId?: string): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find documents by tags with validation
   * @param {string[]} tags - Array of tags to search for
   * @param {boolean} matchAll - Whether to match all tags (AND) or any tags (OR)
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findByTags(tags: string[], matchAll?: boolean): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find documents by size range with validation
   * @param {number} minSize - Minimum size in bytes
   * @param {number} maxSize - Maximum size in bytes
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findBySizeRange(minSize: number, maxSize: number): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Find documents created within date range with validation
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Search documents by filename or original name with validation
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of matching documents or error
   */
  searchDocuments(searchTerm: string, limit?: number): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;

  /**
   * Get document statistics with validation
   * @returns {Effect.Effect<DocumentStatistics, DatabaseError>} Statistics or error
   */
  getStatistics(): Effect.Effect<DocumentStatistics, DatabaseError>;

  /**
   * Soft delete document with validation
   * @param {string} documentId - Document ID to soft delete
   * @returns {Effect.Effect<boolean, ValidationError | NotFoundError | DatabaseError>} Success or error
   */
  softDelete(documentId: string): Effect.Effect<boolean, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Restore soft deleted document with validation
   * @param {string} documentId - Document ID to restore
   * @returns {Effect.Effect<DocumentEntity, ValidationError | NotFoundError | DatabaseError>} Updated document or error
   */
  restore(documentId: string): Effect.Effect<DocumentEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Update document version with validation
   * @param {string} documentId - Document ID
   * @param {number} newVersion - New version number
   * @returns {Effect.Effect<DocumentEntity, ValidationError | NotFoundError | DatabaseError>} Updated document or error
   */
  updateVersion(documentId: string, newVersion: number): Effect.Effect<DocumentEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Find documents by multiple IDs with validation
   * @param {string[]} documentIds - Array of document IDs
   * @returns {Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>} Array of documents or error
   */
  findByIds(documentIds: string[]): Effect.Effect<DocumentEntity[], ValidationError | DatabaseError>;
}

/**
 * Document repository validation utilities
 * Provides Effect-based validation functions using the schemas
 */
export const DocumentRepositoryValidation = {
  /**
   * Validate create document data
   */
  validateCreate: (data: unknown) => 
    Schema.decodeUnknown(CreateDocumentDTOSchema)(data),

  /**
   * Validate update document data
   */
  validateUpdate: (data: unknown) => 
    Schema.decodeUnknown(UpdateDocumentDTOSchema)(data),

  /**
   * Validate filter document data
   */
  validateFilter: (data: unknown) => 
    Schema.decodeUnknown(DocumentFilterDTOSchema)(data),

  /**
   * Validate document ID
   */
  validateDocumentId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('DocumentId')))(id),

  /**
   * Validate user ID
   */
  validateUserId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('UserId')))(id),

  /**
   * Validate checksum
   */
  validateChecksum: (checksum: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('Checksum')))(checksum),

  /**
   * Validate document summary data
   */
  validateSummary: (data: unknown) => 
    Schema.decodeUnknown(DocumentSummarySchema)(data),

  /**
   * Validate document metadata data
   */
  validateMetadata: (data: unknown) => 
    Schema.decodeUnknown(DocumentMetadataSchema)(data),

  /**
   * Validate document storage data
   */
  validateStorage: (data: unknown) => 
    Schema.decodeUnknown(DocumentStorageSchema)(data),

  /**
   * Validate document public data
   */
  validatePublic: (data: unknown) => 
    Schema.decodeUnknown(DocumentPublicSchema)(data),

  /**
   * Validate document search result data
   */
  validateSearchResult: (data: unknown) => 
    Schema.decodeUnknown(DocumentSearchResultSchema)(data),
};

/**
 * Document schema transformation utilities
 * Demonstrates advanced Effect Schema concepts
 */
export const DocumentSchemaUtils = {
  /**
   * Transform document to summary format
   */
  toSummary: (document: DocumentEntity) => 
    Schema.decodeUnknown(DocumentSummarySchema)(document),

  /**
   * Transform document to public format (removes sensitive data)
   */
  toPublic: (document: DocumentEntity) => 
    Schema.decodeUnknown(DocumentPublicSchema)(document),

  /**
   * Transform document to search result format
   */
  toSearchResult: (document: DocumentEntity) => 
    Schema.decodeUnknown(DocumentSearchResultSchema)(document),

  /**
   * Extract metadata from document
   */
  extractMetadata: (document: DocumentEntity) => 
    Schema.decodeUnknown(DocumentMetadataSchema)(document),

  /**
   * Extract storage information from document
   */
  extractStorage: (document: DocumentEntity) => 
    Schema.decodeUnknown(DocumentStorageSchema)(document),

  /**
   * Extract audit information from document
   */
  extractAudit: (document: DocumentEntity) => 
    Schema.decodeUnknown(DocumentAuditSchema)(document),

  /**
   * Create a partial document from update data
   */
  createPartial: (updateData: UpdateDocumentDTO) => 
    Schema.decodeUnknown(DocumentUpdateInputSchema)(updateData),

  /**
   * Merge document with update data
   */
  mergeWithUpdate: (document: DocumentEntity, updateData: UpdateDocumentDTO) => 
    Effect.gen(function* () {
      const partialUpdate = yield* Schema.decodeUnknown(DocumentUpdateInputSchema)(updateData);
      // Return the merged data as a plain object
      // Note: In a real implementation, you would create a new DocumentEntity
      return {
        ...document,
        ...partialUpdate,
        updatedAt: new Date()
      };
    }),
};

/**
 * Document schema composition utilities
 * Shows how to compose schemas for different use cases
 */
export const DocumentSchemaComposition = {
  /**
   * Create a schema for document with specific fields
   * Example usage: DocumentSchemaComposition.withFields(['id', 'filename', 'size'])
   */
  withFields: (fields: Array<keyof DocumentEntity>) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      if (field in DocumentSchema.fields) {
        acc[field] = (DocumentSchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for document without specific fields
   * Example usage: DocumentSchemaComposition.withoutFields(['storageKey', 'checksum'])
   */
  withoutFields: (fieldsToOmit: Array<keyof DocumentEntity>) => {
    const allFields = Object.keys(DocumentSchema.fields) as Array<keyof DocumentEntity>;
    const remainingFields = allFields.filter(field => !fieldsToOmit.includes(field));
    
    const fieldSchemas = remainingFields.reduce((acc, field) => {
      if (field in DocumentSchema.fields) {
        acc[field] = (DocumentSchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for document with additional validation
   * Example usage: DocumentSchemaComposition.withValidation(['filename'], { filename: Schema.String.pipe(Schema.minLength(5)) })
   */
  withValidation: (
    fields: Array<keyof DocumentEntity>,
    validators: Partial<Record<keyof DocumentEntity, Schema.Schema<any, any, never>>>
  ) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      acc[field] = validators[field] || (DocumentSchema.fields as any)[field];
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },
};
