/**
 * Audit-related interfaces
 */

import { AuditAction, MetadataValue } from '../types';

/**
 * Audit log interface
 */
export interface AuditLog {
  id: string;
  documentId?: string;
  userId: string;
  action: AuditAction;
  details: Record<string, MetadataValue>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
