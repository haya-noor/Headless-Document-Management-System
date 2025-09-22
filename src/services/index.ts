/**
 * Service factory
 * Provides pre-configured service instances with dependency injection
 */

import { DocumentService } from './document.service';
import { UserService } from './user.service';
import { FileService } from './file.service';
import { DocumentRepository } from '../repositories/implementations/document.repository';
import { DocumentVersionRepository } from '../repositories/implementations/document-version.repository';
import { DocumentPermissionRepository } from '../repositories/implementations/document-permission.repository';
import { AuditLogRepository } from '../repositories/implementations/audit-log.repository';
import { TokenBlacklistRepository } from '../repositories/implementations/token-blacklist.repository';
import { UserRepository } from '../repositories/implementations/user.repository';

/**
 * Service factory class
 * Implements singleton pattern for service instances
 */
class ServiceFactory {
  private static instance: ServiceFactory;
  private _documentService?: DocumentService;
  private _userService?: UserService;
  private _fileService?: FileService;

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Get configured document service
   */
  get documentService(): DocumentService {
    if (!this._documentService) {
      const documentRepo = new DocumentRepository();
      const versionRepo = new DocumentVersionRepository();
      const permissionRepo = new DocumentPermissionRepository();
      const auditRepo = new AuditLogRepository();
      
      this._documentService = new DocumentService(
        documentRepo,
        versionRepo,
        permissionRepo,
        auditRepo
      );
    }
    return this._documentService;
  }

  /**
   * Get configured user service
   */
  get userService(): UserService {
    if (!this._userService) {
      this._userService = new UserService();
    }
    return this._userService;
  }

  /**
   * Get configured file service
   */
  get fileService(): FileService {
    if (!this._fileService) {
      this._fileService = new FileService();
    }
    return this._fileService;
  }

  /**
   * Get token blacklist repository
   */
  get tokenBlacklistRepository(): TokenBlacklistRepository {
    return new TokenBlacklistRepository();
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance();

// Export individual services for convenience
export const documentService = serviceFactory.documentService;
export const userService = serviceFactory.userService;
export const fileService = serviceFactory.fileService;
export const tokenBlacklistRepository = serviceFactory.tokenBlacklistRepository;
