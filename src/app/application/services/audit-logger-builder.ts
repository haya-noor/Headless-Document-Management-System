import { Effect as E, pipe } from "effect"
import { AuditLogRepository } from "@/app/domain/audit-log/repository"
import { UserId } from "@/app/domain/refined/uuid"
// UserContext and RPCContext types
export interface UserContext {
  readonly userId: string
  readonly workspaceId: string
  readonly roles: readonly ("admin" | "user")[]
  readonly correlationId: string
}

export interface RPCContext {
  readonly actorId: string
  readonly workspaceId: { _tag: "Some" | "None"; value?: string }
  readonly roles: readonly ("admin" | "user")[]
  readonly correlationId: string
}

/**
 * Builder Pattern for Audit Logging
 * Refactoring Guru Builder Pattern implementation
 * 
 * Reduces parameter passing (from 6+ parameters to fluent builder API)
 */
export class AuditLogBuilder {
  private eventType?: string
  private resourceType?: string
  private resourceId?: string
  private action?: string
  private userId?: UserId
  private workspaceId?: string
  private correlationId?: string
  private status: "success" | "failure" = "success"
  private metadata?: Record<string, unknown>
  private errorMessage?: string

  /**
   * Set event type (e.g., "document_created", "access_granted")
   */
  withEventType(eventType: string): this {
    this.eventType = eventType
    return this
  }

  /**
   * Set resource type (e.g., "document", "user", "access_policy")
   */
  forResource(resourceType: string, resourceId?: string): this {
    this.resourceType = resourceType
    if (resourceId) {
      this.resourceId = resourceId
    }
    return this
  }

  /**
   * Set action (e.g., "create", "update", "delete", "grant")
   */
  withAction(action: string): this {
    this.action = action
    return this
  }

  /**
   * Set user context (extracts userId, workspaceId, correlationId)
   */
  byUser(user: UserContext | RPCContext): this {
    if ("actorId" in user) {
      // RPCContext
      this.userId = user.actorId as UserId
      this.workspaceId = user.workspaceId._tag === "Some" && user.workspaceId.value
        ? user.workspaceId.value as string
        : "unknown"
    } else {
      // UserContext
      this.userId = user.userId as UserId
      this.workspaceId = user.workspaceId as string
    }
    this.correlationId = user.correlationId
    return this
  }

  /**
   * Set status
   */
  withStatus(status: "success" | "failure"): this {
    this.status = status
    return this
  }

  /**
   * Set metadata
   */
  withMetadata(metadata: Record<string, unknown>): this {
    this.metadata = metadata
    return this
  }

  /**
   * Set error message (for failures)
   */
  withError(errorMessage: string): this {
    this.errorMessage = errorMessage
    this.status = "failure"
    return this
  }

  /**
   * Build and persist audit log
   */
  log(repository: AuditLogRepository): E.Effect<void, never> {
    if (!this.eventType || !this.resourceType || !this.action || !this.userId || !this.workspaceId || !this.correlationId) {
      // Fail silently in production - log error
      console.error("Audit log incomplete:", {
        eventType: this.eventType,
        resourceType: this.resourceType,
        action: this.action,
        userId: this.userId,
        workspaceId: this.workspaceId,
        correlationId: this.correlationId,
      })
      return E.succeed(void 0)
    }

    return pipe(
      repository.save({
        eventType: this.eventType,
        resourceType: this.resourceType,
        resourceId: this.resourceId,
        action: this.action,
        userId: this.userId,
        workspaceId: this.workspaceId,
        correlationId: this.correlationId,
        status: this.status,
        metadata: this.metadata,
        errorMessage: this.errorMessage,
      }),
      E.map(() => void 0),
      E.orElse(() => E.succeed(void 0)) // Fail silently - audit logging shouldn't break business logic
    )
  }

  /**
   * Static factory method
   */
  static create(): AuditLogBuilder {
    return new AuditLogBuilder()
  }
}

