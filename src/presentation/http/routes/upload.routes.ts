import { Elysia } from 'elysia';
import { container } from 'tsyringe';
import { Effect as E } from 'effect';
import { UploadWorkflow } from '@/app/application/workflows/upload.workflow';
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

export const uploadRoutes = new Elysia({ prefix: '/upload' })
  .derive(({ userContext }) => {
    const uploadWorkflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW);
    const accessControl = container.resolve<AccessControlService>(TOKENS.ACCESS_CONTROL_SERVICE);
    const auditLogger = container.resolve<AuditLoggerService>(TOKENS.AUDIT_LOGGER_SERVICE);
    
    return {
      uploadWorkflow,
      accessControl,
      auditLogger,
      userContext: userContext as UserContext
    };
  })
  
  // Initiate upload (get presigned URL)
  .post('/initiate', async ({ body, uploadWorkflow, accessControl, auditLogger, userContext }) => {
    try {
      // Check permissions
      await runEffect(accessControl.enforceAccess(userContext, 'document', 'create'));
      
      // Initiate upload
      const result = await runEffect(
        uploadWorkflow.initiateUpload(body, userContext)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'upload_initiated',
          body.documentId,
          'upload_initiate',
          userContext,
          'success',
          { filename: body.filename, mimeType: body.mimeType }
        )
      );
      
      return createResponse(result, 'Upload initiated successfully');
    } catch (error) {
      await runEffect(
        auditLogger.logDocumentOperation(
          'upload_initiation_failed',
          body.documentId || 'unknown',
          'upload_initiate',
          userContext,
          'failure',
          { filename: body.filename },
          error.message
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Upload'],
    summary: 'Initiate file upload',
    body: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        filename: { type: 'string' },
        mimeType: { type: 'string' }
      },
      required: ['documentId', 'filename', 'mimeType']
    }
  })
  
  // Confirm upload (persist version)
  .post('/confirm', async ({ body, uploadWorkflow, accessControl, auditLogger, userContext }) => {
    try {
      // Check permissions
      await runEffect(accessControl.enforceAccess(userContext, 'document', 'create'));
      
      // Confirm upload
      const result = await runEffect(
        uploadWorkflow.confirmUpload(body, userContext)
      );
      
      // Audit log
      await runEffect(
        auditLogger.logDocumentOperation(
          'upload_confirmed',
          body.documentId,
          'upload_confirm',
          userContext,
          'success',
          { 
            filename: body.storageKey.split('/').pop(),
            checksum: body.checksum,
            size: body.size
          }
        )
      );
      
      return createResponse(result, 'Upload confirmed successfully');
    } catch (error) {
      await runEffect(
        auditLogger.logDocumentOperation(
          'upload_confirmation_failed',
          body.documentId || 'unknown',
          'upload_confirm',
          userContext,
          'failure',
          { checksum: body.checksum },
          error.message
        )
      );
      
      throw error;
    }
  }, {
    tags: ['Upload'],
    summary: 'Confirm file upload',
    body: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        storageKey: { type: 'string' },
        checksum: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        userId: { type: 'string' }
      },
      required: ['documentId', 'storageKey', 'checksum', 'mimeType', 'size', 'userId']
    }
  });
