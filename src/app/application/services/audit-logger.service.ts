import { Effect as E } from 'effect';
import logger from '@/presentation/utils/logger';
import { UserContext } from '@/presentation/http/middleware/auth.middleware';

export interface AuditEvent {
  eventType: string;
  resource: string;
  resourceId: string;
  action: string;
  userId: string;
  workspaceId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  outcome: 'success' | 'failure';
  errorMessage?: string;
}

export class AuditLoggerService {
  logDocumentOperation(
    eventType: string,
    resourceId: string,
    action: string,
    user: UserContext,
    outcome: 'success' | 'failure',
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    const auditEvent: AuditEvent = {
      eventType,
      resource: 'document',
      resourceId,
      action,
      userId: user.userId,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      metadata,
      outcome,
      errorMessage
    };

    logger.info(auditEvent, 'Audit log: Document operation');
    return E.succeed(undefined);
  }

  logAccessControlChange(
    eventType: string,
    resourceId: string,
    action: string,
    user: UserContext,
    targetUserId: string,
    outcome: 'success' | 'failure',
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    const auditEvent: AuditEvent = {
      eventType,
      resource: 'access_control',
      resourceId,
      action,
      userId: user.userId,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        targetUserId
      },
      outcome,
      errorMessage
    };

    logger.info(auditEvent, 'Audit log: Access control change');
    return E.succeed(undefined);
  }

  logSecurityEvent(
    eventType: string,
    user: UserContext,
    outcome: 'success' | 'failure',
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    const auditEvent: AuditEvent = {
      eventType,
      resource: 'security',
      resourceId: 'system',
      action: eventType,
      userId: user.userId,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      metadata,
      outcome,
      errorMessage
    };

    logger.warn(auditEvent, 'Audit log: Security event');
    return E.succeed(undefined);
  }
}