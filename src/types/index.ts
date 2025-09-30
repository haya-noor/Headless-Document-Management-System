/**
 * Core type definitions for the document management system
 * Defines interfaces, types, and enums used throughout the application
 */

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
 * Metadata value type - can be string, number, boolean, or null
 */
export type MetadataValue = string | number | boolean | null;

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
 * Authenticated request context for Elysia
 */
export interface AuthenticatedContext {
  user: JWTPayload;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    ip?: string;
  };
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

/**
 * File upload interface
 */
export interface FileUpload {
  buffer: Buffer;
  originalname?: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * S3 pre-signed URL response
 */
export interface PreSignedUrlResponse {
  url: string;
  expiresIn: number;
  expiresAt: Date;
}

/**
 * API response wrapper
 * ApiResponse is a generic type that can be used to return any type of data
 * data return type is T becasue different endpoints return different types of data so we need to be able to return any type of data
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;   
  error?: string;
}

/**
 * Repository interface for generic CRUD operations
 * Repository is a generic type that can be used to return any type of data
 * findById: the promise returns a T or null, T becasue we want to return the type of data that the repository is returning, it 
 * could be a user, a document, a document version, etc. 
 * findMany: the promise returns an array of T, T becasue we want to return the type of data that the repository is returning, it  
 * could be an array of users, a array of documents, a array of document versions, etc. 
 * create: the promise returns a T, T becasue we want to return the type of data that the repository is returning, and partial becasue 
 * we want to be able to create a new entity with only some of the properties
 * update: the promise returns a T or null, T becasue we want to return the type of data that the repository is returning, and 
 * partial becasue we want to be able to update an entity with only some of the properties
 */
export interface Repository<T> {
  findById(_id: string): Promise<T | null>;
  findMany(_filters?: Record<string, unknown>): Promise<T[]>;
  create(_data: Partial<T>): Promise<T>;
  update(_id: string, _data: Partial<T>): Promise<T | null>;
  delete(_id: string): Promise<boolean>;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
