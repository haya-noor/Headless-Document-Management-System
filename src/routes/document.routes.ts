/**
 * Document routes
 * Defines document-related HTTP endpoints
 */

import { Elysia, t } from 'elysia';
import { DocumentController } from '../controllers/document.controller';
import { createAuthMiddleware, verifyAuthToken } from '../middleware/auth.middleware';
import { 
  DocumentUploadSchema,
  DocumentUpdateSchema,
  DocumentSearchSchema,
  DocumentPermissionSchema,
  DocumentPermissionsSchema,
  DownloadLinkSchema,
  DocumentMetadataSchema,
  DocumentTagsSchema,
  UUIDParamSchema
} from '../schemas/document.schemas';

const documentController = new DocumentController();
const authMiddleware = createAuthMiddleware();

export const documentRoutes = {
  /**
   * Upload a new document
   * POST /api/v1/documents
   */
  uploadDocument: (app: Elysia) => app
    .post('/', async ({ body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const result = await documentController.uploadDocument(user, body);
      
      if (result.success) {
        set.status = 201;
      } else {
        set.status = 400;
      }
      
      return result;
    }, {
      body: t.Object({
        file: t.File(),
        tags: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        description: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Upload document',
        description: 'Upload a new document with metadata',
      },
    }),

  /**
   * Get document by ID
   * GET /api/v1/documents/:id
   */
  getDocument: (app: Elysia) => app
    .get('/:id', async ({ params, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const result = await documentController.getDocument(user, id);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Get document',
        description: 'Get document by ID',
      },
    }),

  /**
   * Search documents with filters
   * GET /api/v1/documents
   */
  searchDocuments: (app: Elysia) => app
    .get('/', async ({ query, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const result = await documentController.searchDocuments(user, query as any);
      
      set.status = 200;
      return result;
    }, {
      query: t.Object({
        query: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        mimeType: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        uploadedBy: t.Optional(t.String()),
        minSize: t.Optional(t.Number()),
        maxSize: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Search documents',
        description: 'Search documents with advanced filters',
      },
    }),

  /**
   * Update document metadata
   * PUT /api/v1/documents/:id
   */
  updateDocument: (app: Elysia) => app
    .put('/:id', async ({ params, body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const result = await documentController.updateDocument(user, id, body);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        filename: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        description: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document',
        description: 'Update document metadata',
      },
    }),

  /**
   * Delete document
   * DELETE /api/v1/documents/:id
   */
  deleteDocument: (app: Elysia) => app
    .delete('/:id', async ({ params, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const result = await documentController.deleteDocument(user, id);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Delete document',
        description: 'Delete document by ID',
      },
    }),

  /**
   * Generate download link for document
   * POST /api/v1/documents/:id/download
   */
  generateDownloadLink: (app: Elysia) => app
    .post('/:id/download', async ({ params, body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const result = await documentController.generateDownloadLink(user, id, body);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        expiresIn: t.Optional(t.Number()),
        filename: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Generate download link',
        description: 'Generate short-lived download link for document',
      },
    }),

  /**
   * Update document permissions
   * PUT /api/v1/documents/:id/permissions
   */
  updatePermissions: (app: Elysia) => app
    .put('/:id/permissions', async ({ params, body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const { permissions } = body as any;
      const result = await documentController.updateDocumentPermissions(user, id, permissions);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        permissions: t.Array(t.Object({
          userId: t.String(),
          permission: t.String(),
        })),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document permissions',
        description: 'Update document access permissions',
      },
    }),

  /**
   * Update document metadata only
   * PUT /api/v1/documents/:id/metadata
   */
  updateMetadata: (app: Elysia) => app
    .put('/:id/metadata', async ({ params, body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const { metadata } = body as any;
      const result = await documentController.updateDocumentMetadata(user, id, metadata);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        metadata: t.Record(t.String(), t.Any()),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document metadata',
        description: 'Update document metadata only',
      },
    }),

  /**
   * Update document tags only
   * PUT /api/v1/documents/:id/tags
   */
  updateTags: (app: Elysia) => app
    .put('/:id/tags', async ({ params, body, set, headers }) => {
      const token = headers.authorization?.replace('Bearer ', '');
      const user = verifyAuthToken(token || '');
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' };
      }
      
      const { id } = params as any;
      const { tags } = body as any;
      const result = await documentController.updateDocumentTags(user, id, tags);
      
      if (result.success) {
        set.status = 200;
      } else {
        set.status = result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403;
      }
      
      return result;
    }, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        tags: t.Array(t.String()),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document tags',
        description: 'Update document tags only',
      },
    }),
};
