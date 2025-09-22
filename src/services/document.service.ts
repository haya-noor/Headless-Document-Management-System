/**
 * Document service layer
 * Implements business logic for document management operations
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Document, DocumentSearchFilters, PaginationParams, PaginatedResponse, ApiResponse, AuditAction, Permission } from '../types';
import { IDocumentRepository, CreateDocumentDTO, UpdateDocumentDTO } from '../repositories/interfaces/document.repository';
import { IDocumentVersionRepository } from '../repositories/interfaces/document-version.repository';
import { IDocumentPermissionRepository } from '../repositories/interfaces/document-permission.repository';
import { IAuditLogRepository } from '../repositories/interfaces/audit-log.repository';
import { IStorageService } from './interfaces/storage.interface';
import { storageService } from './storage.factory';
import { Logger, AuditLogger } from '../http/middleware/logging';

/**
 * Document service class
 * Provides business logic layer for document operations
 */
export class DocumentService {
  private documentRepository: IDocumentRepository;
  private versionRepository: IDocumentVersionRepository;
  private permissionRepository: IDocumentPermissionRepository;
  private auditRepository: IAuditLogRepository;
  private storageService: IStorageService;

  constructor(
    documentRepository: IDocumentRepository,
    versionRepository: IDocumentVersionRepository,
    permissionRepository: IDocumentPermissionRepository,
    auditRepository: IAuditLogRepository,
    storage?: IStorageService
  ) {
    this.documentRepository = documentRepository;
    this.versionRepository = versionRepository;
    this.permissionRepository = permissionRepository;
    this.auditRepository = auditRepository;
    this.storageService = storage || storageService;
  }

  /**
   * Upload a new document with validation (Enhanced from controller)
   * @param file - File to upload
   * @param metadata - Document metadata
   * @param userId - User uploading the document
   */
  async uploadDocumentWithValidation(
    file: any,
    metadata: {
      tags?: string[];
      metadata?: Record<string, any>;
      description?: string;
    },
    userId: string
  ): Promise<ApiResponse<Document>> {
    try {
      // Validation that was in controller
      if (!file) {
        return {
          success: false,
          message: 'File is required',
          error: 'FILE_REQUIRED',
        };
      }

      // Call existing upload method
      return await this.uploadDocument(file, metadata, userId);
    } catch (error) {
      Logger.error('Failed to upload document', { error, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Upload a new document
   * @param file - File to upload
   * @param metadata - Document metadata
   * @param userId - User uploading the document
   */
  async uploadDocument(
    file: any,
    metadata: {
      tags?: string[];
      metadata?: Record<string, any>;
      description?: string;
    },
    userId: string
  ): Promise<ApiResponse<Document>> {
    try {
      const documentId = uuidv4();
      
      // Generate unique storage key
      const storageKey = this.storageService.generateFileKey(userId, file.filename, documentId);
      
      // Calculate file checksum
      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      
      // Check for duplicates
      const duplicates = await this.documentRepository.findDuplicatesByChecksum(checksum);
      if (duplicates.length > 0) {
        Logger.warn('Duplicate file detected', { checksum, duplicates: duplicates.length });
      }

      // Upload file to storage
      const uploadResult = await this.storageService.uploadFile(
        {
          buffer: file.buffer,
          mimetype: file.mimetype,
          filename: file.filename,
          size: file.size,
        },
        storageKey,
        {
          metadata: metadata.metadata,
          contentType: file.mimetype,
        }
      );

      // Create document record
      const documentData: CreateDocumentDTO = {
        filename: file.filename,
        originalName: file.originalname || file.filename,
        mimeType: file.mimetype,
        size: file.size,
        s3Key: uploadResult.key,
        s3Bucket: 'local', // For local storage
        checksum: uploadResult.checksum,
        tags: metadata.tags || [],
        metadata: {
          ...metadata.metadata,
          description: metadata.description,
        },
        uploadedBy: userId,
      };

      const document = await this.documentRepository.create(documentData);

      // Create initial version
      await this.versionRepository.create({
        documentId: document.id,
        version: 1,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        s3Key: uploadResult.key,
        s3Bucket: 'local',
        checksum: uploadResult.checksum,
        tags: metadata.tags || [],
        metadata: {
          ...metadata.metadata,
          description: metadata.description,
        },
        uploadedBy: userId,
      });

      // Create audit log
      await this.auditRepository.create({
        documentId: document.id,
        userId,
        action: AuditAction.UPLOAD,
        details: {
          filename: file.filename,
          size: file.size,
          mimeType: file.mimetype,
          tags: metadata.tags,
        },
      });

      Logger.info('Document uploaded successfully', {
        documentId: document.id,
        filename: file.filename,
        userId,
      });

      return {
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      };
    } catch (error) {
      Logger.error('Failed to upload document', { error, userId });
      return {
        success: false,
        message: 'Failed to upload document',
        error: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Get document by ID with permission check
   */
  async getDocument(documentId: string, userId: string): Promise<ApiResponse<Document>> {
    try {
      const document = await this.documentRepository.findById(documentId);
      
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'read');
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.VIEW,
        details: { filename: document.filename },
      });

      return {
        success: true,
        message: 'Document retrieved successfully',
        data: document,
      };
    } catch (error) {
      Logger.error('Failed to get document', { error, documentId, userId });
      return {
        success: false,
        message: 'Failed to retrieve document',
        error: 'RETRIEVAL_ERROR',
      };
    }
  }

  /**
   * Search documents with enhanced filters and data transformations (Enhanced from controller)
   */
  async searchDocumentsWithTransforms(
    searchData: {
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
    },
    userId: string
  ): Promise<ApiResponse<PaginatedResponse<Document>>> {
    try {
      const { page, limit, sortBy, sortOrder, dateFrom, dateTo, ...filters } = searchData;

      // Convert string dates to Date objects - transformation from controller
      const searchFilters: DocumentSearchFilters = {
        ...filters,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        ...(dateFrom && { dateFrom: new Date(dateFrom) }),
        ...(dateTo && { dateTo: new Date(dateTo) }),
      };

      const pagination: PaginationParams = { 
        page: page || 1, 
        limit: limit || 10 
      };

      // Call existing search method
      return await this.searchDocuments(searchFilters, pagination, userId);
    } catch (error) {
      Logger.error('Failed to search documents', { error, searchData, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Search documents with advanced filters
   */
  async searchDocuments(
    filters: DocumentSearchFilters,
    pagination: PaginationParams,
    userId: string
  ): Promise<ApiResponse<PaginatedResponse<Document>>> {
    try {
      // Get user's accessible documents
      const userDocuments = await this.documentRepository.findByUploader(userId);
      const accessibleDocumentIds = userDocuments.map(doc => doc.id);

      // Get documents user has explicit permissions for
      const permissions = await this.permissionRepository.findByUserId(userId);
      const permittedDocumentIds = permissions.map(perm => perm.documentId);

      // Combine accessible document IDs
      const allAccessibleIds = [...new Set([...accessibleDocumentIds, ...permittedDocumentIds])];

      // Apply search filters
      const searchFilters: DocumentSearchFilters = {
        ...filters,
        documentIds: allAccessibleIds,
      };

      const result = await this.documentRepository.findManyPaginated(pagination, searchFilters);

      return {
        success: true,
        message: 'Documents retrieved successfully',
        data: result,
      };
    } catch (error) {
      Logger.error('Failed to search documents', { error, filters, userId });
      return {
        success: false,
        message: 'Failed to search documents',
        error: 'SEARCH_ERROR',
      };
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    updateData: UpdateDocumentDTO,
    userId: string
  ): Promise<ApiResponse<Document>> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'write');
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      const document = await this.documentRepository.update(documentId, updateData);
      
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.UPDATE,
        details: { changes: updateData },
      });

      Logger.info('Document updated successfully', { documentId, userId });

      return {
        success: true,
        message: 'Document updated successfully',
        data: document,
      };
    } catch (error) {
      Logger.error('Failed to update document', { error, documentId, userId });
      return {
        success: false,
        message: 'Failed to update document',
        error: 'UPDATE_ERROR',
      };
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'delete');
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      // Soft delete document
      await this.documentRepository.softDelete(documentId);

      // Delete file from storage
      await this.storageService.deleteFile(document.storageKey);

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.DELETE,
        details: { filename: document.filename },
      });

      Logger.info('Document deleted successfully', { documentId, userId });

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      Logger.error('Failed to delete document', { error, documentId, userId });
      return {
        success: false,
        message: 'Failed to delete document',
        error: 'DELETE_ERROR',
      };
    }
  }

  /**
   * Generate download link for document
   */
  async generateDownloadLink(
    documentId: string,
    userId: string,
    options: { expiresIn?: number; filename?: string } = {}
  ): Promise<ApiResponse<{ downloadUrl: string; expiresAt: Date }>> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'read');
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      // Generate pre-signed URL
      const { url, expiresAt } = await this.storageService.generateDownloadUrl(
        document.storageKey,
        options.expiresIn || 3600, // Default 1 hour
        options.filename || document.filename
      );

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.DOWNLOAD,
        details: {
          filename: document.filename,
          expiresIn: options.expiresIn || 3600,
        },
      });

      return {
        success: true,
        message: 'Download link generated successfully',
        data: {
          downloadUrl: url,
          expiresAt,
        },
      };
    } catch (error) {
      Logger.error('Failed to generate download link', { error, documentId, userId });
      return {
        success: false,
        message: 'Failed to generate download link',
        error: 'DOWNLOAD_LINK_ERROR',
      };
    }
  }

  /**
   * Update document permissions
   */
  async updateDocumentPermissions(
    documentId: string,
    permissions: Array<{ userId: string; permission: 'read' | 'write' | 'delete' }>,
    grantedBy: string
  ): Promise<ApiResponse<void>> {
    try {
      // Check if user can manage permissions (owner or admin)
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      const canManagePermissions = document.uploadedBy === grantedBy ||
        await this.checkDocumentPermission(documentId, grantedBy, 'delete');

      if (!canManagePermissions) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      // Clear existing permissions for the document
      await this.permissionRepository.removeAllDocumentPermissions(documentId);

      // Create new permissions
      for (const perm of permissions) {
        await this.permissionRepository.create({
          documentId,
          userId: perm.userId,
          permission: perm.permission as Permission,
          grantedBy,
        });
      }

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId: grantedBy,
        action: AuditAction.PERMISSION_GRANT,
        details: { permissions },
      });

      return {
        success: true,
        message: 'Document permissions updated successfully',
      };
    } catch (error) {
      Logger.error('Failed to update document permissions', { error, documentId });
      return {
        success: false,
        message: 'Failed to update document permissions',
        error: 'PERMISSION_UPDATE_ERROR',
      };
    }
  }

  /**
   * Update document metadata only (Enhanced from controller)
   */
  async updateDocumentMetadata(
    documentId: string,
    userId: string,
    metadata: Record<string, any>
  ): Promise<ApiResponse<Document>> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'write');
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      const updateData: UpdateDocumentDTO = {
        metadata: { ...document.metadata, ...metadata }
      };

      const updatedDocument = await this.documentRepository.update(documentId, updateData);

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.UPDATE,
        details: { newMetadata: metadata },
      });

      Logger.info('Document metadata updated successfully', { documentId, userId });

      return {
        success: true,
        message: 'Document metadata updated successfully',
        data: updatedDocument!,
      };
    } catch (error) {
      Logger.error('Failed to update document metadata', { error, documentId, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Update document tags only (Enhanced from controller)
   */
  async updateDocumentTags(
    documentId: string,
    userId: string,
    tags: string[]
  ): Promise<ApiResponse<Document>> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'write');
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      const updateData: UpdateDocumentDTO = { tags };
      const updatedDocument = await this.documentRepository.update(documentId, updateData);

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.UPDATE,
        details: { newTags: tags, oldTags: document.tags },
      });

      Logger.info('Document tags updated successfully', { documentId, userId });

      return {
        success: true,
        message: 'Document tags updated successfully',
        data: updatedDocument!,
      };
    } catch (error) {
      Logger.error('Failed to update document tags', { error, documentId, userId });
      return {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR',
      };
    }
  }

  /**
   * Check if user has permission for document
   */
  private async checkDocumentPermission(
    documentId: string,
    userId: string,
    permission: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    try {
      // Check if user is document owner
      const document = await this.documentRepository.findById(documentId);
      if (document && document.uploadedBy === userId) {
        return true;
      }

      // Check explicit permissions
      const userPermissions = await this.permissionRepository.findByDocumentAndUser(documentId, userId);
      
      if (userPermissions && Array.isArray(userPermissions)) {
        for (const perm of userPermissions) {
          if (perm.permission === permission || 
              (permission === 'read' && [Permission.WRITE, Permission.DELETE].includes(perm.permission)) ||
              (permission === 'write' && perm.permission === Permission.DELETE)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      Logger.error('Failed to check document permission', { error, documentId, userId, permission });
      return false;
    }
  }
}
