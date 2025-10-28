import { Elysia } from 'elysia';
import { container } from 'tsyringe';
import { Effect as E } from 'effect';
import { DocumentWorkflow } from '@/app/application/workflows/doc.workflow';
import { AccessControlService } from '@/app/application/services/access-control.service';
import { AuditLoggerService } from '@/app/application/services/audit-logger.service';
import { TOKENS } from '@/app/infrastructure/di/tokens';
import { UserContext } from '../middleware/auth.middleware';
import { ApiResponse } from '@/app/domain/shared/api.interface';

// Helper to run Effect and handle errors
const runEffect = async <T, E>(effect: E.Effect<T, E>): Promise<T> => {
  return E.runPromise(effect);
};

// Helper to create API response
const createResponse = <T>(data: T, message: string = 'Success'): ApiResponse<T> => ({
  success: true,
  message,
  data
});

export const documentRoutes = new Elysia({ prefix: '/documents' })
  
  // Create document
  .post('/', async ({ body }) => {
    const documentWorkflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW);
    const accessControl = container.resolve<AccessControlService>(TOKENS.ACCESS_CONTROL_SERVICE);
    const auditLogger = container.resolve<AuditLoggerService>(TOKENS.AUDIT_LOGGER_SERVICE);
    
    const user: UserContext = {
      userId: 'system' as any,
      workspaceId: 'default' as any,
      roles: ['admin'],
      permissions: []
    };
    
    try {
      // Check permissions
      await runEffect(accessControl.enforceAccess(user, 'document', 'create'));
      
      // Create document
      const result = await runEffect(
        documentWorkflow.createDocument(body as any, user)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_created',
          result.id,
          'create',
          user,
          'success',
          { title: result.title, tags: result.tags }
        )
      );
      
      return createResponse(result, 'Document created successfully');
    } catch (error: any) {
      // Audit log failure
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_creation_failed',
          'unknown',
          'create',
          user,
          'failure',
          { title: (body as any)?.title },
          error?.message || 'Unknown error'
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Documents']
  })
  
  // Get document by ID
  .get('/:id', async ({ params }) => {
    const documentWorkflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW);
    const accessControl = container.resolve<AccessControlService>(TOKENS.ACCESS_CONTROL_SERVICE);
    const auditLogger = container.resolve<AuditLoggerService>(TOKENS.AUDIT_LOGGER_SERVICE);
    
    const user: UserContext = {
      userId: 'system' as any,
      workspaceId: 'default' as any,
      roles: ['admin'],
      permissions: []
    };
    
    try {
      // Check permissions
      await runEffect(accessControl.enforceAccess(user, 'document', 'read'));
      
      // Get document
      const result = await runEffect(
        documentWorkflow.getDocumentById(params.id, user)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_accessed',
          params.id,
          'read',
          user,
          'success'
        )
      );
      
      return createResponse(result, 'Document retrieved successfully');
    } catch (error: any) {
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_access_failed',
          params.id,
          'read',
          user,
          'failure',
          undefined,
          error?.message || 'Unknown error'
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Documents']
  })
  
  // Update document
  .put('/:id', async ({ params, body }) => {
    const documentWorkflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW);
    const accessControl = container.resolve<AccessControlService>(TOKENS.ACCESS_CONTROL_SERVICE);
    const auditLogger = container.resolve<AuditLoggerService>(TOKENS.AUDIT_LOGGER_SERVICE);
    
    const user: UserContext = {
      userId: 'system' as any,
      workspaceId: 'default' as any,
      roles: ['admin'],
      permissions: []
    };
    
    try {
      // Check permissions (with resource ownership context)
      await runEffect(
        accessControl.enforceAccess(user, 'document', 'update', { resourceOwnerId: (body as any)?.ownerId })
      );
      
      // Update document
      const result = await runEffect(
        documentWorkflow.updateDocument({ ...(body as any), id: params.id }, user)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_updated',
          params.id,
          'update',
          user,
          'success',
          { title: result.title }
        )
      );
      
      return createResponse(result, 'Document updated successfully');
    } catch (error: any) {
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_update_failed',
          params.id,
          'update',
          user,
          'failure',
          undefined,
          error?.message || 'Unknown error'
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Documents']
  })
  
  // Publish document
  .post('/:id/publish', async ({ params }) => {
    const documentWorkflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW);
    const accessControl = container.resolve<AccessControlService>(TOKENS.ACCESS_CONTROL_SERVICE);
    const auditLogger = container.resolve<AuditLoggerService>(TOKENS.AUDIT_LOGGER_SERVICE);
    
    const user: UserContext = {
      userId: 'system' as any,
      workspaceId: 'default' as any,
      roles: ['admin'],
      permissions: []
    };
    
    try {
      // Check permissions
      await runEffect(accessControl.enforceAccess(user, 'document', 'publish'));
      
      // Publish document
      const result = await runEffect(
        documentWorkflow.publishDocument({ documentId: params.id, userId: user.userId }, user)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_published',
          params.id,
          'publish',
          user,
          'success'
        )
      );
      
      return createResponse(result, 'Document published successfully');
    } catch (error: any) {
      await runEffect(
        auditLogger.logDocumentOperation(
          'document_publish_failed',
          params.id,
          'publish',
          user,
          'failure',
          undefined,
          error?.message || 'Unknown error'
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Documents']
  })
  
  // Query documents
  .get('/', async ({ query }) => {
    const documentWorkflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW);
    const accessControl = container.resolve<AccessControlService>(TOKENS.ACCESS_CONTROL_SERVICE);
    const auditLogger = container.resolve<AuditLoggerService>(TOKENS.AUDIT_LOGGER_SERVICE);
    
    const user: UserContext = {
      userId: 'system' as any,
      workspaceId: 'default' as any,
      roles: ['admin'],
      permissions: []
    };
    
    try {
      // Check permissions
      await runEffect(accessControl.enforceAccess(user, 'document', 'read'));
      
      // Query documents
      const result = await runEffect(
        documentWorkflow.queryDocuments({ ...query, ownerId: user.userId } as any, user)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'documents_queried',
          'multiple',
          'read',
          user,
          'success',
          { query: query }
        )
      );
      
      return createResponse(result, 'Documents retrieved successfully');
    } catch (error: any) {
      await runEffect(
        auditLogger.logDocumentOperation(
          'documents_query_failed',
          'multiple',
          'read',
          user,
          'failure',
          { query: query },
          error?.message || 'Unknown error'
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Documents']
  });
