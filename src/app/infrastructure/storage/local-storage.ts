/**
 * Local file storage service (file operation and local storage path)
 * Handles file upload, download, and management operations with local filesystem
 * Designed to be easily replaceable with S3-compatible storage in the future
 */

import { promises as fs } from 'fs';  //fs = file system
import { createHash } from 'crypto';
import * as path from 'path';
const { join, dirname, extname } = path;
import { serverConfig } from '@/app/infrastructure/config/server.config';
import { storageConfig } from '@/app/infrastructure/config/storage.config';
import { FileUpload, PreSignedUrlResponse } from '@/app/application/interfaces/file.interface';
import { IStorageService } from '@/app/application/interfaces/storage.interface';
// Logger removed - no longer needed for domain-focused project

/**
 * Local storage service class
 * Provides file storage operations with local filesystem
 * Interface designed to match future S3 implementation
 */
export class LocalStorageService implements IStorageService {
  private storagePath: string;

  constructor() {
    // Create storage directory using config
    this.storagePath = join(process.cwd(), storageConfig.local.storagePath, 'documents');
    this.ensureStorageDirectory();
  }

  /**
   * Upload file to local storage
   * @param {FileUpload} file - File to upload
   * @param {string} key - Storage key (file path)
   * @param {Object} options - Upload options
   * @returns {Promise<{key: string; checksum: string; url?: string}>} Upload result
   */
  async uploadFile(
    file: FileUpload,
    key: string,
    options: {
      metadata?: Record<string, string>;
      tags?: Record<string, string>;
      contentType?: string;
    } = {}
  ): Promise<{ key: string; checksum: string; url?: string }> {
    try {
      // Calculate file checksum
      const checksum = this.calculateChecksum(file.buffer);

      // Create full file path
      const filePath = join(this.storagePath, key);
      
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });

      // Write file to disk
      await fs.writeFile(filePath, file.buffer);

      // Create metadata file alongside the actual file
      const metadataPath = filePath + '.meta.json';
      const metadata = {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        checksum,
        contentType: options.contentType || file.mimetype,
        size: file.size,
        ...options.metadata,
        ...(options.tags && { tags: options.tags }),
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      return {
        key,
        checksum,
        url: this.getFileUrl(key),
      };
    } catch (error) {
      
      throw new Error(`File upload failed: ${error}`);
    }
  }

  /**
   * Generate download URL for file
   * For local storage, this returns a server endpoint URL
   * @param {string} key - Storage key
   * @param {number} expiresIn - URL expiration time in seconds (not used for local, kept for interface compatibility)
   * @param {string} filename - Optional filename for download
   * @returns {Promise<PreSignedUrlResponse>} Download URL response
   */
  async generateDownloadUrl(
    key: string,
    expiresIn: number = 3600, // 1 hour default
    filename?: string
  ): Promise<PreSignedUrlResponse> {
    try {
      // For local storage, we'll create a download endpoint
      // In future S3 implementation, this will generate pre-signed URLs
      const baseUrl = `http://localhost:${serverConfig.port}`;
      const downloadPath = `/api/v1/files/download/${encodeURIComponent(key)}`;
      const url = filename 
        ? `${baseUrl}${downloadPath}?filename=${encodeURIComponent(filename)}`
        : `${baseUrl}${downloadPath}`;

      return {
        url,
        expiresAt: new Date(Date.now() + (expiresIn * 1000))
      };
    } catch (error) {
      
      throw new Error(`Failed to generate download URL: ${error}`);
    }
  }

  /**
   * Delete file from local storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if file was deleted
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = join(this.storagePath, key);
      const metadataPath = filePath + '.meta.json';

      // Delete both file and metadata
      await Promise.all([
        fs.unlink(filePath).catch(() => {}), // Ignore if file doesn't exist
        fs.unlink(metadataPath).catch(() => {}), // Ignore if metadata doesn't exist
      ]);

      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Check if file exists in storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = join(this.storagePath, key);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param {string} key - Storage key
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata: Record<string, string>;
  }> {
    try {
      const filePath = join(this.storagePath, key);
      const metadataPath = filePath + '.meta.json';

      // Get file stats
      const stats = await fs.stat(filePath);

      // Try to read metadata file
      let metadata: any = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch (error) {
        // Metadata file doesn't exist or is invalid
        
      }

      return {
        size: stats.size,
        lastModified: new Date(stats.mtime),
        contentType: metadata.contentType || 'application/octet-stream',
        metadata: metadata.metadata || {},
      };
    } catch (error) {
      
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * Read file from local storage
   * @param {string} key - Storage key
   * @returns {Promise<Buffer>} File buffer
   */
  async readFile(key: string): Promise<Buffer> {
    try {
      const filePath = join(this.storagePath, key);
      return await fs.readFile(filePath);
    } catch (error) {
      
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Copy file within storage
   * @param {string} sourceKey - Source storage key
   * @param {string} destinationKey - Destination storage key
   * @returns {Promise<boolean>} True if file was copied
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      const sourcePath = join(this.storagePath, sourceKey);
      const destPath = join(this.storagePath, destinationKey);
      const sourceMetaPath = sourcePath + '.meta.json';
      const destMetaPath = destPath + '.meta.json';

      // Ensure destination directory exists
      await fs.mkdir(dirname(destPath), { recursive: true });

      // Copy file and metadata
      await Promise.all([
        fs.copyFile(sourcePath, destPath),
        fs.copyFile(sourceMetaPath, destMetaPath).catch(() => {}), // Ignore if metadata doesn't exist
      ]);

      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Generate unique file key based on user ID and filename
   * @param {string} userId - User unique identifier
   * @param {string} filename - Original filename
   * @param {string} documentId - Document unique identifier
   * @returns {string} Unique storage key
   */
  generateFileKey(userId: string, filename: string, documentId: string): string {
    const timestamp = Date.now();
    const extension = extname(filename);
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const sanitizedName = this.sanitizeFilename(baseName);
    
    return `users/${userId}/documents/${documentId}/${timestamp}_${sanitizedName}${extension}`;
  }

  /**
   * Generate version-specific file key
   * @param {string} baseKey - Base file key
   * @param {number} version - Version number
   * @returns {string} Version-specific storage key
   */
  generateVersionKey(baseKey: string, version: number): string {
    const parts = baseKey.split('/');
    const filename = parts.pop() || '';
    const extension = extname(filename);
    const name = filename.replace(/\.[^/.]+$/, '');
    
    return `${parts.join('/')}/versions/${name}_v${version}${extension}`;
  }

  /**
   * List files in storage with optional prefix and limit
   * @param {string} prefix - Optional prefix to filter files
   * @param {number} limit - Optional limit on number of files to return
   * @returns {Promise<string[]>} List of file keys
   */
  async listFiles(prefix?: string, limit?: number): Promise<string[]> {
    try {
      await this.ensureStorageDirectory();
      
      const files: string[] = [];
      
      const scanDirectory = async (dirPath: string, currentPrefix: string = ''): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.join(currentPrefix, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, relativePath);
          } else {
            // Check if file matches prefix filter
            if (!prefix || relativePath.startsWith(prefix)) {
              files.push(relativePath);
            }
          }
        }
      };
      
      await scanDirectory(this.storagePath);
      
      // Sort files alphabetically
      files.sort();
      
      // Apply limit if specified
      return limit ? files.slice(0, limit) : files;
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    storageLocation: string;
  }> {
    try {
      const stats = await this.calculateDirectoryStats(this.storagePath);
      return {
        totalFiles: stats.fileCount,
        totalSize: stats.totalSize,
        storageLocation: this.storagePath,
      };
    } catch (error) {
      
      return {
        totalFiles: 0,
        totalSize: 0,
        storageLocation: this.storagePath,
      };
    }
  }

  // Private helper methods

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      // Storage directory initialized
    } catch (error) {
      // Failed to create storage directory
      throw new Error(`Failed to create storage directory: ${error}`);
    }
  }

  /**
   * Calculate SHA-256 checksum of file buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} SHA-256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get file URL for local storage
   * @param {string} key - Storage key
   * @returns {string} File URL
   */
  private getFileUrl(key: string): string {
    const baseUrl = `http://localhost:${serverConfig.port}`;
    return `${baseUrl}/api/v1/files/${encodeURIComponent(key)}`;
  }

  /**
   * Sanitize filename for safe storage
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Calculate directory statistics recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<{fileCount: number; totalSize: number}>} Directory stats
   */
  private async calculateDirectoryStats(dirPath: string): Promise<{fileCount: number; totalSize: number}> {
    let fileCount = 0;
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subStats = await this.calculateDirectoryStats(fullPath);
          fileCount += subStats.fileCount;
          totalSize += subStats.totalSize;
        } else if (entry.isFile() && !entry.name.endsWith('.meta.json')) {
          // Don't count metadata files
          fileCount++;
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      
    }

    return { fileCount, totalSize };
  }
}
