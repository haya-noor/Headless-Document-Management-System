/**
 * Parameter Data Transfer Objects using Effect Schema
 * URL parameter DTOs for API operations
 */

import { Schema } from '@effect/schema';

/**
 * UUID parameter DTO
 */
export const UUIDParamDTOSchema = Schema.Struct({
  id: Schema.String
});

export type UUIDParamDTO = Schema.Schema.Type<typeof UUIDParamDTOSchema>;

/**
 * Document ID parameter DTO
 */
export const DocumentIdParamDTOSchema = Schema.Struct({
  id: Schema.String
});

export type DocumentIdParamDTO = Schema.Schema.Type<typeof DocumentIdParamDTOSchema>;

/**
 * Document version parameter DTO
 */
export const DocumentVersionParamDTOSchema = Schema.Struct({
  documentId: Schema.String,
  version: Schema.Number
});

export type DocumentVersionParamDTO = Schema.Schema.Type<typeof DocumentVersionParamDTOSchema>;

/**
 * Pagination parameters DTO
 */
export const PaginationParamDTOSchema = Schema.Struct({
  page: Schema.Number,
  limit: Schema.Number
});

export type PaginationParamDTO = Schema.Schema.Type<typeof PaginationParamDTOSchema>;
