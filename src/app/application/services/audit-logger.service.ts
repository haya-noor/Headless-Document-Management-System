import { Effect as E } from "effect"
import { inject, injectable } from "tsyringe"
import logger from '../utils/logger'
import { AuditLogRepository } from "@/app/domain/audit-log/repository"
import { AuditLogBuilder } from "./audit-logger-builder"
// UserContext type for audit logging
export interface UserContext {
  readonly userId: string
  readonly workspaceId: string
  readonly roles: readonly ("admin" | "user")[]
  readonly correlationId: string
}

// RPCContext type for audit logging
export interface RPCContext {
  readonly actorId: string
  readonly workspaceId: { _tag: "Some" | "None"; value?: string }
  readonly roles: readonly ("admin" | "user")[]
  readonly correlationId: string
}
import { TOKENS } from "@/app/infrastructure/di/container"

/**
 * Audit Logger Service
 * 
 * Provides persistent audit logging for compliance and debugging.
 * Logs are stored in database AND logged to console for immediate visibility.
 */
@injectable()
export class AuditLoggerService {
  constructor(
    @inject(TOKENS.AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository
  ) {}

  /**
   * Log document operation using builder pattern
   * Example usage:
   *   AuditLogBuilder.create()
   *     .withEventType("document_created")
   *     .forResource("document", documentId)
   *     .withAction("create")
   *     .byUser(user)
   *     .withStatus("success")
   *     .log(this.auditRepo)
   */
  logDocumentOperation(
    eventType: string,
    resourceId: string,
    action: string,
    user: UserContext | RPCContext,
    status: "success" | "failure" = "success",
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    // Extract user info with proper type narrowing
    let userId: string
    let workspaceId: string
    
    if ("userId" in user) {
      // UserContext
      userId = user.userId
      workspaceId = user.workspaceId
    } else {
      // RPCContext
      userId = user.actorId
      workspaceId = (user.workspaceId._tag === "Some" && user.workspaceId.value) 
        ? user.workspaceId.value 
        : "unknown"
    }
    
    // Console log for immediate visibility
    logger.info({
      event: eventType,
      resourceType: "document",
      resourceId,
      action,
      userId,
      workspaceId,
      correlationId: user.correlationId,
      status,
      metadata: metadata || {},
      errorMessage: errorMessage || undefined,
    }, 'Audit log: Document operation')

    // Persist to database
    const builder = AuditLogBuilder.create()
      .withEventType(eventType)
      .forResource("document", resourceId)
      .withAction(action)
      .byUser(user)
      .withStatus(status)
    
    if (metadata) {
      builder.withMetadata(metadata)
    }
    if (errorMessage) {
      builder.withError(errorMessage)
    }
    
    return builder.log(this.auditRepo)
  }

  /**
   * Log access control change
   */
  logAccessControlChange(
    eventType: string,
    resourceId: string,
    action: string,
    user: UserContext | RPCContext,
    targetUserId: string,
    status: "success" | "failure" = "success",
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    logger.info({
      event: eventType,
      resourceType: "access_policy",
      resourceId,
      action,
      userId: "userId" in user ? user.userId : user.actorId,
      targetUserId,
      status,
      metadata: metadata || {},
      errorMessage: errorMessage || undefined,
    }, 'Audit log: Access control change')

    const builder = AuditLogBuilder.create()
      .withEventType(eventType)
      .forResource("access_policy", resourceId)
      .withAction(action)
      .byUser(user)
      .withStatus(status)
      .withMetadata({ ...(metadata || {}), targetUserId })
    
    if (errorMessage) {
      builder.withError(errorMessage)
    }
    
    return builder.log(this.auditRepo)
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    eventType: string,
    user: UserContext | RPCContext,
    status: "success" | "failure" = "success",
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    logger.info({
      event: eventType,
      resourceType: "security",
      action: "security_event",
      userId: "userId" in user ? user.userId : user.actorId,
      status,
      metadata: metadata || {},
      errorMessage: errorMessage || undefined,
    }, 'Audit log: Security event')

    const builder = AuditLogBuilder.create()
      .withEventType(eventType)
      .forResource("security")
      .withAction("security_event")
      .byUser(user)
      .withStatus(status)
    
    if (metadata) {
      builder.withMetadata(metadata)
    }
    if (errorMessage) {
      builder.withError(errorMessage)
    }
    
    return builder.log(this.auditRepo)
  }

  /**
   * Legacy method for backward compatibility
   */
  log(event: string, data: Record<string, any>): void {
    logger.info({ event, ...data }, 'Audit log')
    
    // Also persist if user context available
    if (data.userId && data.correlationId) {
      E.runPromise(
        AuditLogBuilder.create()
          .withEventType(event)
          .forResource(data.resourceType || "system")
          .withAction(data.action || "unknown")
          .byUser({
            userId: data.userId,
            workspaceId: data.workspaceId || "unknown",
            roles: data.roles || [],
            correlationId: data.correlationId,
          })
          .withStatus(data.status || "success")
          .withMetadata(data)
          .log(this.auditRepo)
      ).catch(() => {}) // Fail silently
    }
  }
}