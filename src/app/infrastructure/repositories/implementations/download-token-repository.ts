/**
 * DownloadToken Repository - Declarative Implementation with Schema Validation
 * 
 * Uses Effect Schema for encode/decode with full validation.
 * Manages time-limited, single-use tokens for secure document access.
 */

import { Effect, Option, pipe, Schema as S } from "effect";
import { eq, lt, and, isNull, isNotNull } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { downloadTokens } from "@/app/infrastructure/database/models";
import type { InferSelectModel } from "drizzle-orm";

import { DownloadTokenEntity } from "@/app/domain/download-token/entity";
import { DownloadTokenSchema, DownloadTokenRow, DownloadTokenCodec } from "@/app/domain/download-token/schema";
import { DownloadTokenString } from "@/app/domain/download-token/value-object";
import {
  DownloadTokenNotFoundError,
  DownloadTokenValidationError,
  DownloadTokenAlreadyUsedError,
} from "@/app/domain/download-token/errors";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/app/domain/shared/errors";
import { DocumentId, DownloadTokenId, UserId } from "@/app/domain/shared/uuid";

type DownloadTokenModel = InferSelectModel<typeof downloadTokens>;

/**
 * Filter interface for querying tokens
 */
export interface DownloadTokenFilter {
  documentId?: DocumentId;
  issuedTo?: UserId;
  usedOnly?: boolean;
  expiredOnly?: boolean;
}

/**
 * DownloadToken Repository Implementation
 * 
 * Handles single-use, time-limited tokens for secure document downloads.
 * Tokens are immutable once created; only status (usedAt) can change.
 */
export class DownloadTokenRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ---------------------------------------------------------------------------
  // Private Helpers - Schema-based encoding/decoding
  // ---------------------------------------------------------------------------

  /**
   * Encodes a DownloadTokenEntity to a database row using Effect Schema Codec
   * Uses the Codec's encode transformation directly
   */
  private encodeToken(
    token: DownloadTokenEntity
  ): Effect.Effect<DownloadTokenRow, ValidationError> {
    // Extract domain data (entity stores Date objects)
    const domainData = {
      id: token.id,
      token: token.token,
      documentId: token.documentId,
      issuedTo: token.issuedTo,
      expiresAt: token.expiresAt,
      usedAt: Option.getOrUndefined(token.usedAt),
      createdAt: token.createdAt,
      updatedAt: Option.getOrUndefined(token.updatedAt)
    };

    // Use Codec's encode to transform Domain -> DB Row
    return pipe(
      S.encode(DownloadTokenCodec)(domainData as any),
      Effect.mapError((err) =>
        new ValidationError(`Failed to encode token: ${err.message}`, "DownloadToken")
      )
    ) as any;
  }

  /**
   * Decodes a database row into a DownloadTokenEntity using Effect Schema Codec
   * Uses the Codec's decode transformation directly
   */
  private decodeToken(
    row: DownloadTokenModel
  ): Effect.Effect<DownloadTokenEntity, ValidationError | DownloadTokenValidationError> {
    // Use Codec's decode to transform DB Row -> Domain (Context type suppressed with 'as any')
    return pipe(
      S.decodeUnknown(DownloadTokenCodec)(row) as any,
      Effect.mapError((err: any) =>
        new ValidationError(`Failed to decode token: ${err.message}`, "DownloadToken")
      ),
      // Create domain entity from decoded data
      Effect.flatMap((decoded: any) => DownloadTokenEntity.create(decoded))
    );
  }

  /**
   * Executes a read query and returns an Option of a single entity.
   */
  private fetchOne(
    query: () => Promise<DownloadTokenModel[]>
  ): Effect.Effect<
    Option.Option<DownloadTokenEntity>,
    DatabaseError | ValidationError
  > {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) =>
          new DatabaseError({
            message: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.map((rows) => Option.fromIterable(rows)),
      Effect.flatMap((maybeRow) =>
        Option.match(maybeRow, {
          onNone: () => Effect.succeed(Option.none<DownloadTokenEntity>()),
          onSome: (row) => pipe(this.decodeToken(row), Effect.map(Option.some)),
        })
      )
    );
  }

  /**
   * Executes a read query and returns an array of entities.
   */
  private fetchMany(
    query: () => Promise<DownloadTokenModel[]>
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError | ValidationError> {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) =>
          new DatabaseError({
            message: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodeToken(row)))
      ),
      Effect.mapError((err) =>
        err instanceof DatabaseError
          ? err
          : new DatabaseError({
              message: `Decode failed: ${err instanceof Error ? err.message : String(err)}`,
              cause: err,
            })
      )
    );
  }

  /**
   * Executes a write operation and converts constraint violations to ConflictError.
   */
  private executeWrite(
    operation: () => Promise<any>
  ): Effect.Effect<void, DatabaseError | ConflictError> {
    return pipe(
      Effect.tryPromise({
        try: operation,
        catch: (err) => err,
      }),
      Effect.mapError((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("unique") ||
          msg.includes("duplicate") ||
          msg.includes("constraint")
        ) {
          return new ConflictError(
            `Token uniqueness constraint violated: ${msg}`,
            "token"
          );
        }
        return new DatabaseError({
          message: `Write operation failed: ${msg}`,
          cause: err,
        });
      }),
      Effect.as(void 0)
    );
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  /**
   * Finds a download token by its ID.
   */
  findById(
    id: DownloadTokenId
  ): Effect.Effect<
    Option.Option<DownloadTokenEntity>,
    DatabaseError | ValidationError
  > {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.id, id))
        .limit(1)
    );
  }

  /**
   * Finds a token by its token string.
   */
  findByToken(
    tokenString: string
  ): Effect.Effect<
    Option.Option<DownloadTokenEntity>,
    DatabaseError | ValidationError
  > {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.token, tokenString))
        .limit(1)
    );
  }

  /**
   * Finds all tokens issued for a specific document.
   */
  findByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError | ValidationError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.documentId, documentId))
        .orderBy(downloadTokens.createdAt)
    );
  }

  /**
   * Finds all tokens issued to a specific user.
   */
  findByUserId(
    userId: UserId
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError | ValidationError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.issuedTo, userId))
        .orderBy(downloadTokens.createdAt)
    );
  }

  /**
   * Finds all expired tokens (expiresAt < now).
   */
  findExpired(): Effect.Effect<DownloadTokenEntity[], DatabaseError | ValidationError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(lt(downloadTokens.expiresAt, new Date()))
    );
  }

  /**
   * Finds all used tokens.
   */
  findUsed(): Effect.Effect<DownloadTokenEntity[], DatabaseError | ValidationError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(isNotNull(downloadTokens.usedAt))
    );
  }

  /**
   * Finds all unused tokens for a document.
   */
  findUnusedByDocumentId(
    documentId: DocumentId
  ): Effect.Effect<DownloadTokenEntity[], DatabaseError | ValidationError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(downloadTokens)
        .where(
          and(
            eq(downloadTokens.documentId, documentId),
            isNull(downloadTokens.usedAt)
          )
        )
    );
  }

  /**
   * Checks if a token exists by ID.
   */
  exists(id: DownloadTokenId): Effect.Effect<boolean, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: downloadTokens.id })
            .from(downloadTokens)
            .where(eq(downloadTokens.id, id))
            .limit(1),
        catch: (err) =>
          new DatabaseError({
            message: `Failed to check existence: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.map((rows) => rows.length > 0)
    );
  }

  // ---------------------------------------------------------------------------
  // Write Operations
  // ---------------------------------------------------------------------------

  /**
   * Saves a new download token to the database.
   * Fails if token string already exists (unique constraint).
   */
  save(
    token: DownloadTokenEntity
  ): Effect.Effect<
    DownloadTokenEntity,
    DatabaseError | ConflictError | ValidationError
  > {
    return pipe(
      this.encodeToken(token),
      Effect.flatMap((row) =>
        this.executeWrite(() =>
          this.db.insert(downloadTokens).values(row as any)
        )
      ),
      Effect.as(token)
    );
  }

  /**
   * Updates an existing token (typically to mark as used).
   * Returns the updated entity.
   */
  update(
    token: DownloadTokenEntity
  ): Effect.Effect<
    DownloadTokenEntity,
    DatabaseError | NotFoundError | ValidationError
  > {
    return pipe(
      this.encodeToken(token),
      Effect.flatMap((row) =>
        pipe(
          Effect.tryPromise({
            try: async () =>
              this.db
                .update(downloadTokens)
                .set({ usedAt: row.usedAt, updatedAt: new Date() })
                .where(eq(downloadTokens.id, token.id)),
            catch: (err) =>
              new DatabaseError({
                message: `Update failed: ${err instanceof Error ? err.message : String(err)}`,
                cause: err,
              }),
          }),
          Effect.flatMap((result) =>
            result === undefined || (result as any).rowCount === 0
              ? Effect.fail(
                  new NotFoundError({
                    message: "DownloadToken not found",
                    resource: "DownloadToken",
                    id: token.id,
                  })
                )
              : Effect.succeed(token)
          )
        )
      )
    );
  }

  /**
   * Deletes a token by ID.
   * Returns true if deleted, fails with NotFoundError if token doesn't exist.
   */
  delete(id: DownloadTokenId): Effect.Effect<boolean, DatabaseError | NotFoundError> {
    return pipe(
      this.exists(id),
      Effect.flatMap((exists) =>
        exists
          ? Effect.tryPromise({
              try: () =>
                this.db.delete(downloadTokens).where(eq(downloadTokens.id, id))
                .then(() => true),
              catch: (err) =>
                new DatabaseError({
                  message: `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
                  cause: err,
                }),
            }) as Effect.Effect<boolean, DatabaseError | NotFoundError>
          : Effect.fail(
              new NotFoundError({
                message: "DownloadToken not found",
                resource: "DownloadToken",
                id,
              })
            )
      )
    );
  }

  /**
   * Cleans up expired tokens.
   * Returns the count of deleted rows.
   */
  cleanupExpired(): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const result = await this.db
            .delete(downloadTokens)
            .where(lt(downloadTokens.expiresAt, new Date()));
          return result.rowCount ?? 0;
        },
        catch: (err) =>
          new DatabaseError({
            message: `Failed to cleanup expired tokens: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      })
    );
  }

  /**
   * Cleans up used and expired tokens.
   * Returns the count of deleted rows.
   */
  cleanupUsedAndExpired(): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const result = await this.db
            .delete(downloadTokens)
            .where(
              and(
                isNotNull(downloadTokens.usedAt),
                lt(downloadTokens.expiresAt, new Date())
              )
            );
          return result.rowCount ?? 0;
        },
        catch: (err) =>
          new DatabaseError({
            message: `Failed to cleanup used and expired tokens: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      })
    );
  }
}