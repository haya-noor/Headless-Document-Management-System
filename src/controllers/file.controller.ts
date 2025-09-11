/**
 * File controller
 * Handles file-related HTTP requests for local storage operations
 */

import { Request, Response } from 'express';
import { storageService } from '../services/storage.factory';
import { asyncHandler } from '../middleware/error';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { Logger } from '../middleware/logging';

/**
 * File controller class
 * Handles file serving and download operations for local storage
 */
export class FileController {
  /**
   * Serve file from local storage
   * GET /api/v1/files/:key
   */
  serveFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    try {
      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        });
        return;
      }

      // Get file metadata
      const metadata = await storageService.getFileMetadata(decodedKey);
      
      // Read file
      const fileBuffer = await storageService.readFile(decodedKey);

      // Set appropriate headers
      res.setHeader('Content-Type', metadata.contentType);
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Last-Modified', metadata.lastModified.toUTCString());
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      // Send file
      res.send(fileBuffer);

      Logger.info('File served successfully', {
        key: decodedKey,
        size: metadata.size,
        contentType: metadata.contentType,
      });
    } catch (error) {
      Logger.error('Failed to serve file', { error, key: decodedKey });
      res.status(500).json({
        success: false,
        message: 'Failed to serve file',
        error: 'FILE_SERVE_ERROR',
      });
    }
  });

  /**
   * Download file with custom filename
   * GET /api/v1/files/download/:key?filename=custom.pdf
   */
  downloadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const { filename } = req.query;
    const decodedKey = decodeURIComponent(key);

    try {
      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        });
        return;
      }

      // Get file metadata
      const metadata = await storageService.getFileMetadata(decodedKey);
      
      // Read file
      const fileBuffer = await storageService.readFile(decodedKey);

      // Determine download filename
      const downloadFilename = filename as string || decodedKey.split('/').pop() || 'download';

      // Set headers for download
      res.setHeader('Content-Type', metadata.contentType);
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('Last-Modified', metadata.lastModified.toUTCString());

      // Send file
      res.send(fileBuffer);

      Logger.info('File downloaded successfully', {
        key: decodedKey,
        filename: downloadFilename,
        size: metadata.size,
        contentType: metadata.contentType,
      });
    } catch (error) {
      Logger.error('Failed to download file', { error, key: decodedKey });
      res.status(500).json({
        success: false,
        message: 'Failed to download file',
        error: 'FILE_DOWNLOAD_ERROR',
      });
    }
  });

  /**
   * Get file information
   * GET /api/v1/files/:key/info
   */
  getFileInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    try {
      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        });
        return;
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

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get file info', { error, key: decodedKey });
      res.status(500).json({
        success: false,
        message: 'Failed to get file information',
        error: 'FILE_INFO_ERROR',
      });
    }
  });

  /**
   * Delete file (admin only)
   * DELETE /api/v1/files/:key
   */
  deleteFile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    try {
      // Check if file exists
      const exists = await storageService.fileExists(decodedKey);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: 'File not found',
          error: 'FILE_NOT_FOUND',
        });
        return;
      }

      // Delete file
      const success = await storageService.deleteFile(decodedKey);

      if (!success) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete file',
          error: 'FILE_DELETE_ERROR',
        });
        return;
      }

      Logger.info('File deleted successfully', {
        key: decodedKey,
        deletedBy: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'File deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete file', { error, key: decodedKey });
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: 'FILE_DELETE_ERROR',
      });
    }
  });
}

// Create controller instance
const fileController = new FileController();

// Export controller methods
export const fileRoutes = {
  serveFile: fileController.serveFile,
  downloadFile: fileController.downloadFile,
  getFileInfo: fileController.getFileInfo,
  deleteFile: fileController.deleteFile,
};
