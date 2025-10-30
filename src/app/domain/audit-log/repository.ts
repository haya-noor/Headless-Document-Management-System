import { Effect } from "effect"
import { DatabaseError } from "@/app/domain/shared/base.errors"
import { UserId } from "@/app/domain/refined/uuid"

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  id: string
  eventType: string
  resourceType: string
  resourceId?: string
  action: string
  userId: UserId
  workspaceId: string
  correlationId: string
  status: "success" | "failure"
  metadata?: Record<string, unknown>
  errorMessage?: string
  createdAt: Date
}

/**
 * Audit Log Repository Interface
 * 
 * Persists audit trail for compliance and debugging
 */
export abstract class AuditLogRepository {
  protected readonly entityName = "AuditLog"

  /**
   * Save audit log entry
   */
  abstract save(
    entry: Omit<AuditLogEntry, "id" | "createdAt">
  ): Effect.Effect<AuditLogEntry, DatabaseError, never>

  /**
   * Find logs by user ID
   */
  abstract findByUserId(
    userId: UserId,
    limit?: number
  ): Effect.Effect<AuditLogEntry[], DatabaseError, never>

  /**
   * Find logs by correlation ID
   */
  abstract findByCorrelationId(
    correlationId: string
  ): Effect.Effect<AuditLogEntry[], DatabaseError, never>

  /**
   * Find logs by resource
   */
  abstract findByResource(
    resourceType: string,
    resourceId: string,
    limit?: number
  ): Effect.Effect<AuditLogEntry[], DatabaseError, never>

  /**
   * Find logs by event type
   */
  abstract findByEventType(
    eventType: string,
    limit?: number
  ): Effect.Effect<AuditLogEntry[], DatabaseError, never>
}

