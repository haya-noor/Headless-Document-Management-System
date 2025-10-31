import { Effect, pipe } from "effect"
import { eq, desc, and } from "drizzle-orm"
import { AuditLogRepository, type AuditLogEntry } from "@/app/domain/audit-log/repository"
import { DatabaseError } from "@/app/domain/shared/base.errors"
import { auditLogs } from "@/app/infrastructure/database/models/audit-log-model"
import { databaseService } from "@/app/infrastructure/services/drizzle-service"
import crypto from "crypto"

export class AuditLogDrizzleRepository extends AuditLogRepository {
  constructor(private readonly db = databaseService.getDatabase()) {
    super()
  }

  save(entry: Omit<AuditLogEntry, "id" | "createdAt">): Effect.Effect<AuditLogEntry, DatabaseError, never> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const id = crypto.randomUUID()
          const createdAt = new Date()

          await this.db.insert(auditLogs).values({
            id,
            eventType: entry.eventType,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            action: entry.action,
            userId: entry.userId,
            workspaceId: entry.workspaceId,
            correlationId: entry.correlationId,
            status: entry.status,
            metadata: entry.metadata,
            errorMessage: entry.errorMessage,
            createdAt,
          })

          return {
            id,
            ...entry,
            createdAt,
          } as AuditLogEntry
        },
        catch: (error) => new DatabaseError({
          message: `Failed to save audit log: ${error}`,
          cause: error,
        }),
      })
    )
  }

  findByUserId(userId: string, limit: number = 100): Effect.Effect<AuditLogEntry[], DatabaseError, never> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const results = await this.db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.userId, userId))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)

          return results.map(row => ({
            id: row.id,
            eventType: row.eventType,
            resourceType: row.resourceType,
            resourceId: row.resourceId ?? undefined,
            action: row.action,
            userId: row.userId,
            workspaceId: row.workspaceId,
            correlationId: row.correlationId,
            status: row.status as "success" | "failure",
            metadata: row.metadata ?? undefined,
            errorMessage: row.errorMessage ?? undefined,
            createdAt: row.createdAt,
          })) as AuditLogEntry[]
        },
        catch: (error) => new DatabaseError({
          message: `Failed to find audit logs by user: ${error}`,
          cause: error,
        }),
      })
    )
  }

  /*
  A correlation ID is a unique identifier (usually a UUID) attached to a single request or 
  workflow execution. Every log, audit record, and call made while serving that request carries
 the same ID. That lets you “stitch” together everything that happened for that one request 
 across services, jobs, and retries.
  */
  findByCorrelationId(correlationId: string): Effect.Effect<AuditLogEntry[], DatabaseError, never> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const results = await this.db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.correlationId, correlationId))
            .orderBy(desc(auditLogs.createdAt))

          return results.map(row => ({
            id: row.id,
            eventType: row.eventType,
            resourceType: row.resourceType,
            resourceId: row.resourceId ?? undefined,
            action: row.action,
            userId: row.userId,
            workspaceId: row.workspaceId,
            correlationId: row.correlationId,
            status: row.status as "success" | "failure",
            metadata: row.metadata ?? undefined,
            errorMessage: row.errorMessage ?? undefined,
            createdAt: row.createdAt,
          })) as AuditLogEntry[]
        },
        catch: (error) => new DatabaseError({
          message: `Failed to find audit logs by correlation ID: ${error}`,
          cause: error,
        }),
      })
    )
  }

  findByResource(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Effect.Effect<AuditLogEntry[], DatabaseError, never> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const results = await this.db
            .select()
            .from(auditLogs)
            .where(
              and(
                eq(auditLogs.resourceType, resourceType),
                eq(auditLogs.resourceId, resourceId)
              )
            )
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)

          return results.map(row => ({
            id: row.id,
            eventType: row.eventType,
            resourceType: row.resourceType,
            resourceId: row.resourceId ?? undefined,
            action: row.action,
            userId: row.userId,
            workspaceId: row.workspaceId,
            correlationId: row.correlationId,
            status: row.status as "success" | "failure",
            metadata: row.metadata ?? undefined,
            errorMessage: row.errorMessage ?? undefined,
            createdAt: row.createdAt,
          })) as AuditLogEntry[]
        },
        catch: (error) => new DatabaseError({
          message: `Failed to find audit logs by resource: ${error}`,
          cause: error,
        }),
      })
    )
  }

  findByEventType(eventType: string, limit: number = 100): Effect.Effect<AuditLogEntry[], DatabaseError, never> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const results = await this.db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.eventType, eventType))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)

          return results.map(row => ({
            id: row.id,
            eventType: row.eventType,
            resourceType: row.resourceType,
            resourceId: row.resourceId ?? undefined,
            action: row.action,
            userId: row.userId,
            workspaceId: row.workspaceId,
            correlationId: row.correlationId,
            status: row.status as "success" | "failure",
            metadata: row.metadata ?? undefined,
            errorMessage: row.errorMessage ?? undefined,
            createdAt: row.createdAt,
          })) as AuditLogEntry[]
        },
        catch: (error) => new DatabaseError({
          message: `Failed to find audit logs by event type: ${error}`,
          cause: error,
        }),
      })
    )
  }
}

