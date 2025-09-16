/**
 * Document validation schemas using Zod
 * Defines validation rules for document operations
 */

import { z } from 'zod';

/**
 * Document upload schema
 * Validates file upload with metadata
 */
export const DocumentUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File || (file && file.mimetype), {
    message: 'Valid file is required',
  }),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  metadata: z.record(z.any()).optional().default({}),
  description: z.string().optional(),
});

/**
 * Document update schema
 * Validates document metadata updates
 */
export const DocumentUpdateSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  metadata: z.record(z.any()).optional(),
  description: z.string().optional(),
});

/**
 * Document search filters schema
 * Validates search and filter parameters
 */
export const DocumentSearchSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minSize: z.number().int().positive().optional(),
  maxSize: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'filename', 'size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Document permission schema
 * Validates permission operations
 */
export const DocumentPermissionSchema = z.object({
  userId: z.string().uuid(),
  permission: z.enum(['read', 'write', 'delete']),
});

/**
 * Multiple permissions schema
 * Validates bulk permission operations
 */
export const DocumentPermissionsSchema = z.object({
  permissions: z.array(DocumentPermissionSchema),
});

/**
 * Download link generation schema
 * Validates download link parameters
 */
export const DownloadLinkSchema = z.object({
  expiresIn: z.number().int().positive().max(86400).default(3600), // Max 24 hours, default 1 hour
  filename: z.string().optional(),
});

/**
 * Document metadata update schema
 * Validates metadata-only updates
 */
export const DocumentMetadataSchema = z.object({
  metadata: z.record(z.any()),
});

/**
 * Document tags update schema
 * Validates tags-only updates
 */
export const DocumentTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(50)),
});

/**
 * Pagination parameters schema
 * Validates pagination options
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * UUID parameter schema
 * Validates UUID parameters
 */
export const UUIDParamSchema = z.object({
  id: z.string().uuid(),
});

// Export types inferred from schemas
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>;
export type DocumentSearchInput = z.infer<typeof DocumentSearchSchema>;
export type DocumentPermissionInput = z.infer<typeof DocumentPermissionSchema>;
export type DocumentPermissionsInput = z.infer<typeof DocumentPermissionsSchema>;
export type DownloadLinkInput = z.infer<typeof DownloadLinkSchema>;
export type DocumentMetadataInput = z.infer<typeof DocumentMetadataSchema>;
export type DocumentTagsInput = z.infer<typeof DocumentTagsSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type UUIDParamInput = z.infer<typeof UUIDParamSchema>;
