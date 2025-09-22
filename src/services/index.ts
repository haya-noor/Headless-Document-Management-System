/**
 * Service factory
 * Provides pre-configured service instances with dependency injection
 */

// Use dynamic imports to avoid circular dependencies
let DocumentService: any;
let UserService: any;
let FileService: any;
let DatabaseService: any;
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
  private _documentService?: any;
  private _userService?: any;
  private _fileService?: any;
  private _databaseService?: any;

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
  get documentService(): any {
    if (!this._documentService) {
      if (!DocumentService) {
        DocumentService = require('./document.service').DocumentService;
      }
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
  get userService(): any {
    if (!this._userService) {
      if (!UserService) {
        UserService = require('./user.service').UserService;
      }
      this._userService = new UserService();
    }
    return this._userService;
  }

  /**
   * Get configured file service
   */
  get fileService(): any {
    if (!this._fileService) {
      if (!FileService) {
        FileService = require('./file.service').FileService;
      }
      this._fileService = new FileService();
    }
    return this._fileService;
  }

  /**
   * Get configured database service
   */
  get databaseService(): any {
    if (!this._databaseService) {
      if (!DatabaseService) {
        DatabaseService = require('./database.service').DatabaseService;
      }
      this._databaseService = DatabaseService.getInstance();
    }
    return this._databaseService;
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
export const databaseService = serviceFactory.databaseService;
export const tokenBlacklistRepository = serviceFactory.tokenBlacklistRepository;
