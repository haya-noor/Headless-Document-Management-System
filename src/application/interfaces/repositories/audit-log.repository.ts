/**
 * Audit log repository interface
 * Defines audit log-specific data access operations for compliance tracking
 */

import { AuditLog, AuditAction } from '../../types';
import { BaseRepository } from './base.repository';

/**
 * Audit log creation data transfer object
 */
export interface CreateAuditLogDTO {
  documentId?: string;
  userId: string;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log filter data transfer object
 */
export interface AuditLogFiltersDTO {
  documentId?: string;
  userId?: string;
  action?: AuditAction;
  ipAddress?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Audit log repository interface
 * Extends base repository with audit-specific operations
 */
export interface IAuditLogRepository extends BaseRepository<
  AuditLog,
  CreateAuditLogDTO,
  never, // Audit logs are immutable - no updates allowed
  AuditLogFiltersDTO
> {
  /**
   * Find audit logs for a specific document
   * @param {string} documentId - Document unique identifier
   * @returns {Promise<AuditLog[]>} Array of audit logs for the document
   */
  findByDocumentId(documentId: string): Promise<AuditLog[]>;

  /**
   * Find audit logs for a specific user
   * @param {string} userId - User unique identifier
   * @returns {Promise<AuditLog[]>} Array of audit logs for the user
   */
  findByUserId(userId: string): Promise<AuditLog[]>;

  /**
   * Find audit logs by action type
   * @param {AuditAction} action - Action type to filter by
   * @returns {Promise<AuditLog[]>} Array of audit logs with specified action
   */
  findByAction(action: AuditAction): Promise<AuditLog[]>;

  /**
   * Find audit logs within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<AuditLog[]>} Array of audit logs within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;

  /**
   * Find audit logs by IP address
   * @param {string} ipAddress - IP address to filter by
   * @returns {Promise<AuditLog[]>} Array of audit logs from specified IP
   */
  findByIpAddress(ipAddress: string): Promise<AuditLog[]>;

  /**
   * Log document access event
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User unique identifier
   * @param {AuditAction} action - Action performed
   * @param {Object} options - Additional options
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  logDocumentAccess(
    documentId: string,
    userId: string,
    action: AuditAction,
    options?: {
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog>;

  /**
   * Log user authentication event
   * @param {string} userId - User unique identifier
   * @param {AuditAction} action - Authentication action
   * @param {Object} options - Additional options
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  logAuthEvent(
    userId: string,
    action: AuditAction,
    options?: {
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog>;

  /**
   * Log permission change event
   * @param {string} documentId - Document unique identifier
   * @param {string} userId - User whose permissions changed
   * @param {string} grantedBy - User who made the change
   * @param {AuditAction} action - Permission action
   * @param {Object} options - Additional options
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  logPermissionChange(
    documentId: string,
    userId: string,
    grantedBy: string,
    action: AuditAction,
    options?: {
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog>;

  /**
   * Get audit summary for a document
   * @param {string} documentId - Document unique identifier
   * @param {Date} dateFrom - Optional start date
   * @param {Date} dateTo - Optional end date
   * @returns {Promise<Object>} Audit summary
   */
  getDocumentAuditSummary(
    documentId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    uniqueUsers: number;
    lastActivity: Date | null;
  }>;

  /**
   * Get audit summary for a user
   * @param {string} userId - User unique identifier
   * @param {Date} dateFrom - Optional start date
   * @param {Date} dateTo - Optional end date
   * @returns {Promise<Object>} Audit summary
   */
  getUserAuditSummary(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    uniqueDocuments: number;
    lastActivity: Date | null;
  }>;

  /**
   * Get system-wide audit statistics
   * @param {Date} dateFrom - Optional start date
   * @param {Date} dateTo - Optional end date
   * @returns {Promise<Object>} System audit statistics
   */
  getSystemAuditStats(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    activeUsers: number;
    documentsAccessed: number;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topDocuments: Array<{ documentId: string; eventCount: number }>;
  }>;

  /**
   * Find suspicious activities
   * @param {Object} criteria - Criteria for suspicious activity detection
   * @returns {Promise<AuditLog[]>} Array of potentially suspicious audit logs
   */
  findSuspiciousActivities(criteria?: {
    maxDownloadsPerHour?: number;
    maxFailedLoginsPerHour?: number;
    unusualIpPatterns?: boolean;
  }): Promise<AuditLog[]>;

  /**
   * Clean up old audit logs
   * @param {Date} olderThan - Delete logs older than this date
   * @returns {Promise<number>} Number of logs deleted
   */
  cleanupOldLogs(olderThan: Date): Promise<number>;

  /**
   * Export audit logs for compliance
   * @param {AuditLogFiltersDTO} filters - Filters for export
   * @param {string} format - Export format ('json' | 'csv')
   * @returns {Promise<string>} Serialized audit data
   */
  exportAuditLogs(filters: AuditLogFiltersDTO, format: 'json' | 'csv'): Promise<string>;
}
