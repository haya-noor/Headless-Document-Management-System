/**
 * File routes
 * Defines file-related HTTP endpoints
 */

import { Elysia, t } from 'elysia';
import { FileController } from '../controllers/file.controller';
import { createAuthMiddleware, verifyAuthToken } from '../middleware/auth.middleware';

const fileController = new FileController();
const authMiddleware = createAuthMiddleware();

export const fileRoutes = {
  /**
   * Serve file from storage
   * GET /api/v1/files/:key
   */
  serveFile: (app: Elysia) => app
    .get('/:key', async ({ params, set }) => {
      const { key } = params as any;
      const result = await fileController.serveFile(key);
      
      if (!result.success) {
        set.status = result.error === 'FILE_NOT_FOUND' ? 404 : 500;
        return {
          success: false,
          message: result.error === 'FILE_NOT_FOUND' ? 'File not found' : 'Internal server error',
          error: result.error,
        };
      }

      // Set appropriate headers
      set.headers = {
        'Content-Type': result.metadata!.contentType,
        'Content-Length': result.metadata!.size.toString(),
        'Last-Modified': result.metadata!.lastModified.toUTCString(),
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
        ...(result.metadata!.etag && { 'ETag': result.metadata!.etag }),
      };

      // Return file buffer
      return new Response(result.data, {
        headers: {
          'Content-Type': result.metadata!.contentType,
          'Content-Length': result.metadata!.size.toString(),
          'Last-Modified': result.metadata!.lastModified.toUTCString(),
          'Cache-Control': 'public, max-age=3600',
          ...(result.metadata!.etag && { 'ETag': result.metadata!.etag }),
        },
      });
    }, {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Serve file',
        description: 'Serve file from storage by key',
      },
    }),

  /**
   * Upload file to storage
   * POST /api/v1/files/upload
   */
  uploadFile: (app: Elysia) => app
    .post('/upload', async ({ body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const result = await fileController.uploadFile(user, body);
      
      if (result.success) {
        set.status = 201;
      } else {
        set.status = 400;
      }
      
      return result;
    }, {
      body: t.Object({
        file: t.File(),
        key: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Upload file',
        description: 'Upload file to storage',
      },
    }),

  /**
   * Generate download link for file
   * POST /api/v1/files/download
   */
  generateDownloadLink: (app: Elysia) => app
    .post('/download', async ({ body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const result = await fileController.generateDownloadLink(user, body);
      
      set.status = result.success ? 200 : 400;
      return result;
    }, {
      body: t.Object({
        key: t.String(),
        expiresIn: t.Optional(t.Number()),
        filename: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Generate download link',
        description: 'Generate download link for file',
      },
    }),

  /**
   * Delete file from storage
   * DELETE /api/v1/files/:key
   */
  deleteFile: (app: Elysia) => app
    .delete('/:key', async ({ params, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { key } = params as any;
      const result = await fileController.deleteFile(user, key);
      
      set.status = result.success ? 200 : 400;
      return result;
    }, {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Delete file',
        description: 'Delete file from storage',
      },
    }),

  /**
   * Get file metadata
   * GET /api/v1/files/:key/metadata
   */
  getFileMetadata: (app: Elysia) => app
    .get('/:key/metadata', async ({ params, set }) => {
      const { key } = params as any;
      const result = await fileController.getFileMetadata(key);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'FILE_NOT_FOUND' ? 404 : 500;
      }
      
      return result;
    }, {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Get file metadata',
        description: 'Get file metadata by key',
      },
    }),

  /**
   * List files in directory
   * GET /api/v1/files
   */
  listFiles: (app: Elysia) => app
    .get('/', async ({ query, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { prefix, limit } = query as any;
      const result = await fileController.listFiles(user, prefix, limit ? parseInt(limit) : undefined);
      
      set.status = result.success ? 200 : 500;
      return result;
    }, {
      query: t.Object({
        prefix: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Files'],
        summary: 'List files',
        description: 'List files in directory',
      },
    }),

  /**
   * Download file directly
   * GET /api/v1/files/download/:key
   */
  downloadFile: (app: Elysia) => app
    .get('/download/:key', async ({ params, set, query }) => {
      const { key } = params as any;
      const { filename } = query as any;
      
      const result = await fileController.serveFile(key);
      
      if (!result.success) {
        set.status = result.error === 'FILE_NOT_FOUND' ? 404 : 500;
        return {
          success: false,
          message: result.error === 'FILE_NOT_FOUND' ? 'File not found' : 'Internal server error',
          error: result.error,
        };
      }

      // Set appropriate headers for download
      const downloadFilename = filename || key.split('/').pop() || 'download';
      set.headers = {
        'Content-Type': result.metadata!.contentType,
        'Content-Length': result.metadata!.size.toString(),
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Last-Modified': result.metadata!.lastModified.toUTCString(),
        'Cache-Control': 'public, max-age=3600',
        ...(result.metadata!.etag && { 'ETag': result.metadata!.etag }),
      };

      // Return file buffer
      return new Response(result.data, {
        headers: {
          'Content-Type': result.metadata!.contentType,
          'Content-Length': result.metadata!.size.toString(),
          'Content-Disposition': `attachment; filename="${downloadFilename}"`,
          'Last-Modified': result.metadata!.lastModified.toUTCString(),
          'Cache-Control': 'public, max-age=3600',
          ...(result.metadata!.etag && { 'ETag': result.metadata!.etag }),
        },
      });
    }, {
      params: t.Object({
        key: t.String(),
      }),
      query: t.Object({
        filename: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Download file',
        description: 'Download file directly by key',
      },
    }),

  /**
   * Get file information
   * GET /api/v1/files/info/:key
   */
  getFileInfo: (app: Elysia) => app
    .get('/info/:key', async ({ params, set }) => {
      const { key } = params as any;
      const result = await fileController.getFileMetadata(key);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'FILE_NOT_FOUND' ? 404 : 500;
      }
      
      return result;
    }, {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ['Files'],
        summary: 'Get file info',
        description: 'Get file information by key',
      },
    }),
};
