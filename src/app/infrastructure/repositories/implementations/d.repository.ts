import { Effect as E, Option as O, pipe } from "effect"
import { eq, and, desc, asc, count, like } from "drizzle-orm"

import { databaseService } from "@/app/infrastructure/services/drizzle-service"
import { documents } from "@/app/infrastructure/database/models"
import type { InferSelectModel } from "drizzle-orm"

type DocumentModel = InferSelectModel<typeof documents>

import { DocumentSchemaEntity } from "@/app/domain/document/entity"
import {
  DocumentNotFoundError,
  DocumentValidationError,
} from "@/app/domain/document/errors"
import { DocumentFilter } from "@/app/domain/document/repository"
import {
  DatabaseError,
} from "@/app/domain/shared/base.errors"
import {
  calculateOffset,
  buildPaginatedResponse,
  PaginationParams,
  PaginatedResponse,
} from "@/app/domain/shared/pagination"

/**
 * Drizzle-based Document Repository Implementation
 *
 * Uses Effect patterns for composable, type-safe database operations.
 * Follows the reference architecture with clean helper methods.
 */
export class DocumentDrizzleRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ========== Serialization Helpers ==========

  /**
   * Serialize entity to database format using Effect Schema
   *
   * Uses entity's serialized() method which automatically handles:
   * - Option<T> → T | undefined
   * - Branded types → primitives
   * - Date objects preserved for database
   * 
   * Then maps domain fields to database columns.
   * 
   * Note: This is a temporary mapping until DB schema is refactored
   * to match domain model (title instead of filename, ownerId instead of uploadedBy).
   */
  private toDbSerialized(doc: DocumentSchemaEntity): E.Effect<Record<string, any>, DocumentValidationError, never> {
    return pipe(
      doc.serialized(),
      E.map((plainObject) => ({
        id: plainObject.id,
        filename: plainObject.title,  // Domain title -> DB filename
        originalName: plainObject.title,
        tags: plainObject.tags ?? null,
        uploadedBy: plainObject.ownerId,  // Domain ownerId -> DB uploadedBy
        currentVersion: 1,  // Will be managed by version entity
        isActive: true,
        createdAt: plainObject.createdAt,
        updatedAt: plainObject.updatedAt
      })),
      E.mapError((err) => DocumentValidationError.forField(
        "document",
        doc.id,
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : "Failed to serialize entity to database row"
      ))
    ) as E.Effect<Record<string, any>, DocumentValidationError, never>
  }

  /**
   * Deserialize database row to entity using Effect Schema
   *
   * Converts database row → domain entity using DocumentSchemaEntity.create
   * 
   * Note: This is a temporary mapping until DB schema is refactored
   * to match domain model.
   */
  private fromDbRow(row: DocumentModel): E.Effect<DocumentSchemaEntity, DocumentValidationError, never> {
    // Transform DB row to domain format
    const domainData = {
      id: row.id,
      ownerId: row.uploadedBy ?? row.id,  // DB uploadedBy -> Domain ownerId
      title: row.filename,  // DB filename -> Domain title
      description: null,
      tags: row.tags,
      currentVersionId: `${row.id}-v${row.currentVersion}`,  // Generate version ID
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }

    return DocumentSchemaEntity.create(domainData)
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
   * Fetch a single document record
   */
  private fetchSingle(
    query: () => Promise<DocumentModel[]>
  ): E.Effect<O.Option<DocumentSchemaEntity>, DatabaseError | DocumentValidationError, never> {
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
    ) as E.Effect<O.Option<DocumentSchemaEntity>, DatabaseError | DocumentValidationError, never>
  }

  /**
   * Ensure document exists, fail with DocumentNotFoundError if not
   */
  private ensureExists(id: string): E.Effect<void, DocumentNotFoundError, never> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        exists
          ? E.succeed(undefined as void)
          : E.fail(DocumentNotFoundError.forResource("Document", id))
      )
    ) as E.Effect<void, DocumentNotFoundError, never>
  }

  // ---------------------------------------------------------------------------
  // Repository Interface
  // ---------------------------------------------------------------------------

  /**
   * Find document by ID
   */
  findById(
    id: string
  ): E.Effect<O.Option<DocumentSchemaEntity>, DatabaseError | DocumentValidationError> {
    return this.fetchSingle(() =>
      this.db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1)
    )
  }

  /**
   * Check if document exists by ID
   */
  exists(id: string): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select({ id: documents.id })
          .from(documents)
          .where(and(eq(documents.id, id), eq(documents.isActive, true)))
          .limit(1)
      ),
      E.map((result) => result.length > 0)
    )
  }

  /**
   * Count documents based on filter
   */
  count(filter?: DocumentFilter): E.Effect<number, DatabaseError> {
    const conditions = [
      eq(documents.isActive, true),
      ...(filter?.ownerId ? [eq(documents.uploadedBy, filter.ownerId)] : []),
      ...(filter?.title ? [like(documents.filename, `%${filter.title}%`)] : []),
    ]

    return pipe(
      this.executeQuery(() =>
        this.db
          .select({ count: count() })
          .from(documents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      ),
      E.map((result) => Number(result[0]?.count ?? 0))
    )
  }

  /**
   * Find multiple documents
   */
  findMany(
    filter?: DocumentFilter
  ): E.Effect<DocumentSchemaEntity[], DatabaseError | DocumentValidationError> {
    const conditions = [
      eq(documents.isActive, true),
      ...(filter?.ownerId ? [eq(documents.uploadedBy, filter.ownerId)] : []),
      ...(filter?.title ? [like(documents.filename, `%${filter.title}%`)] : []),
    ]

    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(documents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DocumentSchemaEntity[], DatabaseError | DocumentValidationError, never>
  }

  /**
   * Find documents with pagination
   */
  findManyPaginated(
    { page, limit, sortBy = "createdAt", sortOrder = "desc" }: PaginationParams,
    filter?: DocumentFilter
  ): E.Effect<PaginatedResponse<DocumentSchemaEntity>, DatabaseError | DocumentValidationError> {
    const offset = calculateOffset(page, limit)
    const orderBy = sortOrder === "asc" ? asc : desc

    const sortColumns: Record<string, any> = {
      title: documents.filename,
      createdAt: documents.createdAt,
    }
    const sortColumn = sortColumns[sortBy] ?? documents.createdAt

    const conditions = [
      eq(documents.isActive, true),
      ...(filter?.ownerId ? [eq(documents.uploadedBy, filter.ownerId)] : []),
      ...(filter?.title ? [like(documents.filename, `%${filter.title}%`)] : []),
    ]

    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(documents)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy(sortColumn))
          .limit(limit)
          .offset(offset)
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      ),
      E.flatMap((documentsList) =>
        pipe(
          this.count(filter),
          E.map((total) => buildPaginatedResponse(documentsList, page, limit, total))
        )
      )
    ) as E.Effect<PaginatedResponse<DocumentSchemaEntity>, DatabaseError | DocumentValidationError, never>
  }

  /**
   * Insert a new document
   */
  private insert(
    doc: DocumentSchemaEntity
  ): E.Effect<DocumentSchemaEntity, DocumentValidationError, never> {
    return pipe(
      this.toDbSerialized(doc),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.insert(documents).values(dbData as any),
          catch: (error) => {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return DocumentValidationError.forField("document", { documentId: doc.id }, errorMsg)
          }
        })
      ),
      E.as(doc)
    ) as E.Effect<DocumentSchemaEntity, DocumentValidationError, never>
  }

  /**
   * Update an existing document
   */
  private update(
    doc: DocumentSchemaEntity
  ): E.Effect<DocumentSchemaEntity, DocumentValidationError | DocumentNotFoundError, never> {
    return pipe(
      this.ensureExists(doc.id),
      E.flatMap(() => this.toDbSerialized(doc)),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.update(documents).set(dbData as any).where(eq(documents.id, doc.id)),
          catch: (error) => DocumentValidationError.forField(
            "document",
            { documentId: doc.id },
            error instanceof Error ? error.message : String(error)
          )
        })
      ),
      E.as(doc)
    ) as E.Effect<DocumentSchemaEntity, DocumentValidationError | DocumentNotFoundError, never>
  }

  /**
   * Delete document by ID (soft delete)
   */
  delete(id: string): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        E.if(exists, {
          onTrue: () =>
            pipe(
              E.tryPromise({
                try: () => this.db.update(documents).set({ isActive: false }).where(eq(documents.id, id)),
                catch: (error) => DatabaseError.forOperation("delete", error)
              }),
              E.as(true)
            ),
          onFalse: () => E.succeed(false)
        })
      )
    )
  }
}
