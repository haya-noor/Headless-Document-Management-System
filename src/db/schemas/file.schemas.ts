/**
 * File-related Zod validation schemas
 * Defines input validation for file management endpoints
 */

import { z } from 'zod';

/**
 * File upload schema
 * Validates file upload with optional metadata
 */
export const FileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File || (file && file.mimetype), {
    message: 'Valid file is required',
  }),
  key: z
    .string()
    .min(1, 'Key cannot be empty')
    .max(500, 'Key must be less than 500 characters')
    .regex(/^[a-zA-Z0-9\-_\/\.]+$/, 'Key can only contain alphanumeric characters, hyphens, underscores, slashes, and dots')
    .optional(),
  metadata: z
    .record(z.any())
    .optional()
    .default({}),
});

/**
 * Download link generation schema
 * Validates download link request parameters
 */
export const FileDownloadLinkSchema = z.object({
  key: z
    .string()
    .min(1, 'File key is required')
    .max(500, 'Key must be less than 500 characters'),
  expiresIn: z
    .number()
    .int('Expiration time must be an integer')
    .positive('Expiration time must be positive')
    .max(86400, 'Expiration time cannot exceed 24 hours (86400 seconds)')
    .optional()
    .default(3600), // 1 hour default
  filename: z
    .string()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename must be less than 255 characters')
    .optional(),
});

/**
 * File key parameter schema
 * Validates file key in URL parameters
 */
export const FileKeyParamSchema = z.object({
  key: z
    .string()
    .min(1, 'File key is required')
    .max(500, 'Key must be less than 500 characters'),
});

/**
 * File listing query schema
 * Validates file listing and search parameters
 */
export const FileListQuerySchema = z.object({
  prefix: z
    .string()
    .max(500, 'Prefix must be less than 500 characters')
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a valid number')
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 1000, 'Limit must be between 1 and 1000')
    .optional(),
});

/**
 * File download query schema
 * Validates download filename parameter
 */
export const FileDownloadQuerySchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename must be less than 255 characters')
    .optional(),
});

/**
 * File metadata response schema
 * Defines the structure of file metadata
 */
export const FileMetadataSchema = z.object({
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  lastModified: z.date(),
  etag: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * File operation response schema
 * Standard response format for file operations
 */
export const FileOperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.string().optional(),
});

/**
 * Bulk file operation schema
 * For operations that affect multiple files
 */
export const BulkFileOperationSchema = z.object({
  keys: z
    .array(z.string().min(1).max(500))
    .min(1, 'At least one file key is required')
    .max(100, 'Cannot process more than 100 files at once'),
  operation: z.enum(['delete', 'copy', 'move']),
  destination: z
    .string()
    .max(500, 'Destination path must be less than 500 characters')
    .optional(),
});

// Export types for TypeScript usage
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type FileDownloadLink = z.infer<typeof FileDownloadLinkSchema>;
export type FileKeyParam = z.infer<typeof FileKeyParamSchema>;
export type FileListQuery = z.infer<typeof FileListQuerySchema>;
export type FileDownloadQuery = z.infer<typeof FileDownloadQuerySchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type FileOperationResponse = z.infer<typeof FileOperationResponseSchema>;
export type BulkFileOperation = z.infer<typeof BulkFileOperationSchema>;
