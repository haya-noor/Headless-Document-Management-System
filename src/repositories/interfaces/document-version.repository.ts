/**
 * Document version repository interface
 * Defines document version-specific data access operations for immutable versioning
 */

import { DocumentVersion } from '../../types';
import { BaseRepository } from './base.repository';

/**
 * Document version creation data transfer object
 */
export interface CreateDocumentVersionDTO {
  documentId: string;
  version: number;
  filename: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
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
 * Extends base repository with version-specific operations
 */
export interface IDocumentVersionRepository extends BaseRepository<
  DocumentVersion,
  CreateDocumentVersionDTO,
  never, // Versions are immutable - no updates allowed
  DocumentVersionFiltersDTO
> {
  /**
   * Find all versions for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<DocumentVersion[]>} Array of document versions ordered by version number
   */
  findByDocumentId(documentId: string): Promise<DocumentVersion[]>;

  /**
   * Find specific version of a document
   * @param {string} documentId - Document unique identifier
   * @param {number} version - Version number
   * @returns {Promise<DocumentVersion | null>} Document version or null if not found
   */
  findByDocumentAndVersion(documentId: string, version: number): Promise<DocumentVersion | null>;

  /**
   * Find latest version of a document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<DocumentVersion | null>} Latest document version or null if not found
   */
  findLatestVersion(documentId: string): Promise<DocumentVersion | null>;

  /**
   * Get version history for a document
   * @param {string} documentId - Document unique identifier
   * @param {number} limit - Maximum number of versions to return
   * @returns {Promise<DocumentVersion[]>} Array of document versions in descending order
   */
  getVersionHistory(documentId: string, limit?: number): Promise<DocumentVersion[]>;

  /**
   * Get next version number for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<number>} Next version number
   */
  getNextVersionNumber(documentId: string): Promise<number>;

  /**
   * Find versions by uploader
   * @param {string} userId - User ID who uploaded the versions
   * @returns {Promise<DocumentVersion[]>} Array of document versions uploaded by user
   */
  findByUploader(userId: string): Promise<DocumentVersion[]>;

  /**
   * Find versions within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<DocumentVersion[]>} Array of versions created within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<DocumentVersion[]>;

  /**
   * Get version count for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<number>} Number of versions for the document
   */
  getVersionCount(documentId: string): Promise<number>;

  /**
   * Find versions by checksum (for deduplication)
   * @param {string} checksum - File checksum
   * @returns {Promise<DocumentVersion[]>} Array of versions with same checksum
   */
  findByChecksum(checksum: string): Promise<DocumentVersion[]>;

  /**
   * Get total storage size for document versions
   * @param {string} documentId - Optional document ID to filter by
   * @returns {Promise<number>} Total size in bytes
   */
  getTotalStorageSize(documentId?: string): Promise<number>;

  /**
   * Find versions by tags
   * @param {string[]} tags - Array of tags to search for
   * @param {boolean} matchAll - Whether to match all tags or any tag
   * @returns {Promise<DocumentVersion[]>} Array of versions with matching tags
   */
  findByTags(tags: string[], matchAll?: boolean): Promise<DocumentVersion[]>;

  /**
   * Get version statistics
   * @returns {Promise<Object>} Version statistics
   */
  getVersionStats(): Promise<{
    totalVersions: number;
    totalSize: number;
    averageVersionsPerDocument: number;
    versionsByUploader: Record<string, number>;
  }>;

  /**
   * Delete old versions (cleanup operation)
   * Keep only the latest N versions for each document
   * @param {number} keepVersions - Number of latest versions to keep
   * @returns {Promise<number>} Number of versions deleted
   */
  deleteOldVersions(keepVersions: number): Promise<number>;

  /**
   * Delete versions for a document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<number>} Number of versions deleted
   */
  deleteVersionsForDocument(documentId: string): Promise<number>;
}
