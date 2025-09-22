/**
 * File service layer
 * Implements business logic for file operations (Enhanced from FileController)
 */

import { storageService } from './storage.factory';
import { ApiResponse } from '../types';
import { Logger } from '../http/middleware/logging';

export interface FileMetadata {
  contentType: string;
  size: number;
  lastModified: Date;
  etag?: string;
}

export interface FileUploadRequest {
  file: File;
  key?: string;
  metadata?: Record<string, any>;
}

export interface FileDownloadRequest {
  key: string;
  expiresIn?: number;
  filename?: string;
}

/**
 * File service class
 * Handles file serving and download operations (Enhanced from controller)
 */
export class FileService {
  /**
   * Serve file from storage with validation (Enhanced from controller)
   */
  async serveFileWithValidation(key: string): Promise<{ 
    success: boolean; 
    data?: Buffer; 
    metadata?: FileMetadata; 
    error?: string 
  }> {
    try {
      const decodedKey = decodeURIComponent(key);

      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        return {
          success: false,
          error: 'FILE_NOT_FOUND',
        };
      }

      // Get file metadata
      const metadata = await storageService.getFileMetadata(decodedKey);
      
      // Read file
      const fileBuffer = await storageService.readFile(decodedKey);

      return {
        success: true,
        data: fileBuffer,
        metadata: {
          contentType: metadata.contentType,
          size: metadata.size,
          lastModified: metadata.lastModified,
          etag: (metadata as any).etag,
        },
      };
    } catch (error) {
      Logger.error('Failed to serve file', { error, key });
      return {
        success: false,
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Upload file to storage with validation (Enhanced from controller)
   */
  async uploadFileWithValidation(
    userId: string,
    uploadData: FileUploadRequest
  ): Promise<ApiResponse> {
    try {
      const { file, key, metadata } = uploadData;
      
      // Validation
      if (!file) {
        return {
          success: false,
          message: 'File is required',
          error: 'FILE_REQUIRED',
        };
      }
      
      // Generate key if not provided
      const fileKey = key || `uploads/${userId}/${Date.now()}-${file.name}`;
      
      // Convert File to FileUpload format
      const fileBuffer = await file.arrayBuffer();
      const fileUpload = {
        buffer: Buffer.from(fileBuffer),
        filename: file.name,
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
      };

      // Upload file
      const result = await storageService.uploadFile(fileUpload, fileKey, metadata);
      
      if (result.key) {
        return {
          success: true,
          message: 'File uploaded successfully',
          data: {
            key: result.key,
            url: `/api/v1/files/${encodeURIComponent(result.key)}`,
            size: file.size,
            contentType: file.type,
            checksum: result.checksum,
          },
        };
      } else {
        return {
          success: false,
          message: 'Failed to upload file',
          error: 'UPLOAD_FAILED',
        };
      }
    } catch (error) {
      Logger.error('Failed to upload file', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Generate download link for file with validation (Enhanced from controller)
   */
  async generateDownloadLinkWithValidation(
    userId: string,
    downloadData: FileDownloadRequest
  ): Promise<ApiResponse> {
    try {
      const { key, expiresIn = 3600, filename } = downloadData;
      
      // Check if file exists
      const exists = await storageService.fileExists(key);
      if (!exists) {
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Generate download URL
      const { url, expiresAt } = await storageService.generateDownloadUrl(
        key,
        expiresIn,
        filename
      );

      return {
        success: true,
        message: 'Download link generated successfully',
        data: {
          downloadUrl: url,
          expiresAt,
          expiresIn,
        },
      };
    } catch (error) {
      Logger.error('Failed to generate download link', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Delete file from storage with validation (Enhanced from controller)
   */
  async deleteFileWithValidation(userId: string, key: string): Promise<ApiResponse> {
    try {
      // Check if file exists
      const exists = await storageService.fileExists(key);
      if (!exists) {
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Delete file
      const result = await storageService.deleteFile(key);
      
      if (result) {
        Logger.info('File deleted successfully', { key, userId });
        return {
          success: true,
          message: 'File deleted successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete file',
          error: 'DELETE_FAILED',
        };
      }
    } catch (error) {
      Logger.error('Failed to delete file', { error, key, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Get file metadata with validation (Enhanced from controller)
   */
  async getFileMetadataWithValidation(key: string): Promise<ApiResponse<FileMetadata>> {
    try {
      // Check if file exists
      const exists = await storageService.fileExists(key);
      if (!exists) {
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Get metadata
      const metadata = await storageService.getFileMetadata(key);

      return {
        success: true,
        message: 'File metadata retrieved successfully',
        data: {
          contentType: metadata.contentType,
          size: metadata.size,
          lastModified: metadata.lastModified,
          etag: (metadata as any).etag,
        },
      };
    } catch (error) {
      Logger.error('Failed to get file metadata', { error, key });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * List files in directory with validation (Enhanced from controller)
   */
  async listFilesWithValidation(
    userId: string,
    prefix?: string,
    limit?: number
  ): Promise<ApiResponse> {
    try {
      // Apply user-specific prefix if not provided
      const searchPrefix = prefix || `uploads/${userId}/`;
      
      const files = await storageService.listFiles(searchPrefix, limit);

      return {
        success: true,
        message: 'Files listed successfully',
        data: {
          files,
          prefix: searchPrefix,
          limit,
        },
      };
    } catch (error) {
      Logger.error('Failed to list files', { error, userId, prefix });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }
}
