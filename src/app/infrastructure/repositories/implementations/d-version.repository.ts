/**
 * DocumentVersion Repository - Declarative Implementation with Schema Validation
 * 
 * Uses Effect Schema for encode/decode with full validation.
 * Imports shared types from domain/shared directory.
 */

import { Effect, Option, pipe, Schema as S } from "effect";
import { eq, and, desc, sql, count } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { documentVersions } from "@/app/infrastructure/database/models";
import type { InferSelectModel } from "drizzle-orm";

import { DocumentVersionEntity } from "@/app/domain/d-version/entity";
import { DocumentVersionSchema, DocumentVersionRow, DocumentVersionCodec } from "@/app/domain/d-version/schema";
import {
  DocumentVersionValidationError,
} from "@/app/domain/d-version/errors";

// ============================================================================
// SHARED ERROR TYPES (from domain/shared/errors.ts)
// ============================================================================
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/app/domain/shared/errors";

// ============================================================================
// SHARED BRANDED TYPES (from domain/shared/uuid.ts)
// ============================================================================
import { DocumentId, DocumentVersionId } from "@/app/domain/shared/uuid";

type DocumentVersionModel = InferSelectModel<typeof documentVersions>;

/**
 * Filter interface for querying versions
 */
export interface DocumentVersionFilter {
  documentId?: string;
  version?: number;
  uploadedBy?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
}

/**
 * Pure error creation helpers using shared error types
 */
const Errors = {
  database: (operation: string, cause?: unknown) =>
    new DatabaseError({
      message: `${operation} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    }),

  notFound: (id: string, resource = "DocumentVersion") =>
    new NotFoundError({
      message: `${resource} not found`,
      resource,
      id,
    }),

  conflict: (message: string, field: string) =>
    new ConflictError(message, field),

  validation: (message: string, context: string) =>
    new ValidationError(message, context),
};

/**
 * DocumentVersion Repository Implementation
 */
export class DocumentVersionDrizzleRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ---------------------------------------------------------------------------
  // Private Helpers - Schema-based encoding/decoding
  // ---------------------------------------------------------------------------

  /**
   * Encodes a DocumentVersionEntity into database row format using Schema
   * Validates that all required fields are present and valid
   */
  private encodeVersion(
    version: DocumentVersionEntity
  ): Effect.Effect<DocumentVersionRow, ValidationError> {
    return pipe(
      Effect.try({
        try: () => {
          // Create serialized representation matching the domain schema
          const serialized = {
            id: version.id,
            documentId: version.documentId,
            version: version.version,
            filename: version.filename,
            mimeType: version.mimeType,
            size: version.size,
            storageKey: version.storageKey,
            storageProvider: version.storageProvider,
            checksum: Option.getOrNull(version.checksum),
            tags: Option.getOrNull(version.tags),
            metadata: Option.getOrNull(version.metadata),
            uploadedBy: version.uploadedBy,
            createdAt: version.createdAt,
          };

          // Validate and transform via codec
          return S.encodeSync(DocumentVersionCodec)(serialized);
        },
        catch: (err) =>
          Errors.validation(
            `Failed to encode version: ${err instanceof Error ? err.message : String(err)}`,
            "DocumentVersion"
          ),
      })
    );
  }

  /**
   * Decodes a database row into a DocumentVersionEntity using Schema
   * Validates that row matches schema before entity creation
   */
  private decodeVersion(
    row: DocumentVersionModel
  ): Effect.Effect<DocumentVersionEntity, ValidationError> {
    return pipe(
      Effect.try({
        try: () => {
          // Decode DB row through codec (validates schema)
          return S.decodeSync(DocumentVersionCodec)(row);
        },
        catch: (err) =>
          Errors.validation(
            `Failed to decode version: ${err instanceof Error ? err.message : String(err)}`,
            "DocumentVersion"
          ),
      }),
      // Create domain entity from validated decoded data
      Effect.flatMap((decoded) => DocumentVersionEntity.create(decoded))
    );
  }

  private fetchOne(
    query: () => Promise<DocumentVersionModel[]>
  ): Effect.Effect<Option.Option<DocumentVersionEntity>, DatabaseError | ValidationError> {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) => Errors.database("Query", err),
      }),
      Effect.map(Option.fromIterable),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) =>
            pipe(this.decodeVersion(row), Effect.map(Option.some)),
        })
      )
    );
  }

  private fetchMany(
    query: () => Promise<DocumentVersionModel[]>
  ): Effect.Effect<DocumentVersionEntity[], DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) => Errors.database("Query", err),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodeVersion(row)))
      ),
      Effect.mapError((err) =>
        err instanceof DatabaseError ? err : Errors.database("Decode", err)
      )
    );
  }

  private executeWrite(
    operation: () => Promise<any>
  ): Effect.Effect<void, DatabaseError | ConflictError> {
    return Effect.tryPromise({
      try: operation,
      catch: (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes("unique") || msg.includes("duplicate")
          ? Errors.conflict(msg, "version")
          : Errors.database("Write", err);
      },
    }).pipe(Effect.as(void 0));
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  /**
   * Find version by ID using DocumentVersionId (branded UUID from shared)
   */
  findById(
    id: DocumentVersionId
  ): Effect.Effect<Option.Option<DocumentVersionEntity>, DatabaseError> {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, id))
        .limit(1)
    ).pipe(
      Effect.mapError((err) =>
        err instanceof DatabaseError ? err : Errors.database(`Find ${id}`, err)
      )
    );
  }

  /**
   * Find version by document ID and version number using DocumentId (branded UUID)
   */
  findByDocumentIdAndVersion(
    documentId: DocumentId,
    version: number
  ): Effect.Effect<Option.Option<DocumentVersionEntity>, DatabaseError> {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, documentId),
            eq(documentVersions.version, version)
          )
        )
        .limit(1)
    );
  }

  /**
   * Find all versions for a document using DocumentId (branded UUID)
   */
  findByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<DocumentVersionEntity[], DatabaseError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version))
    );
  }

  /**
   * Find latest version for a document
   */
  findLatestByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<Option.Option<DocumentVersionEntity>, DatabaseError> {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version))
        .limit(1)
    );
  }

  /**
   * Get next version number for a document
   */
  getNextVersionNumber(documentId: DocumentId): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const result = await this.db
            .select({
              maxVersion: sql<number>`COALESCE(MAX(${documentVersions.version}), 0)`,
            })
            .from(documentVersions)
            .where(eq(documentVersions.documentId, documentId));

          return Number(result[0]?.maxVersion ?? 0) + 1;
        },
        catch: (err) => Errors.database("Get next version", err),
      })
    );
  }

  /**
   * Check if version exists
   */
  exists(id: DocumentVersionId): Effect.Effect<boolean, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: documentVersions.id })
            .from(documentVersions)
            .where(eq(documentVersions.id, id))
            .limit(1),
        catch: (err) => Errors.database("Check exists", err),
      }),
      Effect.map((rows) => rows.length > 0)
    );
  }

  /**
   * Count versions for a document
   */
  count(documentId: DocumentId): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const result = await this.db
            .select({ count: count() })
            .from(documentVersions)
            .where(eq(documentVersions.documentId, documentId));
          return Number(result[0]?.count ?? 0);
        },
        catch: (err) => Errors.database("Count", err),
      })
    );
  }

  /**
   * Find versions by checksum (for duplicate detection)
   */
  findByChecksum(checksum: string): Effect.Effect<DocumentVersionEntity[], DatabaseError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.checksum, checksum))
    );
  }

  // ---------------------------------------------------------------------------
  // Write Operations (Immutable - Insert Only)
  // ---------------------------------------------------------------------------

  /**
   * Save a new version (insert only, immutable)
   */
  save(
    version: DocumentVersionEntity
  ): Effect.Effect<DocumentVersionEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.encodeVersion(version),
      Effect.flatMap((row) =>
        this.executeWrite(() => this.db.insert(documentVersions).values(row as any))
      ),
      Effect.as(version)
    );
  }

  /**
   * Delete version by ID
   */
  delete(id: DocumentVersionId): Effect.Effect<boolean, DatabaseError | NotFoundError> {
    return pipe(
      this.exists(id),
      Effect.flatMap((exists) =>
        exists
          ? (pipe(
              this.executeWrite(() =>
                this.db.delete(documentVersions).where(eq(documentVersions.id, id))
              ),
              Effect.as(true)
            ) as Effect.Effect<boolean, DatabaseError | NotFoundError>)
          ? Effect.fail(
              Errors.notFound(id)
            ) as Effect.Effect<boolean, DatabaseError | NotFoundError>
      )
    );
  }

  /**
   * Delete all versions for a document (cascade operation)
   */
  deleteByDocumentId(documentId: DocumentId): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const result = await this.db
            .delete(documentVersions)
            .where(eq(documentVersions.documentId, documentId));
          return result.rowCount ?? 0;
        },
        catch: (err) => Errors.database("Delete cascade", err),
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  /**
   * Get repository statistics
   */
  getStats(): Effect.Effect<{
    totalVersions: number;
    totalSize: number;
    versionsByMimeType: Record<string, number>;
    averageVersionsPerDocument: number;
  }, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const [countResult, sizeResult, mimeTypeResult, docCountResult] = await Promise.all([
            this.db.select({ count: count() }).from(documentVersions),
            this.db
              .select({ total: sql<number>`COALESCE(SUM(${documentVersions.size}), 0)` })
              .from(documentVersions),
            this.db
              .select({ mimeType: documentVersions.mimeType, count: count() })
              .from(documentVersions)
              .groupBy(documentVersions.mimeType),
            this.db
              .select({
                count: sql<number>`COUNT(DISTINCT ${documentVersions.documentId})`,
              })
              .from(documentVersions),
          ]);

          const totalVersions = Number(countResult[0]?.count ?? 0);
          const totalSize = Number(sizeResult[0]?.total ?? 0);
          const totalDocuments = Number(docCountResult[0]?.count ?? 1);

          return {
            totalVersions,
            totalSize,
            versionsByMimeType: mimeTypeResult.reduce(
              (acc, row) => ({
                ...acc,
                [row.mimeType]: Number(row.count),
              }),
              {} as Record<string, number>
            ),
            averageVersionsPerDocument:
              totalDocuments > 0
                ? Math.round((totalVersions / totalDocuments) * 100) / 100
                : 0,
          };
        },
        catch: (err) => Errors.database("Get stats", err),
      })
    );
  }
}