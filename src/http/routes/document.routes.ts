/**
 * Document routes
 * Defines document-related HTTP endpoints
 */

import { Elysia, t } from 'elysia';
import { documentService } from '../../services';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
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
} from '../../schemas/document.schemas';

export const documentRoutes = {
  /**
   * Upload a new document
   * POST /api/v1/documents
   */
  uploadDocument: (app: Elysia) => app
    .post('/', async ({ body, set, headers }) => {
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      // validate with DocumentUploadSchema, using elysia (elysia uses the t type)
      const result = await documentService.uploadDocumentWithValidation(body.file, body, user.userId);
      
      set.status = result.success ? 201 : 400;
      return result;
    }, {
      // validate with DocumentUploadSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
      const { id } = params as any;
      // validate with DocumentIdParamSchema, using elysia (elysia uses the t type)
      const result = await documentService.getDocument(id, user.userId);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const result = await documentService.searchDocumentsWithTransforms(query as any, user.userId);
      
      set.status = 200;
      return result;
    }, {
      // validate with DocumentSearchSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const { id } = params as any;
      const result = await documentService.updateDocument(id, body, user.userId);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const { id } = params as any;
      const result = await documentService.deleteDocument(id, user.userId);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const { id } = params as any;
      const result = await documentService.generateDownloadLink(id, user.userId, body);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
      params: t.Object({
        id: t.String(),
      }),
      // validate with DownloadLinkSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const { id } = params as any;
      const { permissions } = body as any;
      const result = await documentService.updateDocumentPermissions(id, permissions, user.userId);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
      params: t.Object({
        id: t.String(),
      }),
      // validate with DocumentPermissionsSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const { id } = params as any;
      const { metadata } = body as any;
      const result = await documentService.updateDocumentMetadata(id, user.userId, metadata);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
      params: t.Object({
        id: t.String(),
      }),
      // validate with DocumentMetadataSchema, using elysia (elysia uses the t type)
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
      const user = getAuthenticatedUser(headers);
      if (!user) {
        set.status = 401;
        return createUnauthorizedResponse();
      }
      
      const { id } = params as any;
      const { tags } = body as any;
      const result = await documentService.updateDocumentTags(id, user.userId, tags);
      
      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    }, {
      // validate with UUIDParamSchema, using elysia (elysia uses the t type)
      params: t.Object({
        id: t.String(),
      }),
      // validate with DocumentTagsSchema, using elysia (elysia uses the t type)
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
