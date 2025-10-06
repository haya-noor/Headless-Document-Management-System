/**
 * Effect-based Document Repository Interface
 * Defines document-specific data access operations using Effect
 * Following d4-effect.md requirements for effectful signatures and typed errors
 */

import { Effect } from 'effect';
import { EffectBaseRepository, RepositoryErrorType } from './effect-base.repository';
import { DocumentEntity } from '../../domain/entities';

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
  currentVersion?: number;
}

/**
 * Document update data transfer object
 */
export interface UpdateDocumentDTO {
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  storageKey?: string;
  storageProvider?: 'local' | 's3' | 'gcs';
  checksum?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  currentVersion?: number;
  isActive?: boolean;
}

/**
 * Document filter data transfer object
 */
export interface DocumentFilterDTO {
  uploadedBy?: string;
  mimeType?: string;
  storageProvider?: 'local' | 's3' | 'gcs';
  tags?: string[];
  isActive?: boolean;
  search?: string; // Search in filename, originalName
  minSize?: number;
  maxSize?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Effect-based Document repository interface
 * Provides Effect-based operations for document management
 */
export interface EffectDocumentRepository extends EffectBaseRepository<
  DocumentEntity,
  CreateDocumentDTO,
  UpdateDocumentDTO,
  DocumentFilterDTO
> {
  /**
   * Find documents by uploader
   * @param {string} userId - User ID who uploaded the documents
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findByUploader(userId: string): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find documents by MIME type
   * @param {string} mimeType - MIME type to filter by
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findByMimeType(mimeType: string): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find documents by storage provider
   * @param {'local' | 's3' | 'gcs'} provider - Storage provider to filter by
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findByStorageProvider(provider: 'local' | 's3' | 'gcs'): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find documents by checksum
   * @param {string} checksum - SHA-256 checksum to search for
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents with matching checksum or error
   */
  findByChecksum(checksum: string): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find duplicate documents by checksum
   * @param {string} checksum - SHA-256 checksum to search for
   * @param {string} excludeDocumentId - Document ID to exclude from results
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of duplicate documents or error
   */
  findDuplicatesByChecksum(checksum: string, excludeDocumentId?: string): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find documents by tags
   * @param {string[]} tags - Array of tags to search for
   * @param {boolean} matchAll - Whether to match all tags (AND) or any tags (OR)
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findByTags(tags: string[], matchAll?: boolean): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find documents by size range
   * @param {number} minSize - Minimum size in bytes
   * @param {number} maxSize - Maximum size in bytes
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findBySizeRange(minSize: number, maxSize: number): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Find documents created within date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Search documents by filename or original name
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of matching documents or error
   */
  searchDocuments(searchTerm: string, limit?: number): Effect.Effect<DocumentEntity[], DatabaseError>;

  /**
   * Get document statistics
   * @returns {Effect.Effect<{total: number, byMimeType: Record<string, number>, byProvider: Record<string, number>}, DatabaseError>} Statistics or error
   */
  getStatistics(): Effect.Effect<{
    total: number;
    byMimeType: Record<string, number>;
    byProvider: Record<string, number>;
    totalSize: number;
  }, DatabaseError>;

  /**
   * Soft delete document
   * @param {string} documentId - Document ID to soft delete
   * @returns {Effect.Effect<DocumentEntity, NotFoundError | DatabaseError>} Updated document or error
   */
  softDelete(documentId: string): Effect.Effect<DocumentEntity, NotFoundError | DatabaseError>;

  /**
   * Restore soft deleted document
   * @param {string} documentId - Document ID to restore
   * @returns {Effect.Effect<DocumentEntity, NotFoundError | DatabaseError>} Updated document or error
   */
  restore(documentId: string): Effect.Effect<DocumentEntity, NotFoundError | DatabaseError>;

  /**
   * Update document version
   * @param {string} documentId - Document ID
   * @param {number} newVersion - New version number
   * @returns {Effect.Effect<DocumentEntity, NotFoundError | DatabaseError>} Updated document or error
   */
  updateVersion(documentId: string, newVersion: number): Effect.Effect<DocumentEntity, NotFoundError | DatabaseError>;

  /**
   * Find documents by multiple IDs
   * @param {string[]} documentIds - Array of document IDs
   * @returns {Effect.Effect<DocumentEntity[], DatabaseError>} Array of documents or error
   */
  findByIds(documentIds: string[]): Effect.Effect<DocumentEntity[], DatabaseError>;
}
