/**
 * DocumentVersion domain entity
 * Represents an immutable document version with all metadata
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { DocumentIdVO, ChecksumVO, DateTimeVO } from '../value-objects';

/**
 * DocumentVersion entity schema
 * Defines the structure and validation rules for a document version
 */
export const DocumentVersionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('DocumentVersionId')),
  documentId: Schema.String.pipe(Schema.brand('DocumentId')),
  version: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ),
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
  ),
  storageKey: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(500)
  ),
  storageProvider: Schema.Literal('local', 's3', 'gcs'),
  checksum: Schema.String.pipe(Schema.brand('Checksum')),
  tags: Schema.Array(Schema.String),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  uploadedBy: Schema.String.pipe(Schema.brand('UserId')),
  createdAt: Schema.Date
});

export type DocumentVersion = Schema.Schema.Type<typeof DocumentVersionSchema>;

/**
 * Helper function to create DocumentIdVO from string
 * Uses the actual value object factory method with proper Effect handling
 */
function createDocumentId(value: string): DocumentIdVO {
  return Effect.runSync(DocumentIdVO.fromString(value));
}

/**
 * Helper function to create ChecksumVO from string
 * Uses the actual value object factory method with proper Effect handling
 */
function createChecksum(value: string): ChecksumVO {
  return Effect.runSync(ChecksumVO.fromString(value));
}

/**
 * Helper function to create DateTimeVO from Date
 * Uses the actual value object factory method with proper Effect handling
 */
function createDateTime(value: Date): DateTimeVO {
  return Effect.runSync(DateTimeVO.fromDate(value));
}

/**
 * Helper function to create current DateTimeVO
 * Uses the actual value object factory method with proper Effect handling
 */
function createCurrentDateTime(): DateTimeVO {
  return Effect.runSync(DateTimeVO.now());
}

/**
 * DocumentVersion entity class
 * Encapsulates business logic and invariants
 */
export class DocumentVersionEntity {
  public readonly id: string;
  public readonly documentId: DocumentIdVO;
  public readonly version: number;
  public readonly filename: string;
  public readonly mimeType: string;
  public readonly size: number;
  public readonly storageKey: string;
  public readonly storageProvider: 'local' | 's3' | 'gcs';
  private readonly checksum?: ChecksumVO;
  public readonly tags: string[];
  public readonly metadata: Record<string, unknown>;
  public readonly uploadedBy: string;
  public readonly createdAt: DateTimeVO;

  /**
   * Private constructor - use static factory methods
   */
  private constructor(props: {
    id: string;
    documentId: DocumentIdVO;
    version: number;
    filename: string;
    mimeType: string;
    size: number;
    storageKey: string;
    storageProvider: 'local' | 's3' | 'gcs';
    checksum?: ChecksumVO;
    tags: string[];
    metadata: Record<string, unknown>;
    uploadedBy: string;
    createdAt: DateTimeVO;
  }) {
    this.id = props.id;
    this.documentId = props.documentId;
    this.version = props.version;
    this.filename = props.filename;
    this.mimeType = props.mimeType;
    this.size = props.size;
    this.storageKey = props.storageKey;
    this.storageProvider = props.storageProvider;
    this.checksum = props.checksum;
    this.tags = props.tags;
    this.metadata = props.metadata;
    this.uploadedBy = props.uploadedBy;
    this.createdAt = props.createdAt;
  }

  /**
   * Create a new document version
   */
  static create(props: {
    id: string;
    documentId: string;
    version: number;
    filename: string;
    mimeType: string;
    size: number;
    storageKey: string;
    storageProvider: 'local' | 's3' | 'gcs';
    checksum?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    uploadedBy: string;
  }): DocumentVersionEntity {
    //use the createDocumentId, createChecksum, and createCurrentDateTime functions defined in document.ts file
    // to create the documentId, checksum, and now values
    const documentId = createDocumentId(props.documentId);
    const checksum = props.checksum ? createChecksum(props.checksum) : undefined;
    const now = createCurrentDateTime();

    return new DocumentVersionEntity({
      id: props.id,
      documentId,
      version: props.version,
      filename: props.filename,
      mimeType: props.mimeType,
      size: props.size,
      storageKey: props.storageKey,
      storageProvider: props.storageProvider,
      checksum,
      tags: props.tags || [],
      metadata: props.metadata || {},
      uploadedBy: props.uploadedBy,
      createdAt: now
    });
  }

  /**
   * Create document version from persistence data
   */
  static fromPersistence(data: DocumentVersion): DocumentVersionEntity {
    const documentId = createDocumentId(data.documentId);
    const checksum = data.checksum ? createChecksum(data.checksum) : undefined;
    const createdAt = createDateTime(data.createdAt);

    return new DocumentVersionEntity({
      id: data.id,
      documentId,
      version: data.version,
      filename: data.filename,
      mimeType: data.mimeType,
      size: data.size,
      storageKey: data.storageKey,
      storageProvider: data.storageProvider,
      checksum,
      tags: [...data.tags],
      metadata: data.metadata,
      uploadedBy: data.uploadedBy,
      createdAt
    });
  }

  /**
   * Get document ID as string
   */
  getDocumentId(): string {
    return this.documentId.getValue();
  }

  /**
   * Get checksum as string
   */
  getChecksum(): string | undefined {
    return this.checksum?.getValue();
  }

  /**
   * Get created at as Date
   */
  getCreatedAt(): Date {
    return this.createdAt.getValue();
  }

  /**
   * Check if this is the latest version
   */
  isLatestVersion(currentVersion: number): boolean {
    return this.version === currentVersion;
  }

  /**
   * Check if this version is newer than another
   */
  isNewerThan(otherVersion: number): boolean {
    return this.version > otherVersion;
  }

  /**
   * Check if this version is older than another
   */
  isOlderThan(otherVersion: number): boolean {
    return this.version < otherVersion;
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): DocumentVersion {
    return {
      id: this.id as DocumentVersion['id'],
      documentId: this.documentId.getValue() as DocumentVersion['documentId'],
      version: this.version,
      filename: this.filename,
      mimeType: this.mimeType,
      size: this.size,
      storageKey: this.storageKey,
      storageProvider: this.storageProvider,
      checksum: this.checksum?.getValue() as DocumentVersion['checksum'],
      tags: this.tags,
      metadata: this.metadata,
      uploadedBy: this.uploadedBy as DocumentVersion['uploadedBy'],
      createdAt: this.createdAt.getValue()
    };
  }
}