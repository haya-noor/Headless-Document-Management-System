// src/app/application/services/audit-logger.service.ts

import { Effect as E, Option } from "effect"
import { logger } from "../utils/logger"
import type { RPCContext, UserContext } from "@/presentation/http/orpc/auth"

/*
 Defines the structure of a standardized audit event
eventType: Type of event (e.g., "UPLOAD", "LOGIN")
resource: Category of resource involved (e.g., "document", "security")
resourceId: Unique identifier of the resource
action:Action performed (e.g., "create", "read")
userId: User who performed the action
workspaceId: Workspace context of the action
correlationId: Request-level trace ID for observability
timestamp: ISO timestamp of when the action occurred
metadata: Optional extra data
outcome: Whether the action was successful
errorMessage: Optional error message for failed actions


*/
export interface AuditEvent {
  eventType: string
  resource: string
  resourceId: string
  action: string
  userId: string
  workspaceId: string
  correlationId?: string
  timestamp: string
  metadata?: Record<string, unknown>
  outcome: "success" | "failure"
  errorMessage?: string
}

/**
Internal method to write audit events to the logger using the specified level.

correlationId is a unique identifier used to trace and link related actions or logs within a single
request, job, or workflow.
Purpose:
It helps track a full chain of events triggered by one user action (e.g. uploading a document).

Suppose a user uploads a document:
A request hits your API.
The API calls a database and storage service.
Each service logs actions.
Using a correlationId, you can trace all logs across systems that happened due to that single
upload action.

*/
export class AuditLoggerService {
  private log(level: "info" | "warn", auditEvent: AuditEvent, message: string) {
    logger[level](
      {
        correlationId: auditEvent.correlationId,
        userId: auditEvent.userId,
        workspaceId: auditEvent.workspaceId,
        eventType: auditEvent.eventType,
        resource: auditEvent.resource,
        action: auditEvent.action,
        outcome: auditEvent.outcome,
      },
      message
    )
  }
/*
ctx.actorId exists only on an RPCContext object.
It tells us:
This request is coming from a remote service (RPC- Remote Procedure Call) rather than a direct 
user session.
The action is being performed on behalf of a user (actorId), but not by the user directly.
Why useful?
In RPC (Remote Procedure Call) scenarios:
Backend service A may call backend service B "as" the user.
You still want to attribute the action to the correct user.
actorId = the user for whom the service is acting.
*/

  private extractContextInfo(ctx: RPCContext | UserContext): {
    userId: string
    workspaceId: string
    correlationId: string
  } {
    if ("actorId" in ctx) {
      // RPCContext
      return {
        userId: ctx.actorId,
        workspaceId: Option.getOrElse(ctx.workspaceId, () => "unknown"),
        correlationId: ctx.correlationId,
      }
    } else {
      // UserContext
      return {
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        correlationId: ctx.correlationId,
      }
    }
  }
 /**
Logs operations related to documents (e.g., uploads, updates).
ctx: RPCContext | UserContext?
This means the ctx parameter can be either one of two types:
UserContext:
Used when the user is directly interacting with the system (e.g. via UI or API).
Example fields: { userId, workspaceId, correlationId }
RPCContext:
Used when an internal service is acting on behalf of a user (e.g. background job, system automation).
Example fields: { actorId, workspaceId (Option), correlationId }
   */
  logDocumentOperation(
    eventType: string,
    resourceId: string,
    action: string,
    ctx: RPCContext | UserContext,
    outcome: "success" | "failure",
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    const { userId, workspaceId, correlationId } = this.extractContextInfo(ctx)
    const auditEvent: AuditEvent = {
      eventType,
      resource: "document",
      resourceId,
      action,
      userId,
      workspaceId,
      correlationId,
      timestamp: new Date().toISOString(),
      metadata,
      outcome,
      errorMessage,
    }

    this.log("info", auditEvent, "Audit log: Document operation")
    return E.succeed(undefined)
  }
  /**
   * Logs changes to access control (e.g., permission grants or revocations).
   * Includes the target user affected as part of metadata.
   */
  logAccessControlChange(
    eventType: string,
    resourceId: string,
    action: string,
    ctx: RPCContext | UserContext,
    targetUserId: string,
    outcome: "success" | "failure",
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    const { userId, workspaceId, correlationId } = this.extractContextInfo(ctx)
    const auditEvent: AuditEvent = {
      eventType,
      resource: "access_control",
      resourceId,
      action,
      userId,
      workspaceId,
      correlationId,
      timestamp: new Date().toISOString(),
      metadata: { ...metadata, targetUserId },
      outcome,
      errorMessage,
    }

    this.log("info", auditEvent, "Audit log: Access control change")
    return E.succeed(undefined)
  }
  /**
   * Logs security-related events (e.g., login attempts, password changes).
   * Uses "warn" level to signal the importance of the event.
   */
  logSecurityEvent(
    eventType: string,
    ctx: RPCContext | UserContext,
    outcome: "success" | "failure",
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ): E.Effect<void, never> {
    const { userId, workspaceId, correlationId } = this.extractContextInfo(ctx)
    const auditEvent: AuditEvent = {
      eventType,
      resource: "security",
      resourceId: "system",
      action: eventType,
      userId,
      workspaceId,
      correlationId,
      timestamp: new Date().toISOString(),
      metadata,
      outcome,
      errorMessage,
    }

    this.log("warn", auditEvent, "Audit log: Security event")
    return E.succeed(undefined)
  }
}
