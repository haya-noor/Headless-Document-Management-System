/**
 * Effect-based DocumentVersion Repository Interface
 * Defines document-version-specific data access operations using Effect
 * Following d4-effect.md requirements for effectful signatures and typed errors
 * 
 * Uses Effect Schema concepts with pick/omit to eliminate repetition
 */

import { Effect } from 'effect';
import { Schema } from '@effect/schema';
import { Repository, DatabaseError, NotFoundError, ValidationError } from "../shared/errors";
import { PaginationParams, PaginatedResponse } from '../../domain/shared/api.interface';
import { DocumentVersionEntity, DocumentVersionSchema } from '../../domain/d-version/entity';

/**
 * Base document version fields schema - core document version properties
 */
const BaseDocumentVersionFieldsSchema = Schema.Struct({
  documentId: Schema.String.pipe(Schema.brand('DocumentId')),
  version: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ),
  filename: Schema.String.pipe(
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
 * Optional document version fields schema - fields that can be optional
 */
const OptionalDocumentVersionFieldsSchema = Schema.Struct({
  checksum: Schema.optional(Schema.String.pipe(Schema.brand('Checksum'))),
  tags: Schema.optional(Schema.Array(Schema.String)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

/**
 * DocumentVersion creation data transfer object schema
 * Combines base fields with optional fields for creation
 */
export const CreateDocumentVersionDTOSchema = Schema.Struct({
  ...BaseDocumentVersionFieldsSchema.fields,
  ...OptionalDocumentVersionFieldsSchema.fields,
});

/**
 * DocumentVersion update data transfer object schema
 * All fields are optional for updates, plus additional update-specific fields
 */
export const UpdateDocumentVersionDTOSchema = Schema.Struct({
  filename: Schema.optional(Schema.String.pipe(
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
  checksum: Schema.optional(Schema.String.pipe(Schema.brand('Checksum'))),
  tags: Schema.optional(Schema.Array(Schema.String)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

/**
 * DocumentVersion filter data transfer object schema
 * Fields for filtering and searching document versions
 * Uses field schemas where appropriate
 */
export const DocumentVersionFilterDTOSchema = Schema.Struct({
  documentId: Schema.optional(Schema.String.pipe(Schema.brand('DocumentId'))),
  version: Schema.optional(Schema.Number.pipe(Schema.positive())),
  mimeType: Schema.optional(Schema.String),
  storageProvider: Schema.optional(Schema.Literal('local', 's3', 'gcs')),
  uploadedBy: Schema.optional(Schema.String.pipe(Schema.brand('UserId'))),
  hasChecksum: Schema.optional(Schema.Boolean),
  hasTags: Schema.optional(Schema.Boolean),
  hasMetadata: Schema.optional(Schema.Boolean),
  minSize: Schema.optional(Schema.Number.pipe(Schema.positive())),
  maxSize: Schema.optional(Schema.Number.pipe(Schema.positive())),
  search: Schema.optional(Schema.String), // Search in filename
  createdAfter: Schema.optional(Schema.Date),
  createdBefore: Schema.optional(Schema.Date),
});

/**
 * DocumentVersion creation data transfer object type
 */
export type CreateDocumentVersionDTO = Schema.Schema.Type<typeof CreateDocumentVersionDTOSchema>;

/**
 * DocumentVersion update data transfer object type
 */
export type UpdateDocumentVersionDTO = Schema.Schema.Type<typeof UpdateDocumentVersionDTOSchema>;

/**
 * DocumentVersion filter data transfer object type
 */
export type DocumentVersionFilterDTO = Schema.Schema.Type<typeof DocumentVersionFilterDTOSchema>;

/**
 * DocumentVersion statistics schema
 */
export const DocumentVersionStatisticsSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.nonNegative()),
  byMimeType: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  byStorageProvider: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  byDocument: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  totalSize: Schema.Number.pipe(Schema.nonNegative()),
  averageSize: Schema.Number.pipe(Schema.nonNegative()),
});

/**
 * DocumentVersion statistics type
 */
export type DocumentVersionStatistics = Schema.Schema.Type<typeof DocumentVersionStatisticsSchema>;

/**
 * Derived schemas using pick and omit for specific use cases
 */

/**
 * DocumentVersion summary schema - only essential fields for listing
 */
export const DocumentVersionSummarySchema = Schema.Struct({
  id: DocumentVersionSchema.fields.id,
  documentId: DocumentVersionSchema.fields.documentId,
  version: DocumentVersionSchema.fields.version,
  filename: DocumentVersionSchema.fields.filename,
  mimeType: DocumentVersionSchema.fields.mimeType,
  size: DocumentVersionSchema.fields.size,
  storageProvider: DocumentVersionSchema.fields.storageProvider,
  uploadedBy: DocumentVersionSchema.fields.uploadedBy,
  createdAt: DocumentVersionSchema.fields.createdAt,
});

/**
 * DocumentVersion metadata schema - only metadata fields
 */
export const DocumentVersionMetadataSchema = Schema.Struct({
  id: DocumentVersionSchema.fields.id,
  filename: DocumentVersionSchema.fields.filename,
  mimeType: DocumentVersionSchema.fields.mimeType,
  size: DocumentVersionSchema.fields.size,
  checksum: DocumentVersionSchema.fields.checksum,
  tags: DocumentVersionSchema.fields.tags,
  metadata: DocumentVersionSchema.fields.metadata,
});

/**
 * DocumentVersion storage schema - only storage-related fields
 */
export const DocumentVersionStorageSchema = Schema.Struct({
  id: DocumentVersionSchema.fields.id,
  storageKey: DocumentVersionSchema.fields.storageKey,
  storageProvider: DocumentVersionSchema.fields.storageProvider,
  size: DocumentVersionSchema.fields.size,
  checksum: DocumentVersionSchema.fields.checksum,
});

/**
 * DocumentVersion audit schema - only audit fields
 */
export const DocumentVersionAuditSchema = Schema.Struct({
  id: DocumentVersionSchema.fields.id,
  documentId: DocumentVersionSchema.fields.documentId,
  version: DocumentVersionSchema.fields.version,
  uploadedBy: DocumentVersionSchema.fields.uploadedBy,
  createdAt: DocumentVersionSchema.fields.createdAt,
});

/**
 * DocumentVersion creation input schema - omits system-generated fields
 */
export const DocumentVersionCreationInputSchema = Schema.Struct({
  documentId: DocumentVersionSchema.fields.documentId,
  version: DocumentVersionSchema.fields.version,
  filename: DocumentVersionSchema.fields.filename,
  mimeType: DocumentVersionSchema.fields.mimeType,
  size: DocumentVersionSchema.fields.size,
  storageKey: DocumentVersionSchema.fields.storageKey,
  storageProvider: DocumentVersionSchema.fields.storageProvider,
  checksum: DocumentVersionSchema.fields.checksum,
  tags: DocumentVersionSchema.fields.tags,
  metadata: DocumentVersionSchema.fields.metadata,
  uploadedBy: DocumentVersionSchema.fields.uploadedBy,
});

/**
 * DocumentVersion update input schema - only updatable fields
 */
export const DocumentVersionUpdateInputSchema = Schema.Struct({
  filename: DocumentVersionSchema.fields.filename,
  mimeType: DocumentVersionSchema.fields.mimeType,
  size: DocumentVersionSchema.fields.size,
  storageKey: DocumentVersionSchema.fields.storageKey,
  storageProvider: DocumentVersionSchema.fields.storageProvider,
  checksum: DocumentVersionSchema.fields.checksum,
  tags: DocumentVersionSchema.fields.tags,
  metadata: DocumentVersionSchema.fields.metadata,
});

/**
 * DocumentVersion search result schema - optimized for search results
 */
export const DocumentVersionSearchResultSchema = Schema.Struct({
  id: DocumentVersionSchema.fields.id,
  documentId: DocumentVersionSchema.fields.documentId,
  version: DocumentVersionSchema.fields.version,
  filename: DocumentVersionSchema.fields.filename,
  mimeType: DocumentVersionSchema.fields.mimeType,
  size: DocumentVersionSchema.fields.size,
  storageProvider: DocumentVersionSchema.fields.storageProvider,
  uploadedBy: DocumentVersionSchema.fields.uploadedBy,
  createdAt: DocumentVersionSchema.fields.createdAt,
});

/**
 * Type exports for the derived schemas
 */
export type DocumentVersionSummary = Schema.Schema.Type<typeof DocumentVersionSummarySchema>;
export type DocumentVersionMetadata = Schema.Schema.Type<typeof DocumentVersionMetadataSchema>;
export type DocumentVersionStorage = Schema.Schema.Type<typeof DocumentVersionStorageSchema>;
export type DocumentVersionAudit = Schema.Schema.Type<typeof DocumentVersionAuditSchema>;
export type DocumentVersionCreationInput = Schema.Schema.Type<typeof DocumentVersionCreationInputSchema>;
export type DocumentVersionUpdateInput = Schema.Schema.Type<typeof DocumentVersionUpdateInputSchema>;
export type DocumentVersionSearchResult = Schema.Schema.Type<typeof DocumentVersionSearchResultSchema>;

/**
 * Effect-based DocumentVersion repository interface
 * Provides Effect-based operations for document version management with proper validation
 */
export interface DocumentVersionRepository {
  /**
   * Create a new document version with validation
   * @param {CreateDocumentVersionDTO} data - Document version creation data
   * @returns {Effect.Effect<DocumentVersionEntity, ValidationError | DatabaseError>} Created document version or error
   */
  create(data: CreateDocumentVersionDTO): Effect.Effect<DocumentVersionEntity, ValidationError | DatabaseError>;

  /**
   * Update a document version with validation
   * @param {string} id - Document version ID
   * @param {UpdateDocumentVersionDTO} data - Document version update data
   * @returns {Effect.Effect<DocumentVersionEntity, ValidationError | NotFoundError | DatabaseError>} Updated document version or error
   */
  update(id: string, data: UpdateDocumentVersionDTO): Effect.Effect<DocumentVersionEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Find a document version by ID
   * @param {string} id - Document version ID
   * @returns {Effect.Effect<DocumentVersionEntity | null, DatabaseError>} Document version or null if not found
   */
  findById(id: string): Effect.Effect<DocumentVersionEntity | null, DatabaseError>;

  /**
   * Find all document versions with pagination
   * @param {PaginationParams} params - Pagination parameters
   * @returns {Effect.Effect<PaginatedResponse<DocumentVersionEntity>, DatabaseError>} Paginated document versions or error
   */
  findAll(params: PaginationParams): Effect.Effect<PaginatedResponse<DocumentVersionEntity>, DatabaseError>;

  /**
   * Delete a document version by ID
   * @param {string} id - Document version ID
   * @returns {Effect.Effect<boolean, DatabaseError>} Success or error
   */
  delete(id: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Find document versions by document ID
   * @param {string} documentId - Document ID
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findByDocumentId(documentId: string): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find document versions by version number
   * @param {string} documentId - Document ID
   * @param {number} version - Version number
   * @returns {Effect.Effect<DocumentVersionEntity | null, ValidationError | DatabaseError>} Document version or null if not found
   */
  findByVersion(documentId: string, version: number): Effect.Effect<DocumentVersionEntity | null, ValidationError | DatabaseError>;

  /**
   * Find the latest version of a document
   * @param {string} documentId - Document ID
   * @returns {Effect.Effect<DocumentVersionEntity | null, ValidationError | DatabaseError>} Latest document version or null if not found
   */
  findLatestVersion(documentId: string): Effect.Effect<DocumentVersionEntity | null, ValidationError | DatabaseError>;

  /**
   * Find document versions by MIME type
   * @param {string} mimeType - MIME type to filter by
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findByMimeType(mimeType: string): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find document versions by storage provider
   * @param {'local' | 's3' | 'gcs'} provider - Storage provider to filter by
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findByStorageProvider(provider: 'local' | 's3' | 'gcs'): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find document versions by checksum
   * @param {string} checksum - SHA-256 checksum to search for
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions with matching checksum or error
   */
  findByChecksum(checksum: string): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find duplicate document versions by checksum
   * @param {string} checksum - SHA-256 checksum to search for
   * @param {string} excludeVersionId - Document version ID to exclude from results
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of duplicate document versions or error
   */
  findDuplicatesByChecksum(checksum: string, excludeVersionId?: string): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find document versions by uploader
   * @param {string} uploadedBy - User ID who uploaded the versions
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findByUploader(uploadedBy: string): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find document versions by size range
   * @param {number} minSize - Minimum size in bytes
   * @param {number} maxSize - Maximum size in bytes
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findBySizeRange(minSize: number, maxSize: number): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Find document versions created within date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Search document versions by filename
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of matching document versions or error
   */
  searchDocumentVersions(searchTerm: string, limit?: number): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Get document version statistics
   * @returns {Effect.Effect<DocumentVersionStatistics, DatabaseError>} Statistics or error
   */
  getStatistics(): Effect.Effect<DocumentVersionStatistics, DatabaseError>;

  /**
   * Find document versions by multiple IDs
   * @param {string[]} versionIds - Array of document version IDs
   * @returns {Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>} Array of document versions or error
   */
  findByIds(versionIds: string[]): Effect.Effect<DocumentVersionEntity[], ValidationError | DatabaseError>;

  /**
   * Get the next version number for a document
   * @param {string} documentId - Document ID
   * @returns {Effect.Effect<number, ValidationError | DatabaseError>} Next version number or error
   */
  getNextVersionNumber(documentId: string): Effect.Effect<number, ValidationError | DatabaseError>;

  /**
   * Check if a document version exists
   * @param {string} documentId - Document ID
   * @param {number} version - Version number
   * @returns {Effect.Effect<boolean, ValidationError | DatabaseError>} True if version exists or error
   */
  existsByDocumentAndVersion(documentId: string, version: number): Effect.Effect<boolean, ValidationError | DatabaseError>;
}

/**
 * DocumentVersion repository validation utilities
 * Provides Effect-based validation functions using the schemas
 */
export const DocumentVersionRepositoryValidation = {
  /**
   * Validate create document version data
   */
  validateCreate: (data: unknown) => 
    Schema.decodeUnknown(CreateDocumentVersionDTOSchema)(data),

  /**
   * Validate update document version data
   */
  validateUpdate: (data: unknown) => 
    Schema.decodeUnknown(UpdateDocumentVersionDTOSchema)(data),

  /**
   * Validate filter document version data
   */
  validateFilter: (data: unknown) => 
    Schema.decodeUnknown(DocumentVersionFilterDTOSchema)(data),

  /**
   * Validate document version ID
   */
  validateDocumentVersionId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('DocumentVersionId')))(id),

  /**
   * Validate document ID
   */
  validateDocumentId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('DocumentId')))(id),

  /**
   * Validate checksum
   */
  validateChecksum: (checksum: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('Checksum')))(checksum),

  /**
   * Validate document version summary data
   */
  validateSummary: (data: unknown) => 
    Schema.decodeUnknown(DocumentVersionSummarySchema)(data),

  /**
   * Validate document version metadata data
   */
  validateMetadata: (data: unknown) => 
    Schema.decodeUnknown(DocumentVersionMetadataSchema)(data),

  /**
   * Validate document version storage data
   */
  validateStorage: (data: unknown) => 
    Schema.decodeUnknown(DocumentVersionStorageSchema)(data),

  /**
   * Validate document version search result data
   */
  validateSearchResult: (data: unknown) => 
    Schema.decodeUnknown(DocumentVersionSearchResultSchema)(data),
};

/**
 * DocumentVersion schema transformation utilities
 * Demonstrates advanced Effect Schema concepts
 */
export const DocumentVersionSchemaUtils = {
  /**
   * Transform document version to summary format
   */
  toSummary: (version: DocumentVersionEntity) => 
    Schema.decodeUnknown(DocumentVersionSummarySchema)(version),

  /**
   * Transform document version to search result format
   */
  toSearchResult: (version: DocumentVersionEntity) => 
    Schema.decodeUnknown(DocumentVersionSearchResultSchema)(version),

  /**
   * Extract metadata from document version
   */
  extractMetadata: (version: DocumentVersionEntity) => 
    Schema.decodeUnknown(DocumentVersionMetadataSchema)(version),

  /**
   * Extract storage information from document version
   */
  extractStorage: (version: DocumentVersionEntity) => 
    Schema.decodeUnknown(DocumentVersionStorageSchema)(version),

  /**
   * Extract audit information from document version
   */
  extractAudit: (version: DocumentVersionEntity) => 
    Schema.decodeUnknown(DocumentVersionAuditSchema)(version),

  /**
   * Create a partial document version from update data
   */
  createPartial: (updateData: UpdateDocumentVersionDTO) => 
    Schema.decodeUnknown(DocumentVersionUpdateInputSchema)(updateData),

  /**
   * Merge document version with update data
   */
  mergeWithUpdate: (version: DocumentVersionEntity, updateData: UpdateDocumentVersionDTO) => 
    Effect.gen(function* () {
      const partialUpdate = yield* Schema.decodeUnknown(DocumentVersionUpdateInputSchema)(updateData);
      // Return the merged data as a plain object
      // Note: In a real implementation, you would create a new DocumentVersionEntity
      return {
        ...version,
        ...partialUpdate,
        updatedAt: new Date()
      };
    }),
};

/**
 * DocumentVersion schema composition utilities
 * Shows how to compose schemas for different use cases
 */
export const DocumentVersionSchemaComposition = {
  /**
   * Create a schema for document version with specific fields
   * Example usage: DocumentVersionSchemaComposition.withFields(['id', 'filename', 'size'])
   */
  withFields: (fields: Array<keyof DocumentVersionEntity>) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      if (field in DocumentVersionSchema.fields) {
        acc[field] = (DocumentVersionSchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for document version without specific fields
   * Example usage: DocumentVersionSchemaComposition.withoutFields(['storageKey', 'checksum'])
   */
  withoutFields: (fieldsToOmit: Array<keyof DocumentVersionEntity>) => {
    const allFields = Object.keys(DocumentVersionSchema.fields) as Array<keyof DocumentVersionEntity>;
    const remainingFields = allFields.filter(field => !fieldsToOmit.includes(field));
    
    const fieldSchemas = remainingFields.reduce((acc, field) => {
      if (field in DocumentVersionSchema.fields) {
        acc[field] = (DocumentVersionSchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for document version with additional validation
   * Example usage: DocumentVersionSchemaComposition.withValidation(['filename'], { filename: Schema.String.pipe(Schema.minLength(5)) })
   */
  withValidation: (
    fields: Array<keyof DocumentVersionEntity>,
    validators: Partial<Record<keyof DocumentVersionEntity, Schema.Schema<any, any, never>>>
  ) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      acc[field] = validators[field] || (DocumentVersionSchema.fields as any)[field];
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },
};
