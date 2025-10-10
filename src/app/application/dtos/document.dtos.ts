/**
 * Document Data Transfer Objects using Effect Schema
 * DTOs for document-related API operations
 */

import { Schema } from '@effect/schema';

/**
 * Document upload DTO
 */
export const DocumentUploadDTOSchema = Schema.Struct({
  file: Schema.Unknown, // File upload - will be typed properly when implementing
  tags: Schema.Array(Schema.String),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  description: Schema.String
});

export type DocumentUploadDTO = Schema.Schema.Type<typeof DocumentUploadDTOSchema>;

/**
 * Document update DTO
 */
export const DocumentUpdateDTOSchema = Schema.Struct({
  filename: Schema.String,
  tags: Schema.Array(Schema.String),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  description: Schema.String
});

export type DocumentUpdateDTO = Schema.Schema.Type<typeof DocumentUpdateDTOSchema>;

/**
 * Document search DTO
 */
export const DocumentSearchDTOSchema = Schema.Struct({
  query: Schema.String,
  tags: Schema.Array(Schema.String),
  mimeType: Schema.String,
  uploadedBy: Schema.String,
  dateFrom: Schema.String,
  dateTo: Schema.String,
  minSize: Schema.Number,
  maxSize: Schema.Number,
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  page: Schema.Number,
  limit: Schema.Number,
  sortBy: Schema.String,
  sortOrder: Schema.String
});

export type DocumentSearchDTO = Schema.Schema.Type<typeof DocumentSearchDTOSchema>;

/**
 * Document permission DTO
 */
export const DocumentPermissionDTOSchema = Schema.Struct({
  userId: Schema.String,
  permission: Schema.Literal('read', 'write', 'delete')
});

export type DocumentPermissionDTO = Schema.Schema.Type<typeof DocumentPermissionDTOSchema>;

/**
 * Multiple permissions DTO
 */
export const DocumentPermissionsDTOSchema = Schema.Struct({
  permissions: Schema.Array(DocumentPermissionDTOSchema)
});

export type DocumentPermissionsDTO = Schema.Schema.Type<typeof DocumentPermissionsDTOSchema>;

/**
 * Download link generation DTO
 */
export const DownloadLinkDTOSchema = Schema.Struct({
  expiresIn: Schema.Number,
  filename: Schema.String
});

export type DownloadLinkDTO = Schema.Schema.Type<typeof DownloadLinkDTOSchema>;

/**
 * Document metadata update DTO
 */
export const DocumentMetadataDTOSchema = Schema.Struct({
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown })
});

export type DocumentMetadataDTO = Schema.Schema.Type<typeof DocumentMetadataDTOSchema>;

/**
 * Document tags update DTO
 */
export const DocumentTagsDTOSchema = Schema.Struct({
  tags: Schema.Array(Schema.String)
});

export type DocumentTagsDTO = Schema.Schema.Type<typeof DocumentTagsDTOSchema>;
