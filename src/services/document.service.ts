/**
 * Document service layer
 * Implements business logic for document management operations
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Document, DocumentSearchFilters, PaginationParams, PaginatedResponse, ApiResponse } from '../types';
import { IDocumentRepository, CreateDocumentDTO, UpdateDocumentDTO } from '../repositories/interfaces/document.repository';
import { IDocumentVersionRepository } from '../repositories/interfaces/document-version.repository';
import { IDocumentPermissionRepository } from '../repositories/interfaces/document-permission.repository';
import { IAuditLogRepository } from '../repositories/interfaces/audit-log.repository';
import { IStorageService } from './interfaces/storage.interface';
import { storageService } from './storage.factory';
import { Logger, AuditLogger } from '../middleware/logging';

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
        storageKey: uploadResult.key,
        storageProvider: 'local',
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
        action: 'upload',
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
        action: 'view',
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
        action: 'update',
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
        action: 'delete',
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
        action: 'generate_download_link',
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
      await this.permissionRepository.deleteByDocumentId(documentId);

      // Create new permissions
      for (const perm of permissions) {
        await this.permissionRepository.create({
          documentId,
          userId: perm.userId,
          permission: perm.permission,
          grantedBy,
        });
      }

      // Create audit log
      await this.auditRepository.create({
        documentId,
        userId: grantedBy,
        action: 'update_permissions',
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
      
      for (const perm of userPermissions) {
        if (perm.permission === permission || 
            (permission === 'read' && ['write', 'delete'].includes(perm.permission)) ||
            (permission === 'write' && perm.permission === 'delete')) {
          return true;
        }
      }

      return false;
    } catch (error) {
      Logger.error('Failed to check document permission', { error, documentId, userId, permission });
      return false;
    }
  }
}
