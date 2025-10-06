/**
 * Document repository interface
 * Defines document-specific data access operations
 */

import { Effect } from '@effect/core';
import { DocumentEntity, Document } from '../../domain/entities';
import { DocumentSearchFilters } from '../../types';
import { BaseRepository } from './base.repository';
import { DocumentNotFoundError, DocumentValidationError } from '../../domain/errors';

/**
 * Document creation data transfer object
 */
export interface CreateDocumentDTO {
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
}

/**
 * Document update data transfer object
 */
export interface UpdateDocumentDTO {
  filename?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  currentVersion?: number;
  isDeleted?: boolean;
}

/**
 * Document repository interface
 * Extends base repository with document-specific operations using Effect
 */
export interface IDocumentRepository {
  /**
   * Find document by ID
   * @param {string} id - Document unique identifier
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError, never>} Document entity or error
   */
  findById(id: string): Effect.Effect<DocumentEntity, DocumentNotFoundError, never>;

  /**
   * Find documents by filters
   * @param {DocumentSearchFilters} filters - Search filters
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities
   */
  findMany(filters: DocumentSearchFilters): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Create new document
   * @param {CreateDocumentDTO} data - Document creation data
   * @returns {Effect.Effect<DocumentEntity, DocumentValidationError, never>} Created document entity
   */
  create(data: CreateDocumentDTO): Effect.Effect<DocumentEntity, DocumentValidationError, never>;

  /**
   * Update document
   * @param {string} id - Document unique identifier
   * @param {UpdateDocumentDTO} data - Document update data
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError | DocumentValidationError, never>} Updated document entity
   */
  update(id: string, data: UpdateDocumentDTO): Effect.Effect<DocumentEntity, DocumentNotFoundError | DocumentValidationError, never>;

  /**
   * Delete document
   * @param {string} id - Document unique identifier
   * @returns {Effect.Effect<boolean, DocumentNotFoundError, never>} True if deleted
   */
  delete(id: string): Effect.Effect<boolean, DocumentNotFoundError, never>;
  /**
   * Find documents by uploader
   * @param {string} userId - User ID who uploaded the documents
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities uploaded by user
   */
  findByUploader(userId: string): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Find documents by tags
   * @param {string[]} tags - Array of tags to search for
   * @param {boolean} matchAll - Whether to match all tags or any tag
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities with matching tags
   */
  findByTags(tags: string[], matchAll?: boolean): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Find documents by metadata key-value pairs
   * @param {Record<string, any>} metadata - Metadata to search for
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities with matching metadata
   */
  findByMetadata(metadata: Record<string, any>): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Find documents by MIME type
   * @param {string} mimeType - MIME type to filter by
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities with specified MIME type
   */
  findByMimeType(mimeType: string): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Search documents with advanced filters
   * @param {DocumentSearchFilters} filters - Search filters
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of matching document entities
   */
  searchDocuments(filters: DocumentSearchFilters): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Find documents by filename pattern
   * @param {string} pattern - Filename pattern (supports wildcards)
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities with matching filenames
   */
  findByFilenamePattern(pattern: string): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Find documents within size range
   * @param {number} minSize - Minimum file size in bytes
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities within size range
   */
  findBySizeRange(minSize: number, maxSize: number): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Find documents within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities created within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Get document statistics
   * @returns {Effect.Effect<Object, never, never>} Document statistics
   */
  getDocumentStats(): Effect.Effect<{
    totalDocuments: number;
    totalSize: number;
    documentsByMimeType: Record<string, number>;
    documentsByUploader: Record<string, number>;
  }, never, never>;

  /**
   * Find duplicate documents by checksum
   * @param {string} checksum - File checksum to search for
   * @param {string} excludeDocumentId - Optional document ID to exclude
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of document entities with same checksum
   */
  findDuplicatesByChecksum(checksum: string, excludeDocumentId?: string): Effect.Effect<DocumentEntity[], never, never>;

  /**
   * Update document tags
   * @param {string} documentId - Document unique identifier
   * @param {string[]} tags - New tags array
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError | DocumentValidationError, never>} Updated document entity
   */
  updateTags(documentId: string, tags: string[]): Effect.Effect<DocumentEntity, DocumentNotFoundError | DocumentValidationError, never>;

  /**
   * Update document metadata
   * @param {string} documentId - Document unique identifier
   * @param {Record<string, any>} metadata - New metadata object
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError | DocumentValidationError, never>} Updated document entity
   */
  updateMetadata(documentId: string, metadata: Record<string, any>): Effect.Effect<DocumentEntity, DocumentNotFoundError | DocumentValidationError, never>;

  /**
   * Increment document version
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError, never>} Updated document entity with new version
   */
  incrementVersion(documentId: string): Effect.Effect<DocumentEntity, DocumentNotFoundError, never>;

  /**
   * Soft delete document (mark as deleted)
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError, never>} Updated document entity marked as deleted
   */
  softDelete(documentId: string): Effect.Effect<DocumentEntity, DocumentNotFoundError, never>;

  /**
   * Restore soft deleted document
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<DocumentEntity, DocumentNotFoundError, never>} Updated document entity restored
   */
  restore(documentId: string): Effect.Effect<DocumentEntity, DocumentNotFoundError, never>;

  /**
   * Find deleted documents
   * @param {string} userId - Optional user ID to filter by
   * @returns {Effect.Effect<DocumentEntity[], never, never>} Array of deleted document entities
   */
  findDeleted(userId?: string): Effect.Effect<DocumentEntity[], never, never>;
}
