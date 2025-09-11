/**
 * Core type definitions for the document management system
 * Defines interfaces, types, and enums used throughout the application
 */

import { Request } from 'express';

/**
 * User role enumeration for RBAC
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * Document permission types
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

/**
 * Audit log action types
 */
export enum AuditAction {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
}

/**
 * User entity interface
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document entity interface
 */
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  checksum?: string;
  tags: string[];
  metadata: Record<string, any>;
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
  s3Key: string;
  s3Bucket: string;
  checksum?: string;
  tags: string[];
  metadata: Record<string, any>;
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
 * Audit log interface
 */
export interface AuditLog {
  id: string;
  documentId?: string;
  userId: string;
  action: AuditAction;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Document search filters
 */
export interface DocumentSearchFilters {
  filename?: string;
  mimeType?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * File upload interface
 */
export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * S3 pre-signed URL response
 */
export interface PreSignedUrlResponse {
  url: string;
  expiresIn: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Repository interface for generic CRUD operations
 */
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findMany(filters?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
