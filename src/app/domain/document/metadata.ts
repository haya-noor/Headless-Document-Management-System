/**
 * FileReference (metadata) value object
 * Encapsulates file storage information with validation
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';

/**
 * Storage provider enum
 */
export const StorageProviderSchema = Schema.Literal('local', 's3', 'gcs');
export type StorageProvider = Schema.Schema.Type<typeof StorageProviderSchema>;

/**
 * FileReference value object schema
 * Validates file storage reference with provider and key
 */
export const FileReferenceSchema = Schema.Struct({
  storageKey: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(500)
  ),
  storageProvider: StorageProviderSchema,
  filename: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ),
  mimeType: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  size: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  )
}).pipe(
  Schema.brand('FileReference')
);

export type FileReference = Schema.Schema.Type<typeof FileReferenceSchema>;

/**
 * FileReference value object class
 * Provides static factory methods and validation
 */
export class FileReferenceVO {
  private constructor(
    private readonly storageKey: string,
    private readonly storageProvider: StorageProvider,
    private readonly filename: string,
    private readonly mimeType: string,
    private readonly size: number
  ) {}

  /**
   * Create FileReference(metadata) from object
   */
  static fromObject(data: {
    storageKey: string;
    storageProvider: StorageProvider;
    filename: string;
    mimeType: string;
    size: number;
  }): Effect.Effect<FileReferenceVO, any, never> {
    return Schema.decodeUnknown(FileReferenceSchema)(data).pipe(
      Effect.map((ref: any) => new FileReferenceVO(
        ref.storageKey,
        ref.storageProvider,
        ref.filename,
        ref.mimeType,
        ref.size
      ))
    );
  }

  /**
   * Create FileReference from unknown value like string, number, object, etc
   */
  static fromUnknown(value: unknown): Effect.Effect<FileReferenceVO, any, never> {
    return Schema.decodeUnknown(FileReferenceSchema)(value).pipe(
      Effect.map((ref: any) => new FileReferenceVO(
        ref.storageKey,
        ref.storageProvider,
        ref.filename,
        ref.mimeType,
        ref.size
      ))
    );
  }

  /**
   * Get storage key
   */
  getStorageKey(): string {
    return this.storageKey;
  }

  /**
   * Get storage provider
   */
  getStorageProvider(): StorageProvider {
    return this.storageProvider;
  }

  /**
   * Get filename
   */
  getFilename(): string {
    return this.filename;
  }

  /**
   * Get MIME type
   */
  getMimeType(): string {
    return this.mimeType;
  }

  /**
   * Get file size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Encode to object for persistence
   */
  encode(): FileReference {
    return {
      storageKey: this.storageKey,
      storageProvider: this.storageProvider,
      filename: this.filename,
      mimeType: this.mimeType,
      size: this.size
    } as FileReference;
  }

  /**
   * Check equality with another FileReference
   */
  equals(other: FileReferenceVO): boolean {
    return (
      this.storageKey === other.storageKey &&
      this.storageProvider === other.storageProvider &&
      this.filename === other.filename &&
      this.mimeType === other.mimeType &&
      this.size === other.size
    );
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.storageProvider}://${this.storageKey}`;
  }
}
