/**
 * Document domain guards
 * Provides validation and type guards for document operations
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { DocumentIdVO, ChecksumVO, FileReferenceVO, DateTimeVO } from '../value-objects';
import { DocumentValidationError } from '../errors/document.errors';

/**
 * Document metadata schema
 */
export const DocumentMetadataSchema = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export type DocumentMetadata = Schema.Schema.Type<typeof DocumentMetadataSchema>;

/**
 * Document tags schema
 */
export const DocumentTagsSchema = Schema.Array(
  Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(50)
  )
);

export type DocumentTags = Schema.Schema.Type<typeof DocumentTagsSchema>;

/**
 * Document filename schema
 */
export const DocumentFilenameSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(255),
  Schema.filter(
    // it means that the filename should not contain any of the following characters:
    //  <, >, :, ", /, \, |, ?, *, \x00-\x1f
    (value) => /^[^<>:"/\\|?*\x00-\x1f]+$/.test(value),
    { message: () => 'Filename contains invalid characters' }
  )
);

export type DocumentFilename = Schema.Schema.Type<typeof DocumentFilenameSchema>;

/**
 * Document MIME type schema
 */
export const DocumentMimeTypeSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(100),
  Schema.filter(
    // it means that the MIME type should not contain any of the following characters:
    //  a-zA-Z0-9, !#$&\-\^_
    (value) => /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/.test(value),
    { message: () => 'Invalid MIME type format' }
  )
);

export type DocumentMimeType = Schema.Schema.Type<typeof DocumentMimeTypeSchema>;

/**
 * Document size schema
 */
export const DocumentSizeSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.filter(
    (value) => value <= 1073741824, // 1GB max
    { message: () => 'File size exceeds maximum limit of 1GB' }
  )
);

export type DocumentSize = Schema.Schema.Type<typeof DocumentSizeSchema>;

/**
 * Document version number schema
 */
export const DocumentVersionNumberSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.filter(
    (value) => value <= 999999,
    { message: () => 'Version number exceeds maximum limit' }
  )
);

export type DocumentVersionNumber = Schema.Schema.Type<typeof DocumentVersionNumberSchema>;


/**
 * Document permission schema
 */
export const DocumentPermissionSchema = Schema.Literal('read', 'write', 'delete');
export type DocumentPermission = Schema.Schema.Type<typeof DocumentPermissionSchema>;

/**
 * Guard functions for document validation
 */
export const DocumentGuards = {
  /**
   * Validate document ID
   */
  isValidDocumentId: (value: unknown): Effect.Effect<DocumentIdVO, DocumentValidationError, never> => {
    return DocumentIdVO.fromUnknown(value).pipe(
      Effect.mapError(() => new DocumentValidationError('id', value, 'Invalid document ID format'))
    );
  },

  /**
   * Validate checksum using the checksumVo defined in the value-objects/checksum.ts file
   */
  isValidChecksum: (value: unknown): Effect.Effect<ChecksumVO, DocumentValidationError, never> => {
    return ChecksumVO.fromUnknown(value).pipe(
      Effect.mapError(() => new DocumentValidationError('checksum', value, 'Invalid checksum format'))
    );
  },

  /**
   * Validate file reference
   */
  isValidFileReference: (value: unknown): Effect.Effect<FileReferenceVO, DocumentValidationError, never> => {
    return FileReferenceVO.fromUnknown(value).pipe(
      Effect.mapError(() => new DocumentValidationError('fileReference', value, 'Invalid file reference'))
    );
  },

  /**
   * Validate date time
   */
  isValidDateTime: (value: unknown): Effect.Effect<DateTimeVO, DocumentValidationError, never> => {
    return DateTimeVO.fromUnknown(value).pipe(
      Effect.mapError(() => new DocumentValidationError('dateTime', value, 'Invalid date time format'))
    );
  },

  /**
   * Validate document filename
   */
  isValidFilename: (value: unknown): Effect.Effect<DocumentFilename, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentFilenameSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('filename', value, 'Invalid filename format'))
    );
  },

  /**
   * Validate document MIME type
   */
  isValidMimeType: (value: unknown): Effect.Effect<DocumentMimeType, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentMimeTypeSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('mimeType', value, 'Invalid MIME type format'))
    );
  },

  /**
   * Validate document size
   */
  isValidSize: (value: unknown): Effect.Effect<DocumentSize, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentSizeSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('size', value, 'Invalid size value'))
    );
  },

  /**
   * Validate document version number
   */
  isValidVersionNumber: (value: unknown): Effect.Effect<DocumentVersionNumber, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentVersionNumberSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('version', value, 'Invalid version number'))
    );
  },

  /**
   * Validate document metadata
   */
  isValidMetadata: (value: unknown): Effect.Effect<DocumentMetadata, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentMetadataSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('metadata', value, 'Invalid metadata format'))
    );
  },

  /**
   * Validate document tags
   */
  isValidTags: (value: unknown): Effect.Effect<DocumentTags, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentTagsSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('tags', value, 'Invalid tags format'))
    );
  },


  /**
   * Validate document permission
   */
  isValidPermission: (value: unknown): Effect.Effect<DocumentPermission, DocumentValidationError, never> => {
    return Schema.decodeUnknown(DocumentPermissionSchema)(value).pipe(
      Effect.mapError(() => new DocumentValidationError('permission', value, 'Invalid permission type'))
    );
  }
};
