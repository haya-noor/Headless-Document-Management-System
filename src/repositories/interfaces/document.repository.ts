/**
 * Document repository interface
 * Defines document-specific data access operations
 */

import { Document, DocumentSearchFilters } from '../../types';
import { BaseRepository } from './base.repository';

/**
 * Document creation data transfer object
 */
export interface CreateDocumentDTO {
  filename: string;
  originalName: string;
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
 * Extends base repository with document-specific operations
 */
export interface IDocumentRepository extends BaseRepository<Document, CreateDocumentDTO, UpdateDocumentDTO, DocumentSearchFilters> {
  /**
   * Find documents by uploader
   * @param {string} userId - User ID who uploaded the documents
   * @returns {Promise<Document[]>} Array of documents uploaded by user
   */
  findByUploader(userId: string): Promise<Document[]>;

  /**
   * Find documents by tags
   * @param {string[]} tags - Array of tags to search for
   * @param {boolean} matchAll - Whether to match all tags or any tag
   * @returns {Promise<Document[]>} Array of documents with matching tags
   */
  findByTags(tags: string[], matchAll?: boolean): Promise<Document[]>;

  /**
   * Find documents by metadata key-value pairs
   * @param {Record<string, any>} metadata - Metadata to search for
   * @returns {Promise<Document[]>} Array of documents with matching metadata
   */
  findByMetadata(metadata: Record<string, any>): Promise<Document[]>;

  /**
   * Find documents by MIME type
   * @param {string} mimeType - MIME type to filter by
   * @returns {Promise<Document[]>} Array of documents with specified MIME type
   */
  findByMimeType(mimeType: string): Promise<Document[]>;

  /**
   * Search documents with advanced filters
   * @param {DocumentSearchFilters} filters - Search filters
   * @returns {Promise<Document[]>} Array of matching documents
   */
  searchDocuments(filters: DocumentSearchFilters): Promise<Document[]>;

  /**
   * Find documents by filename pattern
   * @param {string} pattern - Filename pattern (supports wildcards)
   * @returns {Promise<Document[]>} Array of documents with matching filenames
   */
  findByFilenamePattern(pattern: string): Promise<Document[]>;

  /**
   * Find documents within size range
   * @param {number} minSize - Minimum file size in bytes
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Promise<Document[]>} Array of documents within size range
   */
  findBySizeRange(minSize: number, maxSize: number): Promise<Document[]>;

  /**
   * Find documents within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Document[]>} Array of documents created within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Document[]>;

  /**
   * Get document statistics
   * @returns {Promise<Object>} Document statistics
   */
  getDocumentStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    documentsByMimeType: Record<string, number>;
    documentsByUploader: Record<string, number>;
  }>;

  /**
   * Find duplicate documents by checksum
   * @param {string} checksum - File checksum to search for
   * @param {string} excludeDocumentId - Optional document ID to exclude
   * @returns {Promise<Document[]>} Array of documents with same checksum
   */
  findDuplicatesByChecksum(checksum: string, excludeDocumentId?: string): Promise<Document[]>;

  /**
   * Update document tags
   * @param {string} documentId - Document unique identifier
   * @param {string[]} tags - New tags array
   * @returns {Promise<boolean>} True if tags were updated
   */
  updateTags(documentId: string, tags: string[]): Promise<boolean>;

  /**
   * Update document metadata
   * @param {string} documentId - Document unique identifier
   * @param {Record<string, any>} metadata - New metadata object
   * @returns {Promise<boolean>} True if metadata was updated
   */
  updateMetadata(documentId: string, metadata: Record<string, any>): Promise<boolean>;

  /**
   * Increment document version
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<number>} New version number
   */
  incrementVersion(documentId: string): Promise<number>;

  /**
   * Soft delete document (mark as deleted)
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<boolean>} True if document was soft deleted
   */
  softDelete(documentId: string): Promise<boolean>;

  /**
   * Restore soft deleted document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<boolean>} True if document was restored
   */
  restore(documentId: string): Promise<boolean>;

  /**
   * Find deleted documents
   * @param {string} userId - Optional user ID to filter by
   * @returns {Promise<Document[]>} Array of deleted documents
   */
  findDeleted(userId?: string): Promise<Document[]>;
}
