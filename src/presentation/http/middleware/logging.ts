/**
 * Logging middleware and utilities
 * Provides structured logging for the application
 */

import { config } from '../../../config';

/**
 * Logger utility class
 * Provides structured logging with different log levels
 */
export class Logger {
  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(meta && { meta }),
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  static info(message: string, meta?: any): void {
    console.log(Logger.formatMessage('info', message, meta));
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  static warn(message: string, meta?: any): void {
    console.warn(Logger.formatMessage('warn', message, meta));
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  static error(message: string, meta?: any): void {
    console.error(Logger.formatMessage('error', message, meta));
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  static debug(message: string, meta?: any): void {
    if (config.server.isDevelopment) {
      console.log(Logger.formatMessage('debug', message, meta));
    }
  }
}

/**
 * Request logging utility for Elysia
 * Logs incoming requests with timing information
 */
export function logRequest(context: {
  method: string;
  url: string;
  headers: Record<string, string>;
  ip?: string;
}) {
  const requestId = context.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // Log incoming request
  Logger.info('Incoming request', {
    requestId,
    method: context.method,
    url: context.url,
    ip: context.ip,
    userAgent: context.headers['user-agent'],
  });

  return requestId;
}

/**
 * Log response completion
 */
export function logResponse(requestId: string, context: {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  contentLength?: number;
}) {
  const logLevel = context.statusCode >= 400 ? 'warn' : 'info';
  
  const logMethod = logLevel === 'warn' ? Logger.warn : Logger.info;
  logMethod('Request completed', {
    requestId,
    method: context.method,
    url: context.url,
    statusCode: context.statusCode,
    duration: `${context.duration}ms`,
    contentLength: context.contentLength || 0,
  });
}

/**
 * Audit logging utility
 * Logs security-relevant events for compliance
 */
export class AuditLogger {
  /**
   * Log authentication events
   * @param {Object} event - Authentication event details
   */
  static logAuth(event: {
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh';
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    reason?: string;
  }): void {
    Logger.info('Authentication event', {
      category: 'AUTH',
      ...event,
    });
  }

  /**
   * Log document access events
   * @param {Object} event - Document access event details
   */
  static logDocumentAccess(event: {
    action: 'view' | 'download' | 'upload' | 'update' | 'delete';
    documentId: string;
    userId: string;
    ip?: string;
    success: boolean;
    reason?: string;
  }): void {
    Logger.info('Document access event', {
      category: 'DOCUMENT_ACCESS',
      ...event,
    });
  }

  /**
   * Log permission changes
   * @param {Object} event - Permission change event details
   */
  static logPermissionChange(event: {
    action: 'grant' | 'revoke' | 'update';
    documentId: string;
    targetUserId: string;
    grantedBy: string;
    permission: string;
    ip?: string;
  }): void {
    Logger.info('Permission change event', {
      category: 'PERMISSION_CHANGE',
      ...event,
    });
  }

  /**
   * Log security events
   * @param {Object} event - Security event details
   */
  static logSecurity(event: {
    action: 'suspicious_activity' | 'rate_limit_exceeded' | 'invalid_token' | 'unauthorized_access';
    userId?: string;
    ip?: string;
    details?: any;
  }): void {
    Logger.warn('Security event', {
      category: 'SECURITY',
      ...event,
    });
  }
}
