import { Effect as E, Option as O, pipe } from "effect"
import { eq, and, desc, sql, count } from "drizzle-orm"

import { databaseService } from "@/app/infrastructure/services/drizzle-service"
import { documentVersions } from "@/app/infrastructure/database/models"
import type { InferSelectModel } from "drizzle-orm"

type DocumentVersionModel = InferSelectModel<typeof documentVersions>

import { DocumentVersionEntity } from "@/app/domain/d-version/entity"
import {
  DocumentVersionNotFoundError,
  DocumentVersionValidationError,
  DocumentVersionAlreadyExistsError,
} from "@/app/domain/d-version/errors"
import { DocumentVersionFilter } from "@/app/domain/d-version/repository"
import {
  DatabaseError,
} from "@/app/domain/shared/base.errors"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/refined/uuid"

/**
 * Drizzle-based DocumentVersion Repository Implementation
 *
 * Uses Effect patterns for composable, type-safe database operations.
 * Follows the reference architecture with clean helper methods.
 * 
 * Note: DocumentVersions are immutable - only insert operations are supported (no updates).
 */
export class DocumentVersionDrizzleRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ========== Serialization Helpers ==========

  /**
   * Serialize entity to database format using Effect Schema
   *
   * Uses entity's serialized() method which automatically handles:
   * - Option<T> → T | undefined
   * - Branded types → primitives
   * - Date objects preserved for database
   */
  private toDbSerialized(version: DocumentVersionEntity): E.Effect<Record<string, any>, DocumentVersionValidationError, never> {
    return E.sync(() => ({
      id: version.id,
      documentId: version.documentId,
      version: version.version,
      filename: version.filename,
      mimeType: version.mimeType,
      size: version.size,
      storageKey: version.storageKey,
      storageProvider: version.storageProvider,
      checksum: O.getOrNull(version.checksum),
      tags: O.getOrNull(version.tags),
      metadata: O.getOrNull(version.metadata),
      uploadedBy: version.uploadedBy,
      createdAt: version.createdAt
    }))
  }

  /**
   * Deserialize database row to entity using Effect Schema
   *
   * Converts database row → domain entity using DocumentVersionEntity.create
   */
  private fromDbRow(row: DocumentVersionModel): E.Effect<DocumentVersionEntity, DocumentVersionValidationError, never> {
    return DocumentVersionEntity.create({
      id: row.id,
      documentId: row.documentId,
      version: row.version,
      filename: row.filename,
      mimeType: row.mimeType,
      size: row.size,
      storageKey: row.storageKey,
      storageProvider: row.storageProvider,
      checksum: row.checksum ?? undefined,
      tags: row.tags ?? undefined,
      metadata: row.metadata ?? undefined,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
    })
  }

  // ========== Query Helpers ==========

  /**
   * Execute a database query with error handling
   */
  private executeQuery<T>(query: () => Promise<T>): E.Effect<T, DatabaseError> {
    return E.tryPromise({
      try: query,
      catch: (error) => DatabaseError.forOperation(
        "query",
        error instanceof Error ? error : new Error(String(error))
      )
    })
  }

  /**
   * Fetch a single version record
   */
  private fetchSingle(
    query: () => Promise<DocumentVersionModel[]>
  ): E.Effect<O.Option<DocumentVersionEntity>, DatabaseError | DocumentVersionValidationError, never> {
    return pipe(
      this.executeQuery(query),
      E.map(O.fromIterable),
      E.flatMap((option) =>
        O.match(option, {
          onNone: () => E.succeed(O.none()),
          onSome: (row) => pipe(
            this.fromDbRow(row),
            E.map(O.some)
          )
        })
      )
    ) as E.Effect<O.Option<DocumentVersionEntity>, DatabaseError | DocumentVersionValidationError, never>
  }

  /**
   * Ensure version exists, fail with DocumentVersionNotFoundError if not
   */
  private ensureExists(id: string): E.Effect<void, DocumentVersionNotFoundError, never> {
    return pipe(
      this.exists(id as DocumentVersionId),
      E.flatMap((exists) =>
        exists
          ? E.succeed(undefined as void)
          : E.fail(DocumentVersionNotFoundError.forResource("DocumentVersion", id))
      )
    ) as E.Effect<void, DocumentVersionNotFoundError, never>
  }

  // ---------------------------------------------------------------------------
  // Repository Interface
  // ---------------------------------------------------------------------------

  /**
   * Find version by ID
   */
  findById(
    id: DocumentVersionId
  ): E.Effect<O.Option<DocumentVersionEntity>, DatabaseError | DocumentVersionValidationError> {
    return this.fetchSingle(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, id))
        .limit(1)
    )
  }

  /**
   * Find version by document ID and version number
   */
  findByDocumentIdAndVersion(
    documentId: DocumentId,
    version: number
  ): E.Effect<O.Option<DocumentVersionEntity>, DatabaseError | DocumentVersionValidationError> {
    return this.fetchSingle(() =>
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
    )
  }

  /**
   * Find all versions for a document
   */
  findByDocumentId(
    documentId: DocumentId
  ): E.Effect<DocumentVersionEntity[], DatabaseError | DocumentVersionValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(documentVersions)
          .where(eq(documentVersions.documentId, documentId))
          .orderBy(desc(documentVersions.version))
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DocumentVersionEntity[], DatabaseError | DocumentVersionValidationError, never>
  }

  /**
   * Find latest version for a document
   */
  findLatestByDocumentId(
    documentId: DocumentId
  ): E.Effect<O.Option<DocumentVersionEntity>, DatabaseError | DocumentVersionValidationError> {
    return this.fetchSingle(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version))
        .limit(1)
    )
  }

  /**
   * Get next version number for a document
   */
  getNextVersionNumber(documentId: DocumentId): E.Effect<number, DatabaseError> {
    return pipe(
      this.executeQuery(async () => {
        const result = await this.db
          .select({
            maxVersion: sql<number>`COALESCE(MAX(${documentVersions.version}), 0)`,
          })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, documentId))

        return Number(result[0]?.maxVersion ?? 0) + 1
      })
    )
  }

  /**
   * Check if version exists
   */
  exists(id: DocumentVersionId): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select({ id: documentVersions.id })
          .from(documentVersions)
          .where(eq(documentVersions.id, id))
          .limit(1)
      ),
      E.map((result) => result.length > 0)
    )
  }

  /**
   * Count versions for a document
   */
  count(documentId: DocumentId): E.Effect<number, DatabaseError> {
    return pipe(
      this.executeQuery(async () => {
        const result = await this.db
          .select({ count: count() })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, documentId))
        return Number(result[0]?.count ?? 0)
      })
    )
  }

  /**
   * Find versions by checksum (for duplicate detection)
   */
  findByChecksum(checksum: string): E.Effect<DocumentVersionEntity[], DatabaseError | DocumentVersionValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(documentVersions)
          .where(eq(documentVersions.checksum, checksum))
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DocumentVersionEntity[], DatabaseError | DocumentVersionValidationError, never>
  }

  /**
   * Fetch single version by checksum (returns Option)
   */
  fetchByChecksum(checksum: string): E.Effect<O.Option<DocumentVersionEntity>, DatabaseError | DocumentVersionValidationError> {
    return this.fetchSingle(() =>
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.checksum, checksum))
        .limit(1)
    )
  }

  /**
   * Delete version by ID
   */
  delete(id: DocumentVersionId): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        E.if(exists, {
          onTrue: () =>
            pipe(
              E.tryPromise({
                try: () => this.db.delete(documentVersions).where(eq(documentVersions.id, id)),
                catch: (error) => DatabaseError.forOperation("delete", error)
              }),
              E.as(true)
            ),
          onFalse: () => E.succeed(false)
        })
      )
    )
  }

  /**
   * Delete all versions for a document (cascade operation)
   */
  deleteByDocumentId(documentId: DocumentId): E.Effect<number, DatabaseError> {
    return pipe(
      this.executeQuery(async () => {
        const result = await this.db
          .delete(documentVersions)
          .where(eq(documentVersions.documentId, documentId))
        return result.rowCount ?? 0
      })
    )
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  /**
   * Get repository statistics
   */
  getStats(): E.Effect<{
    totalVersions: number
    totalSize: number
    versionsByMimeType: Record<string, number>
    averageVersionsPerDocument: number
  }, DatabaseError> {
    return pipe(
      this.executeQuery(async () => {
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
        ])

        const totalVersions = Number(countResult[0]?.count ?? 0)
        const totalSize = Number(sizeResult[0]?.total ?? 0)
        const totalDocuments = Number(docCountResult[0]?.count ?? 1)

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
        }
      })
    )
  }

  /**
   * Insert a new document version
   */
  private insert(
    version: DocumentVersionEntity
  ): E.Effect<DocumentVersionEntity, DocumentVersionValidationError | DocumentVersionAlreadyExistsError, never> {
    return pipe(
      this.toDbSerialized(version),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.insert(documentVersions).values(dbData as any),
          catch: (error) => {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
              return DocumentVersionAlreadyExistsError.forField(
                `documentId: ${version.documentId}, version: ${version.version}`,
                { documentId: version.documentId, version: version.version }
              )
            }
            return DocumentVersionValidationError.forField(
              "documentVersion",
              { versionId: version.id },
              errorMsg
            )
          }
        })
      ),
      E.as(version)
    ) as E.Effect<DocumentVersionEntity, DocumentVersionValidationError | DocumentVersionAlreadyExistsError, never>
  }

  /**
   * Update an existing document version
   */
  private update(
    version: DocumentVersionEntity
  ): E.Effect<DocumentVersionEntity, DocumentVersionValidationError, never> {
    return pipe(
      this.toDbSerialized(version),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.update(documentVersions).set(dbData as any).where(eq(documentVersions.id, version.id)),
          catch: (error) => DocumentVersionValidationError.forField(
            "documentVersion",
            { versionId: version.id },
            error instanceof Error ? error.message : String(error)
          )
        })
      ),
      E.as(version)
    ) as E.Effect<DocumentVersionEntity, DocumentVersionValidationError, never>
  }

  /**
   * Save document version (insert if new, update if exists)
   */
  save(
    version: DocumentVersionEntity
  ): E.Effect<DocumentVersionEntity, DocumentVersionValidationError | DocumentVersionAlreadyExistsError, never> {
    return pipe(
      this.exists(version.id),
      E.flatMap((exists) =>
        exists ? this.update(version) : this.insert(version)
      )
    ) as E.Effect<DocumentVersionEntity, DocumentVersionValidationError | DocumentVersionAlreadyExistsError, never>
  }
}
