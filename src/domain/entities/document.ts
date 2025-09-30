/**
 * Document domain entity
 * Represents a document with immutable state and business invariants
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { DocumentIdVO, ChecksumVO, DateTimeVO } from '../value-objects';

/**
 * Document entity schema
 * Defines the structure and validation rules for a document
 * .pipe method allow chaining of functions like compositon of functions
 */
export const DocumentSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('DocumentId')),
  filename: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ),
  originalName: Schema.String.pipe(
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
  currentVersion: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
});

// With schema.schema.Type  the static Document automatically matches the type of DocumentSchema 
// if we add a new field to DocumentSchema, that'll be automatically added to the Document type so no need to manually add it to 
// the Document type
export type Document = Schema.Schema.Type<typeof DocumentSchema>;

/**
 * Uses the actual value object factory method with proper Effect handling
 * runSync is used to run the Effect synchronously, because we are in a synchronous context
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
 * Document entity class
 * Encapsulates business logic and invariants
 */
export class DocumentEntity {
  public readonly id: DocumentIdVO;
  public readonly filename: string;
  public readonly originalName: string;
  public readonly mimeType: string;
  public readonly size: number;
  public readonly storageKey: string;
  public readonly storageProvider: 'local' | 's3' | 'gcs';
  public readonly checksum?: ChecksumVO;
  public readonly tags: string[];
  public readonly metadata: Record<string, unknown>;
  public readonly uploadedBy: string;
  public readonly currentVersion: number;
  public readonly createdAt: DateTimeVO;
  public readonly updatedAt: DateTimeVO;

  /**
   * Private constructor - use static factory methods
   */
  private constructor(props: {
    id: DocumentIdVO;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storageKey: string;
    storageProvider: 'local' | 's3' | 'gcs';
    checksum?: ChecksumVO;
    tags: string[];
    metadata: Record<string, unknown>;
    uploadedBy: string;
    currentVersion: number;
    createdAt: DateTimeVO;
    updatedAt: DateTimeVO;
  }) {
    this.id = props.id;
    this.filename = props.filename;
    this.originalName = props.originalName;
    this.mimeType = props.mimeType;
    this.size = props.size;
    this.storageKey = props.storageKey;
    this.storageProvider = props.storageProvider;
    this.checksum = props.checksum;
    this.tags = props.tags;
    this.metadata = props.metadata;
    this.uploadedBy = props.uploadedBy;
    this.currentVersion = props.currentVersion;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new document
   */
  static create(props: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storageKey: string;
    storageProvider: 'local' | 's3' | 'gcs';
    checksum?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    uploadedBy: string;
  }): DocumentEntity {
    const id = createDocumentId(props.id);
    const checksum = props.checksum ? createChecksum(props.checksum) : undefined;
    const now = createCurrentDateTime();

    return new DocumentEntity({
      id,
      filename: props.filename,
      originalName: props.originalName,
      mimeType: props.mimeType,
      size: props.size,
      storageKey: props.storageKey,
      storageProvider: props.storageProvider,
      checksum,
      tags: props.tags || [],
      metadata: props.metadata || {},
      uploadedBy: props.uploadedBy,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now
    });
  }

  /**
   * Create document from persistence data
   */
  static fromPersistence(data: Document): DocumentEntity {
    const id = createDocumentId(data.id);
    const checksum = data.checksum ? createChecksum(data.checksum) : undefined;
    const createdAt = createDateTime(data.createdAt);
    const updatedAt = createDateTime(data.updatedAt);

    return new DocumentEntity({
      id,
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      storageKey: data.storageKey,
      storageProvider: data.storageProvider,
      checksum,
      // how does this syntax work? 
      // it's a spread operator, it's creating a new array with the same elements as 
      // the original array. So it's like this:
      // tags: [...data.tags] is the same as tags: data.tags.map(tag => tag)
      tags: [...data.tags],
      metadata: data.metadata,
      uploadedBy: data.uploadedBy,
      currentVersion: data.currentVersion,
      createdAt,
      updatedAt
    });
  }

  /**
   * Get document ID as string
   */
  getId(): string {
    return this.id.getValue();
  }

  /**
   * Get checksum as string
   */
  getChecksum(): string | undefined {
    return this.checksum?.getValue();
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): Document {
    return {
      id: this.id.getValue() as Document['id'],
      filename: this.filename,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      storageKey: this.storageKey,
      storageProvider: this.storageProvider,
      checksum: this.checksum?.getValue() as Document['checksum'],
      tags: this.tags,
      metadata: this.metadata,
      uploadedBy: this.uploadedBy as Document['uploadedBy'],
      currentVersion: this.currentVersion,
      createdAt: this.createdAt.getValue(),
      updatedAt: this.updatedAt.getValue()
    };
  }
}