import { Effect as E, Option as O, pipe } from "effect"
import { eq, lt, and, isNull, isNotNull, desc } from "drizzle-orm"

import { databaseService } from "@/app/infrastructure/services/drizzle-service"
import { downloadTokens } from "@/app/infrastructure/database/models"
import type { InferSelectModel } from "drizzle-orm"

type DownloadTokenModel = InferSelectModel<typeof downloadTokens>

import { DownloadTokenEntity } from "@/app/domain/download-token/entity"
import {
  DownloadTokenNotFoundError,
  DownloadTokenValidationError,
  DownloadTokenAlreadyUsedError,
} from "@/app/domain/download-token/errors"
import { DownloadTokenFilter } from "@/app/domain/download-token/repository"
import {
  DatabaseError,
} from "@/app/domain/shared/base.errors"
import { DocumentId, DownloadTokenId, UserId } from "@/app/domain/refined/uuid"

/**
 * Drizzle-based DownloadToken Repository Implementation
 *
 * Uses Effect patterns for composable, type-safe database operations.
 * Handles single-use, time-limited tokens for secure document downloads.
 */
export class DownloadTokenDrizzleRepository {
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
  private toDbSerialized(token: DownloadTokenEntity): E.Effect<Record<string, any>, DownloadTokenValidationError, never> {
    return pipe(
      token.serialized(),
      E.mapError(() => DownloadTokenValidationError.forField(
        "downloadToken",
        token.id,
        "Failed to serialize entity"
      ))
    ) as E.Effect<Record<string, any>, DownloadTokenValidationError, never>
  }

  /**
   * Deserialize database row to entity using Effect Schema
   *
   * Converts database row → domain entity using DownloadTokenEntity.create
   * Maps DB columns directly to domain fields (no transformations needed)
   */
  private fromDbRow(row: DownloadTokenModel): E.Effect<DownloadTokenEntity, DownloadTokenValidationError, never> {
    return DownloadTokenEntity.create({
      id: row.id,
      token: row.token,
      documentId: row.documentId,
      issuedTo: row.issuedTo,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
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
   * Fetch a single token record
   */
  private fetchSingle(
    query: () => Promise<DownloadTokenModel[]>
  ): E.Effect<O.Option<DownloadTokenEntity>, DatabaseError | DownloadTokenValidationError, never> {
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
    ) as E.Effect<O.Option<DownloadTokenEntity>, DatabaseError | DownloadTokenValidationError, never>
  }

  /**
   * Ensure token exists, fail with DownloadTokenNotFoundError if not
   */
  private ensureExists(id: string): E.Effect<void, DownloadTokenNotFoundError, never> {
    return pipe(
      this.exists(id as DownloadTokenId),
      E.flatMap((exists) =>
        exists
          ? E.succeed(undefined as void)
          : E.fail(DownloadTokenNotFoundError.forResource("DownloadToken", id))
      )
    ) as E.Effect<void, DownloadTokenNotFoundError, never>
  }

  // ---------------------------------------------------------------------------
  // Repository Interface
  // ---------------------------------------------------------------------------

  /**
   * Find token by ID
   */
  findById(
    id: DownloadTokenId
  ): E.Effect<O.Option<DownloadTokenEntity>, DatabaseError | DownloadTokenValidationError> {
    return this.fetchSingle(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.id, id))
        .limit(1)
    )
  }

  /**
   * Find token by token string
   */
  findByToken(
    tokenString: string
  ): E.Effect<O.Option<DownloadTokenEntity>, DatabaseError | DownloadTokenValidationError> {
    return this.fetchSingle(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.token, tokenString))
        .limit(1)
    )
  }

  /**
   * Find all tokens for a document
   */
  findByDocumentId(
    documentId: DocumentId
  ): E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(downloadTokens)
          .where(eq(downloadTokens.documentId, documentId))
          .orderBy(desc(downloadTokens.createdAt))
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError, never>
  }

  /**
   * Find all tokens issued to a user
   */
  findByUserId(
    userId: UserId
  ): E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(downloadTokens)
          .where(eq(downloadTokens.issuedTo, userId))
          .orderBy(desc(downloadTokens.createdAt))
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError, never>
  }

  /**
   * Find all expired tokens
   */
  findExpired(): E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(downloadTokens)
          .where(lt(downloadTokens.expiresAt, new Date()))
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError, never>
  }

  /**
   * Find all used tokens
   */
  findUsed(): E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(downloadTokens)
          .where(isNotNull(downloadTokens.usedAt))
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError, never>
  }

  /**
   * Find all unused tokens for a document
   */
  findUnusedByDocumentId(
    documentId: DocumentId
  ): E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(downloadTokens)
          .where(
            and(
              eq(downloadTokens.documentId, documentId),
              isNull(downloadTokens.usedAt)
            )
          )
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<DownloadTokenEntity[], DatabaseError | DownloadTokenValidationError, never>
  }

  /**
   * Check if token exists by ID
   */
  exists(id: DownloadTokenId): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.executeQuery(() =>
        this.db
          .select({ id: downloadTokens.id })
          .from(downloadTokens)
          .where(eq(downloadTokens.id, id))
          .limit(1)
      ),
      E.map((result) => result.length > 0)
    )
  }

  /**
   * Update an existing token (typically to mark as used)
   */
  update(
    token: DownloadTokenEntity
  ): E.Effect<DownloadTokenEntity, DownloadTokenValidationError | DownloadTokenNotFoundError, never> {
    return pipe(
      this.ensureExists(token.id),
      E.flatMap(() => this.toDbSerialized(token)),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.update(downloadTokens).set(dbData as any).where(eq(downloadTokens.id, token.id)),
          catch: () => DownloadTokenValidationError.forField(
            "downloadToken",
            { tokenId: token.id },
            "Update failed"
          )
        })
      ),
      E.as(token)
    ) as E.Effect<DownloadTokenEntity, DownloadTokenValidationError | DownloadTokenNotFoundError, never>
  }

  /**
   * Delete token by ID
   */
  delete(id: DownloadTokenId): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        E.if(exists, {
          onTrue: () =>
            pipe(
              E.tryPromise({
                try: () => this.db.delete(downloadTokens).where(eq(downloadTokens.id, id)),
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
   * Clean up expired tokens
   * Returns the count of deleted rows
   */
  cleanupExpired(): E.Effect<number, DatabaseError> {
    return pipe(
      this.executeQuery(async () => {
        const result = await this.db
          .delete(downloadTokens)
          .where(lt(downloadTokens.expiresAt, new Date()))
        return result.rowCount ?? 0
      })
    )
  }

  /**
   * Clean up used and expired tokens
   * Returns the count of deleted rows
   */
  cleanupUsedAndExpired(): E.Effect<number, DatabaseError> {
    return pipe(
      this.executeQuery(async () => {
        const result = await this.db
          .delete(downloadTokens)
          .where(
            and(
              isNotNull(downloadTokens.usedAt),
              lt(downloadTokens.expiresAt, new Date())
            )
          )
        return result.rowCount ?? 0
      })
    )
  }
}
