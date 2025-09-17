/**
 * File controller
 * Handles file business logic
 */

import { storageService } from '../services/storage.factory';
import { ApiResponse } from '../types';
import { Logger } from '../middleware/logging';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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
 * File controller class
 * Handles file serving and download operations
 */
export class FileController {
  /**
   * Serve file from storage
   */
  async serveFile(key: string): Promise<{ success: boolean; data?: Buffer; metadata?: FileMetadata; error?: string }> {
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
          etag: metadata.etag,
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
   * Upload file to storage
   */
  async uploadFile(user: AuthenticatedRequest, uploadData: FileUploadRequest): Promise<ApiResponse> {
    try {
      const { file, key, metadata } = uploadData;
      
      // Generate key if not provided
      const fileKey = key || `uploads/${user.userId}/${Date.now()}-${file.name}`;
      
      // Upload file
      const result = await storageService.uploadFile(file, fileKey, metadata);
      
      if (result.success) {
        return {
          success: true,
          message: 'File uploaded successfully',
          data: {
            key: fileKey,
            url: `/api/v1/files/${encodeURIComponent(fileKey)}`,
            size: file.size,
            contentType: file.type,
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
      Logger.error('Failed to upload file', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Generate download link for file
   */
  async generateDownloadLink(user: AuthenticatedRequest, downloadData: FileDownloadRequest): Promise<ApiResponse> {
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

      // Generate signed URL (for local storage, we'll return a direct URL)
      const downloadUrl = `/api/v1/files/${encodeURIComponent(key)}`;
      
      return {
        success: true,
        message: 'Download link generated',
        data: {
          url: downloadUrl,
          expiresIn,
          filename: filename || key.split('/').pop(),
        },
      };
    } catch (error) {
      Logger.error('Failed to generate download link', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(user: AuthenticatedRequest, key: string): Promise<ApiResponse> {
    try {
      const result = await storageService.deleteFile(key);
      
      if (result.success) {
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
      Logger.error('Failed to delete file', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<ApiResponse> {
    try {
      const exists = await storageService.fileExists(key);
      if (!exists) {
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      const metadata = await storageService.getFileMetadata(key);
      
      return {
        success: true,
        data: {
          key,
          contentType: metadata.contentType,
          size: metadata.size,
          lastModified: metadata.lastModified,
          etag: metadata.etag,
        },
      };
    } catch (error) {
      Logger.error('Failed to get file metadata', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * List files in directory
   */
  async listFiles(user: AuthenticatedRequest, prefix?: string, limit?: number): Promise<ApiResponse> {
    try {
      const searchPrefix = prefix || `uploads/${user.userId}/`;
      const result = await storageService.listFiles(searchPrefix, limit);
      
      if (result.success) {
        return {
          success: true,
          data: result.files?.map(file => ({
            key: file.key,
            url: `/api/v1/files/${encodeURIComponent(file.key)}`,
            size: file.size,
            contentType: file.contentType,
            lastModified: file.lastModified,
          })) || [],
        };
      } else {
        return {
          success: false,
          message: 'Failed to list files',
          error: 'LIST_FAILED',
        };
      }
    } catch (error) {
      Logger.error('Failed to list files', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }
}
