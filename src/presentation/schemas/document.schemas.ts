/**
 * Document validation schemas using Effect Schema
 * Basic schemas without complex optional patterns
 */

import { Schema } from '@effect/schema';

/**
 * Document upload schema
 */
export const DocumentUploadSchema = Schema.Struct({
  file: Schema.Unknown, // Haven't typed this yet, because we don't know the type of the file yet
  tags: Schema.Array(Schema.String), // Array of strings
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  description: Schema.String
});
/*
DocumentUploadInput is the type of the input for the DocumentUploadSchema and it should
fullfill the DocumentUploadSchema 
schema.schema.Type is a typescript function that returns the type of the input for the schema
so DocumentUploadInput becomes:
type DocumentUploadInput = {
  file: unknown;                  // because you used Schema.Unknown
  tags: string[];                 // Schema.Array(Schema.String)
  metadata: Record<string, unknown>; // Schema.Record
  description: string;            // Schema.String
};

wihtout it we'd have to type the input manually like this:

*/

export type DocumentUploadInput = Schema.Schema.Type<typeof DocumentUploadSchema>;

/**
 * Document schema 
 */
export const DocumentUpdateSchema = Schema.Struct({
  filename: Schema.String,
  tags: Schema.Array(Schema.String),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  description: Schema.String
});

export type DocumentUpdateInput = Schema.Schema.Type<typeof DocumentUpdateSchema>;

/**
 * Document search filters schema
 */
export const DocumentSearchSchema = Schema.Struct({
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

export type DocumentSearchInput = Schema.Schema.Type<typeof DocumentSearchSchema>;

/**
 * Document permission schema
 */
export const DocumentPermissionSchema = Schema.Struct({
  userId: Schema.String,
  permission: Schema.Literal('read', 'write', 'delete')
});

export type DocumentPermissionInput = Schema.Schema.Type<typeof DocumentPermissionSchema>;

/**
 * Multiple permissions schema
 */
export const DocumentPermissionsSchema = Schema.Struct({
  permissions: Schema.Array(DocumentPermissionSchema)
});

export type DocumentPermissionsInput = Schema.Schema.Type<typeof DocumentPermissionsSchema>;

/**
 * Download link generation schema
 */
export const DownloadLinkSchema = Schema.Struct({
  expiresIn: Schema.Number,
  filename: Schema.String
});

export type DownloadLinkInput = Schema.Schema.Type<typeof DownloadLinkSchema>;

/**
 * Document metadata update schema
 */
export const DocumentMetadataSchema = Schema.Struct({
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown })
});

export type DocumentMetadataInput = Schema.Schema.Type<typeof DocumentMetadataSchema>;

/**
 * Document tags update schema
 */
export const DocumentTagsSchema = Schema.Struct({
  tags: Schema.Array(Schema.String)
});

export type DocumentTagsInput = Schema.Schema.Type<typeof DocumentTagsSchema>;

/**
 * Pagination parameters schema
 * the limit is the number of items to return per page
 */
export const PaginationSchema = Schema.Struct({
  page: Schema.Number,
  limit: Schema.Number
});

export type PaginationInput = Schema.Schema.Type<typeof PaginationSchema>;

/**
 * UUID parameter schema
 */
export const UUIDParamSchema = Schema.Struct({
  id: Schema.String
});

export type UUIDParamInput = Schema.Schema.Type<typeof UUIDParamSchema>;

/**
 * Document ID parameter schema
 */
export const DocumentIdParamSchema = Schema.Struct({
  id: Schema.String
});


export type DocumentIdParamInput = Schema.Schema.Type<typeof DocumentIdParamSchema>;

/**
 * Document version parameter schema
 */
export const DocumentVersionParamSchema = Schema.Struct({
  documentId: Schema.String,
  version: Schema.Number
});

export type DocumentVersionParamInput = Schema.Schema.Type<typeof DocumentVersionParamSchema>;