/**
 * Document controller for Elysia
 * Handles document-related HTTP requests with comprehensive functionality
 */

import { Elysia, t } from 'elysia';
import { DocumentService } from '../services/document.service';
import { DocumentRepository } from '../repositories/implementations/document.repository';
import { DocumentVersionRepository } from '../repositories/implementations/document-version.repository';
import { DocumentPermissionRepository } from '../repositories/implementations/document-permission.repository';
import { AuditLogRepository } from '../repositories/implementations/audit-log.repository';
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
import { ApiResponse } from '../types';
import { Logger } from '../middleware/logging';
import { verifyToken } from '../utils/jwt';

/**
 * Document controller class for Elysia
 * Handles all document management operations
 */
export class DocumentControllerElysia {
  private documentService: DocumentService;

  constructor() {
    // Initialize service with repository implementations
    const documentRepo = new DocumentRepository();
    const versionRepo = new DocumentVersionRepository();
    const permissionRepo = new DocumentPermissionRepository();
    const auditRepo = new AuditLogRepository();
    
    this.documentService = new DocumentService(
      documentRepo,
      versionRepo,
      permissionRepo,
      auditRepo
    );
  }

  /**
   * Upload a new document
   * POST /api/v1/documents
   */
  uploadDocument = async ({ body, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate file upload
      if (!body.file) {
        set.status = 400;
        return {
          success: false,
          message: 'File is required',
          error: 'FILE_REQUIRED',
        };
      }

      // Parse and validate request body
      const validationResult = DocumentUploadSchema.safeParse(body);
      if (!validationResult.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
          details: validationResult.error.errors,
        };
      }

      const { file, tags, metadata, description } = validationResult.data;

      // Upload document
      const result = await this.documentService.uploadDocument(
        file,
        { tags, metadata, description },
        payload.userId
      );

      set.status = result.success ? 201 : 400;
      return result;
    } catch (error) {
      Logger.error('Failed to upload document', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Get document by ID
   * GET /api/v1/documents/:id
   */
  getDocument = async ({ params, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate UUID parameter
      const paramValidation = UUIDParamSchema.safeParse(params);
      if (!paramValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid document ID',
          error: 'INVALID_ID',
        };
      }

      const { id } = paramValidation.data;
      const result = await this.documentService.getDocument(id, payload.userId);

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to get document', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Search documents with filters
   * GET /api/v1/documents
   */
  searchDocuments = async ({ query, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate search parameters
      const searchValidation = DocumentSearchSchema.safeParse(query);
      if (!searchValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid search parameters',
          error: 'VALIDATION_ERROR',
          details: searchValidation.error.errors,
        };
      }

      const { page, limit, sortBy, sortOrder, ...filters } = searchValidation.data;

      const result = await this.documentService.searchDocuments(
        { ...filters, sortBy, sortOrder },
        { page, limit },
        payload.userId
      );

      set.status = 200;
      return result;
    } catch (error) {
      Logger.error('Failed to search documents', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Update document metadata
   * PUT /api/v1/documents/:id
   */
  updateDocument = async ({ params, body, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate parameters and body
      const paramValidation = UUIDParamSchema.safeParse(params);
      const bodyValidation = DocumentUpdateSchema.safeParse(body);

      if (!paramValidation.success || !bodyValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
        };
      }

      const { id } = paramValidation.data;
      const updateData = bodyValidation.data;

      const result = await this.documentService.updateDocument(id, updateData, payload.userId);

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to update document', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Delete document
   * DELETE /api/v1/documents/:id
   */
  deleteDocument = async ({ params, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate UUID parameter
      const paramValidation = UUIDParamSchema.safeParse(params);
      if (!paramValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid document ID',
          error: 'INVALID_ID',
        };
      }

      const { id } = paramValidation.data;
      const result = await this.documentService.deleteDocument(id, payload.userId);

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to delete document', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Generate download link for document
   * POST /api/v1/documents/:id/download
   */
  generateDownloadLink = async ({ params, body, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate parameters and body
      const paramValidation = UUIDParamSchema.safeParse(params);
      const bodyValidation = DownloadLinkSchema.safeParse(body || {});

      if (!paramValidation.success || !bodyValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
        };
      }

      const { id } = paramValidation.data;
      const { expiresIn, filename } = bodyValidation.data;

      const result = await this.documentService.generateDownloadLink(
        id,
        payload.userId,
        { expiresIn, filename }
      );

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to generate download link', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Update document permissions
   * PUT /api/v1/documents/:id/permissions
   */
  updateDocumentPermissions = async ({ params, body, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate parameters and body
      const paramValidation = UUIDParamSchema.safeParse(params);
      const bodyValidation = DocumentPermissionsSchema.safeParse(body);

      if (!paramValidation.success || !bodyValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
        };
      }

      const { id } = paramValidation.data;
      const { permissions } = bodyValidation.data;

      const result = await this.documentService.updateDocumentPermissions(
        id,
        permissions,
        payload.userId
      );

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to update document permissions', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Update document metadata only
   * PUT /api/v1/documents/:id/metadata
   */
  updateDocumentMetadata = async ({ params, body, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate parameters and body
      const paramValidation = UUIDParamSchema.safeParse(params);
      const bodyValidation = DocumentMetadataSchema.safeParse(body);

      if (!paramValidation.success || !bodyValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
        };
      }

      const { id } = paramValidation.data;
      const { metadata } = bodyValidation.data;

      const result = await this.documentService.updateDocument(id, { metadata }, payload.userId);

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to update document metadata', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };

  /**
   * Update document tags only
   * PUT /api/v1/documents/:id/tags
   */
  updateDocumentTags = async ({ params, body, headers, set }: any) => {
    try {
      // Extract and verify JWT token
      const token = headers.authorization?.replace('Bearer ', '');
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyToken(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Validate parameters and body
      const paramValidation = UUIDParamSchema.safeParse(params);
      const bodyValidation = DocumentTagsSchema.safeParse(body);

      if (!paramValidation.success || !bodyValidation.success) {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
        };
      }

      const { id } = paramValidation.data;
      const { tags } = bodyValidation.data;

      const result = await this.documentService.updateDocument(id, { tags }, payload.userId);

      set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
      return result;
    } catch (error) {
      Logger.error('Failed to update document tags', { error });
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  };
}

// Create controller instance
const documentController = new DocumentControllerElysia();

// Export controller routes with validation
export const documentRoutes = {
  uploadDocument: (app: Elysia) => app
    .post('/', documentController.uploadDocument, {
      body: t.Object({
        file: t.File(),
        tags: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        description: t.Optional(t.String()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Upload document',
        description: 'Upload a new document with metadata',
      },
    }),

  getDocument: (app: Elysia) => app
    .get('/:id', documentController.getDocument, {
      params: t.Object({
        id: t.String(),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Get document',
        description: 'Get document by ID',
      },
    }),

  searchDocuments: (app: Elysia) => app
    .get('/', documentController.searchDocuments, {
      query: t.Object({
        query: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        mimeType: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Search documents',
        description: 'Search documents with advanced filters',
      },
    }),

  updateDocument: (app: Elysia) => app
    .put('/:id', documentController.updateDocument, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        filename: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        description: t.Optional(t.String()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document',
        description: 'Update document metadata',
      },
    }),

  deleteDocument: (app: Elysia) => app
    .delete('/:id', documentController.deleteDocument, {
      params: t.Object({
        id: t.String(),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Delete document',
        description: 'Delete document by ID',
      },
    }),

  generateDownloadLink: (app: Elysia) => app
    .post('/:id/download', documentController.generateDownloadLink, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        expiresIn: t.Optional(t.Number()),
        filename: t.Optional(t.String()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Generate download link',
        description: 'Generate short-lived download link for document',
      },
    }),

  updatePermissions: (app: Elysia) => app
    .put('/:id/permissions', documentController.updateDocumentPermissions, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        permissions: t.Array(t.Object({
          userId: t.String(),
          permission: t.String(),
        })),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document permissions',
        description: 'Update document access permissions',
      },
    }),

  updateMetadata: (app: Elysia) => app
    .put('/:id/metadata', documentController.updateDocumentMetadata, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        metadata: t.Record(t.String(), t.Any()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document metadata',
        description: 'Update document metadata only',
      },
    }),

  updateTags: (app: Elysia) => app
    .put('/:id/tags', documentController.updateDocumentTags, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        tags: t.Array(t.String()),
      }),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: {
        tags: ['Documents'],
        summary: 'Update document tags',
        description: 'Update document tags only',
      },
    }),
};
