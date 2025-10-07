/**
 * Document service layer
 * Implements business logic for document management operations
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Effect } from 'effect';
import { Document, DocumentSearchFilters, PaginationParams, PaginatedResponse, ApiResponse, AuditAction, Permission } from '../types';

/**
 * File upload interface
 */
interface UploadedFile {
  buffer: Buffer;
  filename: string;
  originalname?: string;
  mimetype: string;
  size: number;
}
import { DocumentRepository, CreateDocumentDTO, UpdateDocumentDTO } from '../interfaces/document.interface';
import { Repository } from '../interfaces/base.interface';
import { IStorageService } from '../interfaces/storage.interface';
import { storageService } from './storage.factory';
import { Logger, AuditLogger } from '../http/middleware/logging';
import { DocumentEntity, DocumentVersionEntity } from '../domain/entities';
import { DocumentIdVO, ChecksumVO, FileReferenceVO, DateTimeVO } from '../domain/value-objects';
import { DocumentValidationError, DocumentNotFoundError } from '../domain/errors';

/**
 * Document service class
 * Provides business logic layer for document operations
 */
export class DocumentService {
  private documentRepository: DocumentRepository;
  private versionRepository: Repository<any>;
  private permissionRepository: Repository<any>;
  private auditRepository: Repository<any>;
  private storageService: IStorageService;

  constructor(
    documentRepository: DocumentRepository,
    versionRepository: Repository<any>,
    permissionRepository: Repository<any>,
    auditRepository: Repository<any>,
    storage?: IStorageService
  ) {
    this.documentRepository = documentRepository;
    this.versionRepository = versionRepository;
    this.permissionRepository = permissionRepository;
    this.auditRepository = auditRepository;
    this.storageService = storage || storageService;
  }

  /**
   * Upload a new document with validation using Effect patterns
   * @param file - File to upload
   * @param metadata - Document metadata
   * @param userId - User uploading the document
   */
  uploadDocumentWithValidation(
    file: UploadedFile, 
    metadata: {
      tags?: string[];
      metadata?: Record<string, any>;
      description?: string;
    },
    userId: string
  ): Effect.Effect<ApiResponse<Document>, DocumentValidationError, never> {
    const self = this;
    return Effect.gen(function* () {
      // Validation that was in controller
      if (!file) {
        return {
          success: false,
          message: 'File is required',
          error: 'FILE_REQUIRED',
        };
      }

      // Call existing upload method
      return yield* self.uploadDocument(file, metadata, userId);
    });
  }

  /**
   * Upload a new document using Effect patterns and domain entities
   * @param file - File to upload
   * @param metadata - Document metadata
   * @param userId - User uploading the document
   */
  uploadDocument(
    file: UploadedFile,
    metadata: {
      tags?: string[];
      metadata?: Record<string, any>;
      description?: string;
    },
    userId: string
  ): Effect.Effect<ApiResponse<Document>, DocumentValidationError, never> {
    const self = this;
    return Effect.gen(function* () {
      const documentId = uuidv4();
      
      // Generate unique storage key
      const storageKey = self.storageService.generateFileKey(userId, file.filename, documentId);
      
      // Calculate file checksum
      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      
      // Check for duplicates
      const duplicates = yield* Effect.promise(() => self.documentRepository.findDuplicatesByChecksum(checksum) as Promise<Document[]>);
      if (duplicates.length > 0) {
        Logger.warn('Duplicate file detected', { checksum, duplicates: duplicates.length });
      }

      // Upload file to storage
      const uploadResult = yield* Effect.promise(() => self.storageService.uploadFile(
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
      ));

      // Create document entity using domain factory
      const documentEntity = DocumentEntity.create({
        id: documentId,
        filename: file.filename,
        originalName: file.originalname || file.filename,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: uploadResult.key,
        storageProvider: 'local',
        checksum: checksum,
        tags: metadata.tags || [],
        /*
        // metadata: {...metadata.metadata, description: metadata.description}
        // the ... is a spread operator, it's creating a new object with the same properties as the original 
        Example:
        this is original metadata
        metadata = {
           metadata: {
              category: "documents",
              author: "john",
              version: "1.0"
            },
          description: "Important document"
          }

        the ...metadata.metadata uses the above metadata and creates a new object with the same properties as the original object
        metadata = {
          ...metadata.metadata,
          description: metadata.description,
        }
        */
        metadata: {
          ...metadata.metadata,
          description: metadata.description,
        },
        uploadedBy: userId,
      });

      // Save document using repository
      /*
      documentEntity.toPersistence() is a method that returns the document entity in a format (raw  just strings,numbers,booleans)
       that can be used by the repository to create a document
      documentEntity.toPersistence() returns the following object:
      {
        id: "uuid-string",
        filename: "document.pdf",
        originalName: "My Document.pdf",
        mimeType: "application/pdf",
        size: 1024,
      }


      self.documentRepository.create takes the persistence object and insert it into a database 
      so create insert the data into DB 

      Promise<Document> is the return type of the create method, so the create method returns a promise that resolves 
      to a Document object

      yield* Effect.promise(() => is same as await but in effect pattern
      
      await is used in async functions to pause the execution of the function until the promise resolves   

      Example:
      async function example() {
        const result = await somePromise(); 
        console.log(result);
      }
      If somePromise() resolves → await gives you the resolved value.
      If somePromise() rejects → await throws the rejection as an error.
      */
      const savedDocument = yield* Effect.promise(() => self.documentRepository.create(documentEntity.toPersistence()) as Promise<Document>);

      // Create initial version
      const versionEntity = DocumentVersionEntity.create({
        id: uuidv4(),
        documentId: documentEntity.getId(),
        version: 1,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: uploadResult.key,
        storageProvider: 'local',
        checksum: checksum,
        tags: metadata.tags || [],
        metadata: {
          ...metadata.metadata,
          description: metadata.description,
        },
        uploadedBy: userId,
      });

      // we need to use toPersistence() method to get the raw data because repository expects it like that.
      yield* Effect.promise(() => self.versionRepository.create(versionEntity.toPersistence()));

      // Create audit log
      yield* Effect.promise(() => self.auditRepository.create({
        documentId: documentEntity.getId(),
        userId,
        action: AuditAction.UPLOAD, // AuditAction is an enum that contains the possible actions that can be performed on a document like upload, download, update, delete, etc.
        details: {
          filename: file.filename,
          size: file.size,
          mimeType: file.mimetype,
          tags: metadata.tags,
        },
      }));

      Logger.info('Document uploaded successfully', {
        documentId: documentEntity.getId(),
        filename: file.filename,
        userId,
      });

      return {
        success: true,
        message: 'Document uploaded successfully',
        data: savedDocument,
      };
    });
  }

  /**
   * Get document by ID with permission check using Effect patterns
   */
  getDocument(documentId: string, userId: string): Effect.Effect<ApiResponse<Document>, DocumentNotFoundError, never> {
    const self = this;
    return Effect.gen(function* () {
      const document = yield* Effect.promise(() => self.documentRepository.findById(documentId) as Promise<Document>);
      
      // Check permissions
      const hasPermission = yield* Effect.promise(() => self.checkDocumentPermission(documentId, userId, 'read'));
      if (!hasPermission) {
        return {
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED',
        };
      }

      // Create audit log
      yield* Effect.promise(() => self.auditRepository.create({
        documentId,
        userId,
        action: AuditAction.VIEW,
        details: { filename: document.filename },
      }));

      return {
        success: true,
        message: 'Document retrieved successfully',
        data: document,
      };
    });
  }

  /**
   * Search documents with filters 
   * When to put async before a function?
   * when that ftn returns a promise
   * Inside async we can use await to pause the execution of the function until the promise resolves or rejects
   * when function needs to perform async operations like fetching data from a database, calling an API, etc. use async 
   */

  async searchDocumentsWithTransforms(
    // function parameters 
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
    // async is used in this function because it returns a promise<ApiResponse<PaginatedResponse<Document>>> so we can use await 
    // to pause the execution of the function until the promise resolves or rejects


    /*
    the searchData is being destructured into the following variables:
    searchData = {page,limit,sortBy,sortOrder,dateFrom,dateTo, ...filters}
    searchFilters = {...filters,sortBy,sortOrder,dateFrom,dateTo}
    pagination = {page: page || 1, limit: limit || 10}
    becasuse searchData contains a mix of different types of information:
    searchData = {
    query, tags, mimeType,        // filters
    page, limit,                  // 📄 pagination
    sortBy, sortOrder,            // ↕ sorting
    dateFrom, dateTo,             // 🗓 date ranges
    uploadedBy, minSize, maxSize  // 🔍 other filters
    }
    so we need to destructure it into different variables to use them efficiently just by refering to the variables
    and not the searchData object

    the function is called withTransforms because it performs data transformations on the data before returning it 
    like converting string dates to Date objects, sorting (sortBy, sortOrder), etc.
      */
  ): Promise<ApiResponse<PaginatedResponse<Document>>> {
    try {
      const { page, limit, sortBy, sortOrder, dateFrom, dateTo, ...filters } = searchData; 
      const searchFilters: DocumentSearchFilters = {
      // ...filters is a spread operator, it's creating a new object with the same properties as the original object 
        ...filters,
        sortBy, // like createdAt, updatedAt, filename, size, etc.
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        ...(dateFrom && { dateFrom: new Date(dateFrom) }),
        ...(dateTo && { dateTo: new Date(dateTo) }),
      };

      const pagination: PaginationParams = { 
        page: page || 1, 
        limit: limit || 10 
      };

      // Call existing search method
      // userId: so we can get the documents that the user has access to and the documents that the user has explicit permissions for
      // and then use that to filter the documents
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
      // get document uploaded by user
      // Calls the documentRepository to find all documents uploaded by this user.
      const userDocuments = await this.documentRepository.findByUploader(userId);
      //Extracts just the ids of those documents into an array (accessibleDocumentIds).
      const accessibleDocumentIds = userDocuments.map((doc: Document) => doc.id);

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
      // pre-signed url is a url that is signed with a secret key so that only the user who has the secret key can access the url
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
      /*
      document.uploadedBy === grantedBy means check the id of the user who uploaded the document and the id of the user
       who is trying to grant/revoke permissions, if the id is same it means uploader is trying to manage permissions
       await this.checkDocumentPermission check does this user have delete permission for this document (delete permission is 
       the highest permission, so if user has delete permission, he can manage permissions)
      */
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
      // means if document exists and the uploadedBy is the same as the userId, then the user is the owner of the document
      if (document && document.uploadedBy === userId) {
        return true;
      }

      // Check explicit permissions
      // find the permissions that the user has for this document
      const userPermissions = await this.permissionRepository.findByDocumentAndUser(documentId, userId);
      // 
      if (userPermissions && Array.isArray(userPermissions)) {
        for (const perm of userPermissions) {
          // if permission that user asks for is the same as the permission that the user has for this document
          if (perm.permission === permission || 
            // if permission that user asks for is read and the permission that the user has for this document is write or delete
              (permission === 'read' && [Permission.WRITE, Permission.DELETE].includes(perm.permission)) ||
              // if permission that user asks for is write and the permission that the user has for this document is delete
              (permission === 'write' && perm.permission === Permission.DELETE)) {
                // if any check passes then the user has the permission so return true
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
