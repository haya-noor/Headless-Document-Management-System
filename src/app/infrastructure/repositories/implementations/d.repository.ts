/**
 * Document Repository - Declarative Implementation
 * 
 * Uses Effect combinators and declarative SQL builders
 * to eliminate imperative control flow.
 */

import { Effect, Option, pipe, Schema as S } from "effect";
import { eq, and, like, gte, lte, sql, desc, asc, count } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { documents } from "@/app/infrastructure/database/models";
import type { InferSelectModel } from "drizzle-orm";

import { DocumentSchemaEntity } from "@/app/domain/document/entity";
import { DocumentCodec } from "@/app/domain/document/schema";
import {
  DocumentValidationError,
} from "@/app/domain/document/errors";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
  type Repository,
} from "@/app/domain/shared/errors";
import {
  PaginatedResponse,
  PaginationParams,
} from "@/app/domain/shared/api.interface";

type DocumentModel = InferSelectModel<typeof documents>;

/**
 * Document Repository Filter Interface
 */
export interface DocumentFilter {
  ownerId?: string;
  title?: string;
  tags?: string[];
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

/**
const conditions = buildConditions({
  ownerId: 'user-123',
  tags: ['project', 'draft'],
  dateFrom: new Date('2025-01-01'),
});

we'll get something like:
[
  eq(documents.isActive, true),
  eq(documents.uploadedBy, 'user-123'),
  sql`${documents.tags} @> '["project","draft"]'`,
  gte(documents.createdAt, new Date('2025-01-01'))
]

and we could use it in a query like:
db.select().from(documents).where(and(...conditions))
 */
const conditionBuilders = {
  isActive: () => eq(documents.isActive, true),
  
  ownerId: (id: string) => eq(documents.uploadedBy, id),
  
  title: (title: string) => like(documents.filename, `%${title}%`),
  
  tags: (tags: string[]) => 
    tags.length > 0 ? sql`${documents.tags} @> ${JSON.stringify(tags)}` : null,
  
  mimeType: (mime: string) => eq(documents.mimeType, mime),
  
  minSize: (size: number) => gte(documents.size, size),
  
  maxSize: (size: number) => lte(documents.size, size),
  
  dateFrom: (date: Date) => gte(documents.createdAt, date),
  
  dateTo: (date: Date) => lte(documents.createdAt, date),
  
  searchTerm: (term: string) =>
    sql`(${documents.filename} ILIKE ${`%${term}%`} OR ${documents.originalName} ILIKE ${`%${term}%`})`,
};

/**
 * Pure function to build conditions from filter - no side effects
 */
const buildConditions = (filter?: DocumentFilter): any[] => {
  const conditions: any[] = [conditionBuilders.isActive()];

  // Declaratively add conditions based on filter properties
  return [
    ...conditions,
    ...(filter?.ownerId ? [conditionBuilders.ownerId(filter.ownerId)] : []),
    ...(filter?.title ? [conditionBuilders.title(filter.title)] : []),
    ...(filter?.tags ? [conditionBuilders.tags(filter.tags)].filter(Boolean) : []),
    ...(filter?.mimeType ? [conditionBuilders.mimeType(filter.mimeType)] : []),
    ...(typeof filter?.minSize === "number" ? [conditionBuilders.minSize(filter.minSize)] : []),
    ...(typeof filter?.maxSize === "number" ? [conditionBuilders.maxSize(filter.maxSize)] : []),
    ...(filter?.dateFrom ? [conditionBuilders.dateFrom(filter.dateFrom)] : []),
    ...(filter?.dateTo ? [conditionBuilders.dateTo(filter.dateTo)] : []),
    ...(filter?.searchTerm ? [conditionBuilders.searchTerm(filter.searchTerm)] : []),
  ];
};

/**
 * Document Repository Implementation
 */
export class DocumentDrizzleRepository implements Repository<DocumentSchemaEntity, DocumentFilter> {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private encodeDocument(doc: DocumentSchemaEntity): Effect.Effect<any, ValidationError> {
    return Effect.try({
      try: () => S.encodeSync(DocumentCodec)((doc as any).toSerialized()),
      catch: (err) =>
        new ValidationError(
          `Failed to encode document: ${err instanceof Error ? err.message : String(err)}`,
          "document"
        ),
    });
  }

  private decodeDocument(row: DocumentModel): Effect.Effect<DocumentSchemaEntity, ValidationError> {
    return pipe(
      Effect.try({
        try: () => S.decodeSync(DocumentCodec)(row),
        catch: (err) =>
          new ValidationError(
            `Failed to decode document: ${err instanceof Error ? err.message : String(err)}`,
            "document"
          ),
      }),
      Effect.flatMap((decoded) => DocumentSchemaEntity.create(decoded))
    );
  }

  private fetchOne(
    query: () => Promise<DocumentModel[]>
  ): Effect.Effect<Option.Option<DocumentSchemaEntity>, DatabaseError | ValidationError> {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) =>
          new DatabaseError({
            message: `Database query failed: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.map(Option.fromIterable),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) => pipe(this.decodeDocument(row), Effect.map(Option.some)),
        })
      )
    );
  }

  private handleDatabaseError(operation: string, context?: any) {
    return (err: unknown) =>
      new DatabaseError({
        message: `${operation} failed: ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
        ...(context && { context }),
      });
  }

  private handleConflict(context: string) {
    return (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.includes("unique") || msg.includes("duplicate")
        ? new ConflictError(msg, context)
        : this.handleDatabaseError(context)(err);
    };
  }

  // ---------------------------------------------------------------------------
  // Repository Interface
  // ---------------------------------------------------------------------------

  findById(id: string): Effect.Effect<Option.Option<DocumentSchemaEntity>, DatabaseError> {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1)
    ).pipe(
      Effect.mapError(this.handleDatabaseError(`Find document ${id}`))
    );
  }

  findMany(filter?: DocumentFilter): Effect.Effect<DocumentSchemaEntity[], DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select()
            .from(documents)
            .where(and(...buildConditions(filter))),   // Apply filter conditions
        catch: this.handleDatabaseError("Find documents", filter),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodeDocument(row)))
      ),
      Effect.mapError((err) =>
        err instanceof DatabaseError
          ? err
          : this.handleDatabaseError("Decode documents")(err)
      )
    );
  }

  findManyPaginated(
    { page, limit, sortBy = "createdAt", sortOrder = "desc" }: PaginationParams,
    filter?: DocumentFilter
  ): Effect.Effect<PaginatedResponse<DocumentSchemaEntity>, DatabaseError> {
    const offset = (page - 1) * limit;
    const orderBy = sortOrder === "asc" ? asc : desc;
    const sortColumn = documents[sortBy as keyof typeof documents] ?? documents.createdAt;
    const conditions = buildConditions(filter);

    return pipe(
      // Fetch paginated data
      Effect.tryPromise({
        try: () =>
          this.db
            .select()
            .from(documents)
            .where(and(...conditions))
            .orderBy(orderBy(sortColumn))
            .limit(limit)
            .offset(offset),
        catch: this.handleDatabaseError("Pagination query"),
      }),
      Effect.flatMap((rows) => Effect.all(rows.map((row) => this.decodeDocument(row)))),
      // Fetch total count in parallel
      Effect.flatMap((documentsList) =>
        pipe(
          Effect.tryPromise({
            try: () =>
              this.db
                .select({ count: count() })
                .from(documents)
                .where(and(...conditions)),
            catch: this.handleDatabaseError("Count query"),
          }),
          Effect.map(([result]) => ({
            documentsList,
            total: Number(result?.count ?? 0),
          }))
        )
      ),
      // Build response
      Effect.map(({ documentsList, total }) => {
        const totalPages = Math.ceil(total / limit);
        return {
          data: documentsList,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        } satisfies PaginatedResponse<DocumentSchemaEntity>;
      }),
      Effect.mapError((err) =>
        err instanceof DatabaseError
          ? err
          : this.handleDatabaseError("Pagination failed")(err)
      )
    );
  }

  save(
    doc: DocumentSchemaEntity
  ): Effect.Effect<DocumentSchemaEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.exists(doc.id),
      Effect.flatMap((exists) => exists ? this.update(doc) : this.insert(doc))
    );
  }

  private insert(
    doc: DocumentSchemaEntity
  ): Effect.Effect<DocumentSchemaEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.encodeDocument(doc),
      Effect.flatMap((row) =>
        Effect.tryPromise({
          try: () => this.db.insert(documents).values(row as any),
          catch: this.handleConflict(`Insert document ${doc.id}`),
        })
      ),
      Effect.as(doc)
    );
  }

  // private update(
  //   doc: DocumentSchemaEntity
  // ): Effect.Effect<DocumentSchemaEntity, DatabaseError | ValidationError | NotFoundError> {
  //   return pipe(
  //     this.exists(doc.id),
  //     Effect.flatMap((exists) =>
  //       exists
  //         ? this.encodeDocument(doc)
  //         : Effect.fail(
  //             new NotFoundError({
  //               message: "Document not found",
  //               resource: "Document",
  //               id: doc.id,
  //             })
  //           )
  //     ),
  //     Effect.flatMap((row) =>
  //       Effect.tryPromise({
  //         try: () =>
  //           this.db
  //             .update(documents)
  //             .set(row as any)
  //             .where(eq(documents.id, doc.id)),
  //         catch: this.handleDatabaseError(`Update document ${doc.id}`),
  //       })
  //     ),
  //     Effect.as(doc)
  //   );
  // }

  delete(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError> {
  return pipe(
    this.exists(id),
    Effect.flatMap((exists) =>
      exists
        ? Effect.tryPromise({
            try: () => this.db.delete(documents).where(eq(documents.id, id)),
            catch: this.handleDatabaseError(`Delete document ${id}`),
          }).pipe(Effect.as(true)) as Effect.Effect<boolean, DatabaseError | NotFoundError>
        : Effect.fail(
            new NotFoundError({
              message: "Document not found",
              resource: "Document",
              id,
            })
          )
    )
  );
}

  // softDelete(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError> {
  //   return pipe(
  //     this.findById(id),
  //     Effect.flatMap(
  //       Option.match({
  //         onNone: () =>
  //           Effect.fail(
  //             new NotFoundError({
  //               message: "Document not found",
  //               resource: "Document",
  //               id,
  //             })
  //           ),
  //         onSome: () =>
  //           Effect.tryPromise({
  //             try: () =>
  //               this.db
  //                 .update(documents)
  //                 .set({ isActive: false, updatedAt: new Date() })
  //                 .where(eq(documents.id, id)),
  //             catch: this.handleDatabaseError(`Soft delete document ${id}`),
  //           }).pipe(Effect.as(true)),
  //       })
  //     )
  //   );
  // }

  exists(id: string): Effect.Effect<boolean, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: documents.id })
            .from(documents)
            .where(and(eq(documents.id, id), eq(documents.isActive, true)))
            .limit(1),
        catch: this.handleDatabaseError(`Check exists document ${id}`),
      }),
      Effect.map((rows) => rows.length > 0)
    );
  }

  count(filter?: DocumentFilter): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const result = await this.db
            .select({ count: count() })
            .from(documents)
            .where(and(...buildConditions(filter)));
          return Number(result[0]?.count ?? 0);
        },
        catch: this.handleDatabaseError("Count documents", filter),
      })
    );
  }

  findByChecksum(checksum: string): Effect.Effect<DocumentSchemaEntity[], DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select()
            .from(documents)
            .where(and(eq(documents.checksum, checksum), eq(documents.isActive, true))),
        catch: this.handleDatabaseError(`Find by checksum ${checksum}`),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodeDocument(row)))
      )
    );
  }

  getStats(): Effect.Effect<{
    totalDocuments: number;
    totalSize: number;
    documentsByMimeType: Record<string, number>;
  }, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const [countResult, sizeResult, mimeTypeResult] = await Promise.all([
            this.db
              .select({ count: count() })
              .from(documents)
              .where(eq(documents.isActive, true)),
            this.db
              .select({ total: sql<number>`COALESCE(SUM(${documents.size}), 0)` })
              .from(documents)
              .where(eq(documents.isActive, true)),
            this.db
              .select({
                mimeType: documents.mimeType,
                count: count(),
              })
              .from(documents)
              .where(eq(documents.isActive, true))
              .groupBy(documents.mimeType),
          ]);

          return {
            totalDocuments: Number(countResult[0]?.count ?? 0),
            totalSize: Number(sizeResult[0]?.total ?? 0),
            documentsByMimeType: mimeTypeResult.reduce(
              (acc, row) => {
                acc[row.mimeType] = Number(row.count);
                return acc;
              },
              {} as Record<string, number>
            ),
          };
        },
        catch: this.handleDatabaseError("Get document stats"),
      })
    );
  }
}