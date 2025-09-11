/**
 * S3-compatible storage service
 * Handles file upload, download, and management operations with S3-compatible storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { config } from '../config';
import { FileUpload, PreSignedUrlResponse } from '../types';
import { Logger } from '../middleware/logging';

/**
 * Storage service class
 * Provides S3-compatible storage operations with pre-signed URLs
 */
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    // Initialize S3 client with configuration
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
      endpoint: config.aws.s3.endpoint, // For local development with MinIO
      forcePathStyle: !!config.aws.s3.endpoint, // Required for MinIO
    });

    this.bucket = config.aws.s3.bucket;
  }

  /**
   * Upload file to S3-compatible storage
   * @param {FileUpload} file - File to upload
   * @param {string} key - S3 object key (file path)
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

      // Prepare upload parameters
      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: options.contentType || file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          checksum,
          ...options.metadata,
        },
        ...(options.tags && { Tagging: this.formatTags(options.tags) }),
      };

      // Upload file to S3
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      Logger.info('File uploaded successfully', {
        key,
        size: file.size,
        contentType: file.mimetype,
        checksum,
      });

      return {
        key,
        checksum,
        url: this.getPublicUrl(key),
      };
    } catch (error) {
      Logger.error('File upload failed', { error, key, fileName: file.originalname });
      throw new Error(`File upload failed: ${error}`);
    }
  }

  /**
   * Generate pre-signed URL for file download
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds
   * @param {string} filename - Optional filename for download
   * @returns {Promise<PreSignedUrlResponse>} Pre-signed URL response
   */
  async generateDownloadUrl(
    key: string,
    expiresIn: number = config.security.downloadLinkExpiry,
    filename?: string
  ): Promise<PreSignedUrlResponse> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(filename && {
          ResponseContentDisposition: `attachment; filename="${filename}"`,
        }),
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      Logger.info('Download URL generated', {
        key,
        expiresIn,
        filename,
      });

      return {
        url,
        expiresIn,
      };
    } catch (error) {
      Logger.error('Failed to generate download URL', { error, key });
      throw new Error(`Failed to generate download URL: ${error}`);
    }
  }

  /**
   * Generate pre-signed URL for file upload
   * @param {string} key - S3 object key
   * @param {string} contentType - File content type
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<PreSignedUrlResponse>} Pre-signed URL response
   */
  async generateUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<PreSignedUrlResponse> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      Logger.info('Upload URL generated', {
        key,
        contentType,
        expiresIn,
      });

      return {
        url,
        expiresIn,
      };
    } catch (error) {
      Logger.error('Failed to generate upload URL', { error, key });
      throw new Error(`Failed to generate upload URL: ${error}`);
    }
  }

  /**
   * Delete file from S3-compatible storage
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} True if file was deleted
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      Logger.info('File deleted successfully', { key });
      return true;
    } catch (error) {
      Logger.error('File deletion failed', { error, key });
      return false;
    }
  }

  /**
   * Check if file exists in storage
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param {string} key - S3 object key
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata || {},
      };
    } catch (error) {
      Logger.error('Failed to get file metadata', { error, key });
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * Copy file within storage
   * @param {string} sourceKey - Source object key
   * @param {string} destinationKey - Destination object key
   * @returns {Promise<boolean>} True if file was copied
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      // Note: This would require implementing CopyObjectCommand
      // For now, we'll download and re-upload
      Logger.warn('File copy operation not fully implemented', {
        sourceKey,
        destinationKey,
      });
      return false;
    } catch (error) {
      Logger.error('File copy failed', { error, sourceKey, destinationKey });
      return false;
    }
  }

  /**
   * Generate unique file key based on user ID and filename
   * @param {string} userId - User unique identifier
   * @param {string} filename - Original filename
   * @param {string} documentId - Document unique identifier
   * @returns {string} Unique S3 object key
   */
  generateFileKey(userId: string, filename: string, documentId: string): string {
    const timestamp = Date.now();
    const extension = filename.split('.').pop() || '';
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const sanitizedName = this.sanitizeFilename(baseName);
    
    return `documents/${userId}/${documentId}/${timestamp}_${sanitizedName}.${extension}`;
  }

  /**
   * Generate version-specific file key
   * @param {string} baseKey - Base file key
   * @param {number} version - Version number
   * @returns {string} Version-specific S3 object key
   */
  generateVersionKey(baseKey: string, version: number): string {
    const parts = baseKey.split('/');
    const filename = parts.pop() || '';
    const [name, extension] = filename.split('.');
    
    return `${parts.join('/')}/versions/${name}_v${version}.${extension}`;
  }

  // Private helper methods

  /**
   * Calculate SHA-256 checksum of file buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} SHA-256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Format tags for S3 upload
   * @param {Record<string, string>} tags - Tags object
   * @returns {string} Formatted tags string
   */
  private formatTags(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Get public URL for S3 object (if public access is enabled)
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  private getPublicUrl(key: string): string {
    if (config.aws.s3.endpoint) {
      // For local MinIO setup
      return `${config.aws.s3.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
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
}
