/**
 * Audit log repository implementation using Drizzle ORM
 * Implements audit log data access operations
 */

import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../../services';
import { auditLogs } from '../../db/models/schema';
import { AuditLog, AuditAction, PaginationParams, PaginatedResponse } from '../../types';
import { 
  IAuditLogRepository, 
  CreateAuditLogDTO,
  AuditLogFiltersDTO 
} from '../interfaces/audit-log.repository';

export class AuditLogRepository implements IAuditLogRepository {
  /**
   * Get database instance with null check
   */
  private getDb() {
    return databaseService.getDatabase();
  }

  /**
   * Transform database result to AuditLog type
   */
  private transformAuditLog(auditLog: any): AuditLog {
    return {
      ...auditLog,
      documentId: auditLog.documentId ?? undefined,
      details: auditLog.details ?? undefined,
      ipAddress: auditLog.ipAddress ?? undefined,
      userAgent: auditLog.userAgent ?? undefined,
    };
  }

  /**
   * Find audit log by ID
   */
  async findById(id: string): Promise<AuditLog | null> {
    try {
      const [auditLog] = await this.getDb()
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, id));

      return auditLog ? this.transformAuditLog(auditLog) : null;
    } catch (error) {
      throw new Error(`Failed to find audit log by ID: ${error}`);
    }
  }

  /**
   * Find multiple audit logs with optional filtering
   */
  async findMany(filters?: AuditLogFiltersDTO): Promise<AuditLog[]> {
    try {
      const query = this.getDb().select().from(auditLogs);
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

      return result.map(auditLog => this.transformAuditLog(auditLog));
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

      const query = this.getDb().select().from(auditLogs);
      const countQuery = this.getDb().select({ count: sql`count(*)` }).from(auditLogs);
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
        data: data.map(auditLog => this.transformAuditLog(auditLog)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
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

      const [auditLog] = await this.getDb()
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

      return this.transformAuditLog(auditLog);
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

      const result = await this.getDb()
        .insert(auditLogs)
        .values(auditLogsToInsert)
        .returning();

      return result.map(auditLog => this.transformAuditLog(auditLog));
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
      const result = await this.getDb()
        .delete(auditLogs)
        .where(eq(auditLogs.id, id));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete audit log: ${error}`);
    }
  }

  /**
   * Check if audit log exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [auditLog] = await this.getDb()
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
      const query = this.getDb().select({ count: sql`count(*)` }).from(auditLogs);
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
      return await this.findMany({ action: action as AuditAction });
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
      const query = this.getDb()
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.documentId, documentId))
        .orderBy(desc(auditLogs.createdAt));

      if (limit) {
        const result = await query.limit(limit);
        return result.map(auditLog => this.transformAuditLog(auditLog));
      }

      const result = await query;
      return result.map(auditLog => this.transformAuditLog(auditLog));
    } catch (error) {
      throw new Error(`Failed to get document audit trail: ${error}`);
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: string, limit?: number): Promise<AuditLog[]> {
    try {
      const query = this.getDb()
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt));

      if (limit) {
        const result = await query.limit(limit);
        return result.map(auditLog => this.transformAuditLog(auditLog));
      }

      const result = await query;
      return result.map(auditLog => this.transformAuditLog(auditLog));
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

      const [totalCount] = await this.getDb()
        .select({ count: sql`count(*)` })
        .from(auditLogs);

      const actionStats = await this.getDb()
        .select({
          action: auditLogs.action,
          count: sql`count(*)`
        })
        .from(auditLogs)
        .groupBy(auditLogs.action);

      const [todayCount] = await this.getDb()
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, today));

      const [weekCount] = await this.getDb()
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, thisWeek));

      const [monthCount] = await this.getDb()
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, thisMonth));

      const [uniqueUsersCount] = await this.getDb()
        .selectDistinct({ count: sql`count(distinct ${auditLogs.userId})` })
        .from(auditLogs);

      const [uniqueDocumentsCount] = await this.getDb()
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
      const result = await this.getDb()
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, date));

      return result.length;
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
      const logsToArchive = await this.getDb()
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

  /**
   * Find audit logs by IP address
   */
  async findByIpAddress(ipAddress: string): Promise<AuditLog[]> {
    try {
      return await this.findMany({ ipAddress });
    } catch (error) {
      throw new Error(`Failed to find audit logs by IP address: ${error}`);
    }
  }

  /**
   * Log document access event
   */
  async logDocumentAccess(
    documentId: string,
    userId: string,
    action: AuditAction,
    options?: {
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog> {
    try {
      return await this.create({
        documentId,
        userId,
        action,
        details: options?.details,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
    } catch (error) {
      throw new Error(`Failed to log document access: ${error}`);
    }
  }

  /**
   * Log user authentication event
   */
  async logAuthEvent(
    userId: string,
    action: AuditAction,
    options?: {
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog> {
    try {
      return await this.create({
        userId,
        action,
        details: options?.details,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
    } catch (error) {
      throw new Error(`Failed to log auth event: ${error}`);
    }
  }

  /**
   * Log permission change event
   */
  async logPermissionChange(
    documentId: string,
    userId: string,
    grantedBy: string,
    action: AuditAction,
    options?: {
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog> {
    try {
      return await this.create({
        documentId,
        userId,
        action,
        details: {
          ...options?.details,
          grantedBy,
        },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
    } catch (error) {
      throw new Error(`Failed to log permission change: ${error}`);
    }
  }

  /**
   * Get audit summary for a document
   */
  async getDocumentAuditSummary(
    documentId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    uniqueUsers: number;
    lastActivity: Date | null;
  }> {
    try {
      const filters: AuditLogFiltersDTO = { documentId };
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const logs = await this.findMany(filters);
      const eventsByAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<AuditAction, number>);

      const uniqueUsers = new Set(logs.map(log => log.userId)).size;
      const lastActivity = logs.length > 0 ? logs[0].createdAt : null;

      return {
        totalEvents: logs.length,
        eventsByAction,
        uniqueUsers,
        lastActivity,
      };
    } catch (error) {
      throw new Error(`Failed to get document audit summary: ${error}`);
    }
  }

  /**
   * Get audit summary for a user
   */
  async getUserAuditSummary(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    uniqueDocuments: number;
    lastActivity: Date | null;
  }> {
    try {
      const filters: AuditLogFiltersDTO = { userId };
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const logs = await this.findMany(filters);
      const eventsByAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<AuditAction, number>);

      const uniqueDocuments = new Set(logs.filter(log => log.documentId).map(log => log.documentId!)).size;
      const lastActivity = logs.length > 0 ? logs[0].createdAt : null;

      return {
        totalEvents: logs.length,
        eventsByAction,
        uniqueDocuments,
        lastActivity,
      };
    } catch (error) {
      throw new Error(`Failed to get user audit summary: ${error}`);
    }
  }

  /**
   * Get system-wide audit statistics
   */
  async getSystemAuditStats(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    activeUsers: number;
    documentsAccessed: number;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topDocuments: Array<{ documentId: string; eventCount: number }>;
  }> {
    try {
      const filters: AuditLogFiltersDTO = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const logs = await this.findMany(filters);
      const eventsByAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<AuditAction, number>);

      const userCounts = logs.reduce((acc, log) => {
        acc[log.userId] = (acc[log.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const documentCounts = logs
        .filter(log => log.documentId)
        .reduce((acc, log) => {
          acc[log.documentId!] = (acc[log.documentId!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const topUsers = Object.entries(userCounts)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      const topDocuments = Object.entries(documentCounts)
        .map(([documentId, eventCount]) => ({ documentId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      return {
        totalEvents: logs.length,
        eventsByAction,
        activeUsers: Object.keys(userCounts).length,
        documentsAccessed: Object.keys(documentCounts).length,
        topUsers,
        topDocuments,
      };
    } catch (error) {
      throw new Error(`Failed to get system audit stats: ${error}`);
    }
  }

  /**
   * Find suspicious activities
   */
  async findSuspiciousActivities(criteria?: {
    maxDownloadsPerHour?: number;
    maxFailedLoginsPerHour?: number;
    unusualIpPatterns?: boolean;
  }): Promise<AuditLog[]> {
    try {
      // This is a simplified implementation
      // In production, you'd implement more sophisticated detection algorithms
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLogs = await this.findMany({ dateFrom: oneHourAgo });

      // Filter for potential suspicious activities
      const suspicious = recentLogs.filter(log => {
        // Add your suspicious activity detection logic here
        return false; // Placeholder
      });

      return suspicious;
    } catch (error) {
      throw new Error(`Failed to find suspicious activities: ${error}`);
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(olderThan: Date): Promise<number> {
    try {
      return await this.deleteOlderThan(olderThan);
    } catch (error) {
      throw new Error(`Failed to cleanup old logs: ${error}`);
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(filters: AuditLogFiltersDTO, format: 'json' | 'csv'): Promise<string> {
    try {
      const logs = await this.findMany(filters);
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else {
        // Simple CSV export
        const headers = ['id', 'documentId', 'userId', 'action', 'details', 'ipAddress', 'userAgent', 'createdAt'];
        const csvRows = [
          headers.join(','),
          ...logs.map(log => [
            log.id,
            log.documentId || '',
            log.userId,
            log.action,
            JSON.stringify(log.details),
            log.ipAddress || '',
            log.userAgent || '',
            log.createdAt.toISOString()
          ].join(','))
        ];
        return csvRows.join('\n');
      }
    } catch (error) {
      throw new Error(`Failed to export audit logs: ${error}`);
    }
  }

  /**
   * Update multiple audit logs (not allowed for immutable logs)
   */
  async updateMany(): Promise<number> {
    throw new Error('Audit logs are immutable and cannot be updated');
  }

  /**
   * Delete multiple audit logs by filters
   */
  async deleteMany(filters: AuditLogFiltersDTO): Promise<number> {
    try {
      const conditions: any[] = [];

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

      const result = await this.getDb()
        .delete(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete multiple audit logs: ${error}`);
    }
  }
}
