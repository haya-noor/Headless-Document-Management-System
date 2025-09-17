/**
 * Document controller
 * Handles document business logic
 */

import { DocumentService } from '../services/document.service';
import { DocumentRepository } from '../repositories/implementations/document.repository';
import { DocumentVersionRepository } from '../repositories/implementations/document-version.repository';
import { DocumentPermissionRepository } from '../repositories/implementations/document-permission.repository';
import { AuditLogRepository } from '../repositories/implementations/audit-log.repository';
import { ApiResponse } from '../types';
import { Logger } from '../middleware/logging';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export interface DocumentUploadRequest {
  file: File;
  tags?: string[];
  metadata?: Record<string, any>;
  description?: string;
}

export interface DocumentUpdateRequest {
  filename?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  description?: string;
}

export interface DocumentSearchRequest {
  query?: string;
  tags?: string[];
  mimeType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  dateFrom?: string;
  dateTo?: string;
  uploadedBy?: string;
  minSize?: number;
  maxSize?: number;
}

export interface DocumentPermissionRequest {
  userId: string;
  permission: string;
}

export interface DownloadLinkRequest {
  expiresIn?: number;
  filename?: string;
}

/**
 * Document controller class
 * Handles all document management operations
 */
export class DocumentController {
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
   */
  async uploadDocument(user: AuthenticatedRequest, uploadData: DocumentUploadRequest): Promise<ApiResponse> {
    try {
      // Validate file upload
      if (!uploadData.file) {
        return {
          success: false,
          message: 'File is required',
          error: 'FILE_REQUIRED',
        };
      }

      const result = await this.documentService.uploadDocument(
        uploadData.file,
        { 
          tags: uploadData.tags, 
          metadata: uploadData.metadata, 
          description: uploadData.description 
        },
        user.userId
      );

      return result;
    } catch (error) {
      Logger.error('Failed to upload document', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(user: AuthenticatedRequest, documentId: string): Promise<ApiResponse> {
    try {
      const result = await this.documentService.getDocument(documentId, user.userId);
      return result;
    } catch (error) {
      Logger.error('Failed to get document', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Search documents with filters
   */
  async searchDocuments(user: AuthenticatedRequest, searchData: DocumentSearchRequest): Promise<ApiResponse> {
    try {
      const { page, limit, sortBy, sortOrder, dateFrom, dateTo, ...filters } = searchData;

      // Convert string dates to Date objects
      const searchFilters = {
        ...filters,
        sortBy,
        sortOrder,
        ...(dateFrom && { dateFrom: new Date(dateFrom) }),
        ...(dateTo && { dateTo: new Date(dateTo) }),
      };

      const result = await this.documentService.searchDocuments(
        searchFilters,
        { page: page || 1, limit: limit || 10 },
        user.userId
      );

      return result;
    } catch (error) {
      Logger.error('Failed to search documents', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(user: AuthenticatedRequest, documentId: string, updateData: DocumentUpdateRequest): Promise<ApiResponse> {
    try {
      const result = await this.documentService.updateDocument(documentId, updateData, user.userId);
      return result;
    } catch (error) {
      Logger.error('Failed to update document', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(user: AuthenticatedRequest, documentId: string): Promise<ApiResponse> {
    try {
      const result = await this.documentService.deleteDocument(documentId, user.userId);
      return result;
    } catch (error) {
      Logger.error('Failed to delete document', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Generate download link for document
   */
  async generateDownloadLink(user: AuthenticatedRequest, documentId: string, linkData: DownloadLinkRequest): Promise<ApiResponse> {
    try {
      const result = await this.documentService.generateDownloadLink(
        documentId,
        user.userId,
        { 
          expiresIn: linkData.expiresIn, 
          filename: linkData.filename 
        }
      );

      return result;
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
   * Update document permissions
   */
  async updateDocumentPermissions(user: AuthenticatedRequest, documentId: string, permissions: DocumentPermissionRequest[]): Promise<ApiResponse> {
    try {
      const result = await this.documentService.updateDocumentPermissions(
        documentId,
        permissions,
        user.userId
      );

      return result;
    } catch (error) {
      Logger.error('Failed to update document permissions', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Update document metadata only
   */
  async updateDocumentMetadata(user: AuthenticatedRequest, documentId: string, metadata: Record<string, any>): Promise<ApiResponse> {
    try {
      const result = await this.documentService.updateDocument(documentId, { metadata }, user.userId);
      return result;
    } catch (error) {
      Logger.error('Failed to update document metadata', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Update document tags only
   */
  async updateDocumentTags(user: AuthenticatedRequest, documentId: string, tags: string[]): Promise<ApiResponse> {
    try {
      const result = await this.documentService.updateDocument(documentId, { tags }, user.userId);
      return result;
    } catch (error) {
      Logger.error('Failed to update document tags', { error });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }
}
