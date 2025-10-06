/**
 * Document version repository interface
 * Defines document version-specific data access operations for immutable versioning
 */

import { Effect } from '@effect/core';
import { DocumentVersionEntity, DocumentVersion } from '../../domain/entities';
import { BaseRepository } from './base.repository';
import { DocumentVersionNotFoundError, DocumentValidationError } from '../../domain/errors';

/**
 * Document version creation data transfer object
 */
export interface CreateDocumentVersionDTO {
  documentId: string;
  version: number;
  filename: string;
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
 * Document version filter data transfer object
 */
export interface DocumentVersionFiltersDTO {
  documentId?: string;
  version?: number;
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Document version repository interface
 * Extends base repository with version-specific operations using Effect
 */
export interface IDocumentVersionRepository {
  /**
   * Find document version by ID
   * @param {string} id - Document version unique identifier
   * @returns {Effect.Effect<DocumentVersionEntity, DocumentVersionNotFoundError, never>} Document version entity or error
   */
  findById(id: string): Effect.Effect<DocumentVersionEntity, DocumentVersionNotFoundError, never>;

  /**
   * Find document versions by filters
   * @param {DocumentVersionFiltersDTO} filters - Search filters
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities
   */
  findMany(filters: DocumentVersionFiltersDTO): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Create new document version
   * @param {CreateDocumentVersionDTO} data - Document version creation data
   * @returns {Effect.Effect<DocumentVersionEntity, DocumentValidationError, never>} Created document version entity
   */
  create(data: CreateDocumentVersionDTO): Effect.Effect<DocumentVersionEntity, DocumentValidationError, never>;

  /**
   * Delete document version (versions are immutable, so this is for cleanup)
   * @param {string} id - Document version unique identifier
   * @returns {Effect.Effect<boolean, DocumentVersionNotFoundError, never>} True if deleted
   */
  delete(id: string): Effect.Effect<boolean, DocumentVersionNotFoundError, never>;
  /**
   * Find all versions for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities ordered by version number
   */
  findByDocumentId(documentId: string): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Find specific version of a document
   * @param {string} documentId - Document unique identifier
   * @param {number} version - Version number
   * @returns {Effect.Effect<DocumentVersionEntity, DocumentVersionNotFoundError, never>} Document version entity or error
   */
  findByDocumentAndVersion(documentId: string, version: number): Effect.Effect<DocumentVersionEntity, DocumentVersionNotFoundError, never>;

  /**
   * Find latest version of a document
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<DocumentVersionEntity, DocumentVersionNotFoundError, never>} Latest document version entity or error
   */
  findLatestVersion(documentId: string): Effect.Effect<DocumentVersionEntity, DocumentVersionNotFoundError, never>;

  /**
   * Get version history for a document
   * @param {string} documentId - Document unique identifier
   * @param {number} limit - Maximum number of versions to return
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities in descending order
   */
  getVersionHistory(documentId: string, limit?: number): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Get next version number for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<number, never, never>} Next version number
   */
  getNextVersionNumber(documentId: string): Effect.Effect<number, never, never>;

  /**
   * Find versions by uploader
   * @param {string} userId - User ID who uploaded the versions
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities uploaded by user
   */
  findByUploader(userId: string): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Find versions within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities created within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Get version count for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<number, never, never>} Number of versions for the document
   */
  getVersionCount(documentId: string): Effect.Effect<number, never, never>;

  /**
   * Find versions by checksum (for deduplication)
   * @param {string} checksum - File checksum
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities with same checksum
   */
  findByChecksum(checksum: string): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Get total storage size for document versions
   * @param {string} documentId - Optional document ID to filter by
   * @returns {Effect.Effect<number, never, never>} Total size in bytes
   */
  getTotalStorageSize(documentId?: string): Effect.Effect<number, never, never>;

  /**
   * Find versions by tags
   * @param {string[]} tags - Array of tags to search for
   * @param {boolean} matchAll - Whether to match all tags or any tag
   * @returns {Effect.Effect<DocumentVersionEntity[], never, never>} Array of document version entities with matching tags
   */
  findByTags(tags: string[], matchAll?: boolean): Effect.Effect<DocumentVersionEntity[], never, never>;

  /**
   * Get version statistics
   * @returns {Effect.Effect<Object, never, never>} Version statistics
   */
  getVersionStats(): Effect.Effect<{
    totalVersions: number;
    totalSize: number;
    averageVersionsPerDocument: number;
    versionsByUploader: Record<string, number>;
  }, never, never>;

  /**
   * Delete old versions (cleanup operation)
   * Keep only the latest N versions for each document
   * @param {number} keepVersions - Number of latest versions to keep
   * @returns {Effect.Effect<number, never, never>} Number of versions deleted
   */
  deleteOldVersions(keepVersions: number): Effect.Effect<number, never, never>;

  /**
   * Delete versions for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Effect.Effect<number, never, never>} Number of versions deleted
   */
  deleteVersionsForDocument(documentId: string): Effect.Effect<number, never, never>;
}
