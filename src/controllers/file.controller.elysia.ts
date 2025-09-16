/**
 * File controller for Elysia
 * Handles file-related HTTP requests for local storage operations
 */

import { Elysia, t } from 'elysia';
import { storageService } from '../services/storage.factory';
import { ApiResponse } from '../types';
import { Logger } from '../middleware/logging';

/**
 * File controller class for Elysia
 * Handles file serving and download operations for local storage
 */
export class FileControllerElysia {
  /**
   * Serve file from local storage
   * GET /api/v1/files/:key
   */
  serveFile = async ({ params, set }: any) => {
    try {
      const { key } = params;
      const decodedKey = decodeURIComponent(key);

      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        set.status = 404;
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Get file metadata
      const metadata = await storageService.getFileMetadata(decodedKey);
      
      // Read file
      const fileBuffer = await storageService.readFile(decodedKey);

      // Set appropriate headers
      set.headers = {
        'Content-Type': metadata.contentType,
        'Content-Length': metadata.size.toString(),
        'Last-Modified': metadata.lastModified.toUTCString(),
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      };

      // Send file
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': metadata.contentType,
          'Content-Length': metadata.size.toString(),
          'Last-Modified': metadata.lastModified.toUTCString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });

    } catch (error) {
      Logger.error('Failed to serve file', { error, key: params.key });
      set.status = 500;
      return {
        success: false,
        message: 'Failed to serve file',
        error: 'FILE_SERVE_ERROR',
      };
    }
  };

  /**
   * Download file with custom filename
   * GET /api/v1/files/download/:key?filename=custom.pdf
   */
  downloadFile = async ({ params, query, set }: any) => {
    try {
      const { key } = params;
      const { filename } = query;
      const decodedKey = decodeURIComponent(key);

      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        set.status = 404;
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Get file metadata
      const metadata = await storageService.getFileMetadata(decodedKey);
      
      // Read file
      const fileBuffer = await storageService.readFile(decodedKey);

      // Determine download filename
      const downloadFilename = filename || decodedKey.split('/').pop() || 'download';

      // Set headers for download
      set.headers = {
        'Content-Type': metadata.contentType,
        'Content-Length': metadata.size.toString(),
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Last-Modified': metadata.lastModified.toUTCString(),
      };

      // Send file
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': metadata.contentType,
          'Content-Length': metadata.size.toString(),
          'Content-Disposition': `attachment; filename="${downloadFilename}"`,
          'Last-Modified': metadata.lastModified.toUTCString(),
        },
      });

    } catch (error) {
      Logger.error('Failed to download file', { error, key: params.key });
      set.status = 500;
      return {
        success: false,
        message: 'Failed to download file',
        error: 'FILE_DOWNLOAD_ERROR',
      };
    }
  };

  /**
   * Get file information
   * GET /api/v1/files/:key/info
   */
  getFileInfo = async ({ params, set }: any) => {
    try {
      const { key } = params;
      const decodedKey = decodeURIComponent(key);

      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        set.status = 404;
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Get file metadata
      const metadata = await storageService.getFileMetadata(decodedKey);

      const response: ApiResponse = {
        success: true,
        message: 'File information retrieved successfully',
        data: {
          key: decodedKey,
          size: metadata.size,
          contentType: metadata.contentType,
          lastModified: metadata.lastModified,
          metadata: metadata.metadata,
        },
      };

      set.status = 200;
      return response;
    } catch (error) {
      Logger.error('Failed to get file info', { error, key: params.key });
      set.status = 500;
      return {
        success: false,
        message: 'Failed to get file information',
        error: 'FILE_INFO_ERROR',
      };
    }
  };

  /**
   * Delete file (admin only)
   * DELETE /api/v1/files/:key
   */
  deleteFile = async ({ params, set, headers }: any) => {
    try {
      const { key } = params;
      const decodedKey = decodeURIComponent(key);

      // Check authorization (simplified for now)
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        set.status = 404;
        return {
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        };
      }

      // Delete file
      const success = await storageService.deleteFile(decodedKey);

      if (!success) {
        set.status = 500;
        return {
          success: false,
          message: 'Failed to delete file',
          error: 'FILE_DELETE_ERROR',
        };
      }

      Logger.info('File deleted successfully', {
        key: decodedKey,
      });

      const response: ApiResponse = {
        success: true,
        message: 'File deleted successfully',
      };

      set.status = 200;
      return response;
    } catch (error) {
      Logger.error('Failed to delete file', { error, key: params.key });
      set.status = 500;
      return {
        success: false,
        message: 'Failed to delete file',
        error: 'FILE_DELETE_ERROR',
      };
    }
  };
}

// Create controller instance
const fileController = new FileControllerElysia();

// Export controller methods
export const fileRoutes = {
  serveFile: (app: Elysia) => app
    .get('/:key', fileController.serveFile, {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Serve file',
        description: 'Serve a file from storage',
      },
    }),

  downloadFile: (app: Elysia) => app
    .get('/download/:key', fileController.downloadFile, {
      params: t.Object({
        key: t.String(),
      }),
      query: t.Object({
        filename: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Download file',
        description: 'Download a file with custom filename',
      },
    }),

  getFileInfo: (app: Elysia) => app
    .get('/:key/info', fileController.getFileInfo, {
      params: t.Object({
        key: t.String(),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Get file info',
        description: 'Get file metadata and information',
      },
    }),

  deleteFile: (app: Elysia) => app
    .delete('/:key', fileController.deleteFile, {
      params: t.Object({
        key: t.String(),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Delete file',
        description: 'Delete a file from storage (admin only)',
      },
    }),
};
