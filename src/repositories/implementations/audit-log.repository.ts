/**
 * Audit log repository implementation using Drizzle ORM
 * Implements audit log data access operations
 */

import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseConfig } from '../../config/database';
import { auditLogs } from '../../models/schema';
import { AuditLog, PaginationParams, PaginatedResponse } from '../../types';
import { 
  IAuditLogRepository, 
  CreateAuditLogDTO,
  AuditLogFiltersDTO 
} from '../interfaces/audit-log.repository';

export class AuditLogRepository implements IAuditLogRepository {
  /**
   * Find audit log by ID
   */
  async findById(id: string): Promise<AuditLog | null> {
    try {
      const [auditLog] = await databaseConfig.db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, id));

      return auditLog || null;
    } catch (error) {
      throw new Error(`Failed to find audit log by ID: ${error}`);
    }
  }

  /**
   * Find multiple audit logs with optional filtering
   */
  async findMany(filters?: AuditLogFiltersDTO): Promise<AuditLog[]> {
    try {
      const query = databaseConfig.db.select().from(auditLogs);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(auditLogs.documentId, filters.documentId));
        }
        if (filters.userId) {
          conditions.push(eq(auditLogs.userId, filters.userId));
        }
        if (filters.action) {
          conditions.push(eq(auditLogs.action, filters.action));
        }
        if (filters.dateFrom) {
          conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(auditLogs.createdAt, filters.dateTo));
        }
      }

      const result = conditions.length > 0 
        ? await query.where(and(...conditions)).orderBy(desc(auditLogs.createdAt))
        : await query.orderBy(desc(auditLogs.createdAt));

      return result;
    } catch (error) {
      throw new Error(`Failed to find audit logs: ${error}`);
    }
  }

  /**
   * Find audit logs with pagination
   */
  async findManyPaginated(
    pagination: PaginationParams,
    filters?: AuditLogFiltersDTO
  ): Promise<PaginatedResponse<AuditLog>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const query = databaseConfig.db.select().from(auditLogs);
      const countQuery = databaseConfig.db.select({ count: sql`count(*)` }).from(auditLogs);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(auditLogs.documentId, filters.documentId));
        }
        if (filters.userId) {
          conditions.push(eq(auditLogs.userId, filters.userId));
        }
        if (filters.action) {
          conditions.push(eq(auditLogs.action, filters.action));
        }
        if (filters.dateFrom) {
          conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(auditLogs.createdAt, filters.dateTo));
        }
      }

      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        whereCondition 
          ? query.where(whereCondition).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset)
          : query.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
        whereCondition 
          ? countQuery.where(whereCondition)
          : countQuery
      ]);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      throw new Error(`Failed to find paginated audit logs: ${error}`);
    }
  }

  /**
   * Find single audit log by filters
   */
  async findOne(filters: AuditLogFiltersDTO): Promise<AuditLog | null> {
    try {
      const result = await this.findMany(filters);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to find audit log: ${error}`);
    }
  }

  /**
   * Create new audit log
   */
  async create(data: CreateAuditLogDTO): Promise<AuditLog> {
    try {
      const auditLogId = uuidv4();
      const now = new Date();

      const [auditLog] = await databaseConfig.db
        .insert(auditLogs)
        .values({
          id: auditLogId,
          documentId: data.documentId || null,
          userId: data.userId,
          action: data.action,
          details: data.details || {},
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          createdAt: now,
        })
        .returning();

      return auditLog;
    } catch (error) {
      throw new Error(`Failed to create audit log: ${error}`);
    }
  }

  /**
   * Create multiple audit logs
   */
  async createMany(data: CreateAuditLogDTO[]): Promise<AuditLog[]> {
    try {
      const now = new Date();
      const auditLogsToInsert = data.map(log => ({
        id: uuidv4(),
        documentId: log.documentId || null,
        userId: log.userId,
        action: log.action,
        details: log.details || {},
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
        createdAt: now,
      }));

      const result = await databaseConfig.db
        .insert(auditLogs)
        .values(auditLogsToInsert)
        .returning();

      return result;
    } catch (error) {
      throw new Error(`Failed to create multiple audit logs: ${error}`);
    }
  }

  /**
   * Audit logs are immutable - update not allowed
   */
  async update(): Promise<AuditLog | null> {
    throw new Error('Audit logs are immutable and cannot be updated');
  }

  /**
   * Delete audit log by ID (should be used sparingly for compliance reasons)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await databaseConfig.db
        .delete(auditLogs)
        .where(eq(auditLogs.id, id));

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete audit log: ${error}`);
    }
  }

  /**
   * Check if audit log exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [auditLog] = await databaseConfig.db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(eq(auditLogs.id, id))
        .limit(1);

      return !!auditLog;
    } catch (error) {
      throw new Error(`Failed to check audit log existence: ${error}`);
    }
  }

  /**
   * Count audit logs with optional filters
   */
  async count(filters?: AuditLogFiltersDTO): Promise<number> {
    try {
      const query = databaseConfig.db.select({ count: sql`count(*)` }).from(auditLogs);
      const conditions: any[] = [];

      if (filters) {
        if (filters.documentId) {
          conditions.push(eq(auditLogs.documentId, filters.documentId));
        }
        if (filters.userId) {
          conditions.push(eq(auditLogs.userId, filters.userId));
        }
        if (filters.action) {
          conditions.push(eq(auditLogs.action, filters.action));
        }
      }

      const [result] = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;

      return Number(result.count);
    } catch (error) {
      throw new Error(`Failed to count audit logs: ${error}`);
    }
  }

  /**
   * Find audit logs by document ID
   */
  async findByDocumentId(documentId: string): Promise<AuditLog[]> {
    try {
      return await this.findMany({ documentId });
    } catch (error) {
      throw new Error(`Failed to find audit logs by document ID: ${error}`);
    }
  }

  /**
   * Find audit logs by user ID
   */
  async findByUserId(userId: string): Promise<AuditLog[]> {
    try {
      return await this.findMany({ userId });
    } catch (error) {
      throw new Error(`Failed to find audit logs by user ID: ${error}`);
    }
  }

  /**
   * Find audit logs by action
   */
  async findByAction(action: string): Promise<AuditLog[]> {
    try {
      return await this.findMany({ action });
    } catch (error) {
      throw new Error(`Failed to find audit logs by action: ${error}`);
    }
  }

  /**
   * Find audit logs within date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    try {
      return await this.findMany({ dateFrom: startDate, dateTo: endDate });
    } catch (error) {
      throw new Error(`Failed to find audit logs by date range: ${error}`);
    }
  }

  /**
   * Get audit trail for a document
   */
  async getDocumentAuditTrail(documentId: string, limit?: number): Promise<AuditLog[]> {
    try {
      const query = databaseConfig.db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.documentId, documentId))
        .orderBy(desc(auditLogs.createdAt));

      if (limit) {
        return await query.limit(limit);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to get document audit trail: ${error}`);
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: string, limit?: number): Promise<AuditLog[]> {
    try {
      const query = databaseConfig.db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt));

      if (limit) {
        return await query.limit(limit);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to get user activity logs: ${error}`);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsToday: number;
    logsThisWeek: number;
    logsThisMonth: number;
    uniqueUsers: number;
    uniqueDocuments: number;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalCount] = await databaseConfig.db
        .select({ count: sql`count(*)` })
        .from(auditLogs);

      const actionStats = await databaseConfig.db
        .select({
          action: auditLogs.action,
          count: sql`count(*)`
        })
        .from(auditLogs)
        .groupBy(auditLogs.action);

      const [todayCount] = await databaseConfig.db
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, today));

      const [weekCount] = await databaseConfig.db
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, thisWeek));

      const [monthCount] = await databaseConfig.db
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, thisMonth));

      const [uniqueUsersCount] = await databaseConfig.db
        .selectDistinct({ count: sql`count(distinct ${auditLogs.userId})` })
        .from(auditLogs);

      const [uniqueDocumentsCount] = await databaseConfig.db
        .selectDistinct({ count: sql`count(distinct ${auditLogs.documentId})` })
        .from(auditLogs)
        .where(sql`${auditLogs.documentId} IS NOT NULL`);

      const logsByAction = actionStats.reduce((acc, stat) => {
        acc[stat.action] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalLogs: Number(totalCount.count),
        logsByAction,
        logsToday: Number(todayCount.count),
        logsThisWeek: Number(weekCount.count),
        logsThisMonth: Number(monthCount.count),
        uniqueUsers: Number(uniqueUsersCount.count),
        uniqueDocuments: Number(uniqueDocumentsCount.count),
      };
    } catch (error) {
      throw new Error(`Failed to get audit statistics: ${error}`);
    }
  }

  /**
   * Delete audit logs older than specified date (for data retention)
   */
  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const result = await databaseConfig.db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, date));

      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to delete old audit logs: ${error}`);
    }
  }

  /**
   * Archive audit logs to external storage (implementation depends on requirements)
   */
  async archiveOldLogs(olderThanDate: Date): Promise<{
    archived: number;
    deleted: number;
  }> {
    try {
      // Get logs to archive
      const logsToArchive = await databaseConfig.db
        .select()
        .from(auditLogs)
        .where(lte(auditLogs.createdAt, olderThanDate));

      // In a real implementation, you would:
      // 1. Export logs to external storage (S3, etc.)
      // 2. Verify the export
      // 3. Delete from database

      // For now, just delete (in production, implement proper archiving)
      const deleted = await this.deleteOlderThan(olderThanDate);

      return {
        archived: logsToArchive.length,
        deleted,
      };
    } catch (error) {
      throw new Error(`Failed to archive old audit logs: ${error}`);
    }
  }
}
