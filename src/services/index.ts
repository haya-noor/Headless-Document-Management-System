/**
 * Service factory
 * Provides pre-configured service instances with dependency injection
 */

// Use dynamic imports to avoid circular dependencies
let DocumentService: any;
let UserService: any;
let DatabaseService: any;
let DocumentRepository: any;
let DocumentVersionRepository: any;
let DocumentPermissionRepository: any;
let AuditLogRepository: any;
let TokenBlacklistRepository: any;
let UserRepository: any;

/**
 * Service factory class
 * Implements singleton pattern for service instances
 */
class ServiceFactory {
  private static instance: ServiceFactory;
  private _documentService?: any;
  private _userService?: any;
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
      if (!DocumentRepository) {
        DocumentRepository = require('../repositories/implementations/document.repository').DocumentRepository;
      }
      if (!DocumentVersionRepository) {
        DocumentVersionRepository = require('../repositories/implementations/document-version.repository').DocumentVersionRepository;
      }
      if (!DocumentPermissionRepository) {
        DocumentPermissionRepository = require('../repositories/implementations/document-permission.repository').DocumentPermissionRepository;
      }
      if (!AuditLogRepository) {
        AuditLogRepository = require('../repositories/implementations/audit-log.repository').AuditLogRepository;
      }
      
      // Get database instance
      const db = this.databaseService.getDatabase();
      
      const documentRepo = new DocumentRepository(db);
      const versionRepo = new DocumentVersionRepository(db);
      const permissionRepo = new DocumentPermissionRepository(db);
      const auditRepo = new AuditLogRepository(db);
      
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
  get tokenBlacklistRepository(): any {
    if (!TokenBlacklistRepository) {
      TokenBlacklistRepository = require('../repositories/implementations/token-blacklist.repository').TokenBlacklistRepository;
    }
    return new TokenBlacklistRepository();
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance();

// Export individual services for convenience
export const documentService = serviceFactory.documentService;
export const userService = serviceFactory.userService;
export const databaseService = serviceFactory.databaseService;
export const tokenBlacklistRepository = serviceFactory.tokenBlacklistRepository;
