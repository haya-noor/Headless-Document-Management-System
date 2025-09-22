/**
 * Storage service interface
 * Defines the contract for file storage operations
 * This interface ensures easy switching between local storage and cloud storage (S3, etc.)
 */

import { FileUpload, PreSignedUrlResponse } from '../../types';

/**
 * Storage service interface
 * Abstraction layer for file storage operations
 */
export interface IStorageService {
  /**
   * Upload file to storage
   * @param {FileUpload} file - File to upload
   * @param {string} key - Storage key (file path/identifier)
   * @param {Object} options - Upload options
   * @returns {Promise<{key: string; checksum: string; url?: string}>} Upload result
   */
  uploadFile(
    file: FileUpload,
    key: string,
    options?: {
      metadata?: Record<string, string>;
      tags?: Record<string, string>;
      contentType?: string;
    }
  ): Promise<{ key: string; checksum: string; url?: string }>;

  /**
   * Generate download URL for file
   * @param {string} key - Storage key
   * @param {number} expiresIn - URL expiration time in seconds
   * @param {string} filename - Optional filename for download
   * @returns {Promise<PreSignedUrlResponse>} Download URL response
   */
  generateDownloadUrl(
    key: string,
    expiresIn?: number,
    filename?: string
  ): Promise<PreSignedUrlResponse>;

  /**
   * Delete file from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if file was deleted
   */
  deleteFile(key: string): Promise<boolean>;

  /**
   * Check if file exists in storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if file exists
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param {string} key - Storage key
   * @returns {Promise<Object>} File metadata
   */
  getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata: Record<string, string>;
  }>;

  /**
   * Read file from storage
   * @param {string} key - Storage key
   * @returns {Promise<Buffer>} File buffer
   */
  readFile(key: string): Promise<Buffer>;

  /**
   * Copy file within storage
   * @param {string} sourceKey - Source storage key
   * @param {string} destinationKey - Destination storage key
   * @returns {Promise<boolean>} True if file was copied
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<boolean>;

  /**
   * Generate unique file key
   * @param {string} userId - User unique identifier
   * @param {string} filename - Original filename
   * @param {string} documentId - Document unique identifier
   * @returns {string} Unique storage key
   */
  generateFileKey(userId: string, filename: string, documentId: string): string;

  /**
   * Generate version-specific file key
   * @param {string} baseKey - Base file key
   * @param {number} version - Version number
   * @returns {string} Version-specific storage key
   */
  generateVersionKey(baseKey: string, version: number): string;

  /**
   * List files with optional prefix filter
   * @param {string} prefix - Optional prefix to filter files
   * @param {number} limit - Maximum number of files to return
   * @returns {Promise<string[]>} Array of file keys
   */
  listFiles(prefix?: string, limit?: number): Promise<string[]>;
}

/**
 * Storage configuration interface
 * Defines configuration options for different storage providers
 */
export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    storagePath?: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string; // For MinIO or other S3-compatible services
  };
  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
  };
  azure?: {
    connectionString: string;
    containerName: string;
  };
}
