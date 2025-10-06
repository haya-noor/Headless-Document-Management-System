/**
 * Document-related interfaces
 */

import { MetadataValue, Permission } from '../types';

/**
 * Document entity interface
 */
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageProvider: string;
  checksum?: string;
  tags: string[];
  metadata: Record<string, MetadataValue>;
  uploadedBy: string;
  currentVersion: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document version interface for immutable versioning
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageProvider: string;
  checksum?: string;
  tags: string[];
  metadata: Record<string, MetadataValue>;
  uploadedBy: string;
  createdAt: Date;
}

/**
 * Document permission interface
 */
export interface DocumentPermission {
  id: string;
  documentId: string;
  userId: string;
  permission: Permission;
  grantedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document search filters
 */
export interface DocumentSearchFilters {
  filename?: string;
  mimeType?: string;
  tags?: string[];
  metadata?: Record<string, MetadataValue>;
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minSize?: number;
  maxSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  documentIds?: string[];
}
