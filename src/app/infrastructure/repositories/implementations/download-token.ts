import { Effect as E, Option as O, pipe } from "effect"
import { eq, lt } from "drizzle-orm"
import { DownloadTokenRepository } from "../../../domain/download-token/repository.js"
import { DownloadTokenEntity } from "../../../domain/download-token/entity.js"
import { DownloadTokenNotFoundError, DownloadTokenAlreadyUsedError } from "../../../domain/download-token/errors.js"
import { downloadTokens, type DownloadTokenModel } from "../../database/models/download-token-model.js"
import { DocumentId, DownloadTokenId, UserId } from "../../../domain/shared/uuid.js"
import { databaseService } from "../../../application/workflow"

/**
 * Drizzle Repository Implementation for DownloadToken
 */
export class DownloadTokenDrizzleRepository extends DownloadTokenRepository {
  constructor() {
    super()
  }

  private get db() {
    return databaseService.getDatabase()
  }

  private toDb(token: DownloadTokenEntity): Omit<DownloadTokenModel, "updatedAt"> {
    return {
      id: token.id,
      token: token.token,
      documentId: token.documentId,
      issuedTo: token.issuedTo,
      expiresAt: token.expiresAt,
      usedAt: O.getOrNull(token.usedAt),
      createdAt: token.createdAt
    }
  }

  private fromDb(row: DownloadTokenModel): E.Effect<DownloadTokenEntity, DownloadTokenNotFoundError, never> {
    return pipe(
      DownloadTokenEntity.create({
        ...row,
        usedAt: row.usedAt ?? undefined
      }),
      E.mapError((error) => new DownloadTokenNotFoundError("data", row.id, String(error)))
    )
  }

  create(token: DownloadTokenEntity): E.Effect<DownloadTokenEntity, DownloadTokenAlreadyUsedError> {
    return pipe(
      E.tryPromise({
        try: async () => {
          const dbData = this.toDb(token)
          await this.db.insert(downloadTokens).values(dbData)
          return token
        },
        catch: (error) => new DownloadTokenAlreadyUsedError("token", token.token, String(error))
      })
    )
  }

  findById(id: DownloadTokenId): E.Effect<DownloadTokenEntity, DownloadTokenNotFoundError> {
    return pipe(
      E.tryPromise({
        try: async () => {
          const [row] = await this.db.select().from(downloadTokens).where(eq(downloadTokens.id, id)).limit(1)
          if (!row) throw new DownloadTokenNotFoundError("id", id)
          return row
        },
        catch: (error) => error instanceof DownloadTokenNotFoundError ? error : new DownloadTokenNotFoundError("id", id, String(error))
      }),
      E.flatMap((row) => this.fromDb(row))
    )
  }

  findByToken(token: string): E.Effect<DownloadTokenEntity, DownloadTokenNotFoundError> {
    return pipe(
      E.tryPromise({
        try: async () => {
          const [row] = await this.db.select().from(downloadTokens).where(eq(downloadTokens.token, token)).limit(1)
          if (!row) throw new DownloadTokenNotFoundError("token", token)
          return row
        },
        catch: (error) => error instanceof DownloadTokenNotFoundError ? error : new DownloadTokenNotFoundError("token", token, String(error))
      }),
      E.flatMap((row) => this.fromDb(row))
    )
  }

  findByDocumentId(documentId: DocumentId): E.Effect<DownloadTokenEntity[], never> {
    return pipe(
      E.tryPromise({
        try: async () => {
          return await this.db.select().from(downloadTokens).where(eq(downloadTokens.documentId, documentId))
        },
        catch: () => []
      }),
      E.flatMap((rows: DownloadTokenModel[]) => 
        E.all(rows.map((row: DownloadTokenModel) => this.fromDb(row)))
      ),
      E.catchAll(() => E.succeed([])) // Convert any errors to empty array
    )
  }

  findByUserId(userId: UserId): E.Effect<DownloadTokenEntity[], never> {
    return pipe(
      E.tryPromise({
        try: async () => {
          return await this.db.select().from(downloadTokens).where(eq(downloadTokens.issuedTo, userId))
        },
        catch: () => []
      }),
      E.flatMap((rows: DownloadTokenModel[]) => 
        E.all(rows.map((row: DownloadTokenModel) => this.fromDb(row)))
      ),
      E.catchAll(() => E.succeed([])) // Convert any errors to empty array
    )
  }

  update(token: DownloadTokenEntity): E.Effect<DownloadTokenEntity, DownloadTokenNotFoundError> {
    return pipe(
      E.tryPromise({
        try: async () => {
          const dbData = this.toDb(token)
          const result = await this.db.update(downloadTokens).set(dbData).where(eq(downloadTokens.id, token.id))
          if (result.length === 0) throw new DownloadTokenNotFoundError("id", token.id)
          return token
        },
        catch: (error) => error instanceof DownloadTokenNotFoundError ? error : new DownloadTokenNotFoundError("id", token.id, String(error))
      })
    )
  }

  delete(id: DownloadTokenId): E.Effect<void, DownloadTokenNotFoundError> {
    return pipe(
      E.tryPromise({
        try: async () => {
          const result = await this.db.delete(downloadTokens).where(eq(downloadTokens.id, id))
          if (result.length === 0) throw new DownloadTokenNotFoundError("id", id)
        },
        catch: (error) => error instanceof DownloadTokenNotFoundError ? error : new DownloadTokenNotFoundError("id", id, String(error))
      })
    )
  }

  findExpired(): E.Effect<DownloadTokenEntity[], never> {
    const now = new Date()
    return pipe(
      E.tryPromise({
        try: async () => {
          return await this.db.select().from(downloadTokens).where(lt(downloadTokens.expiresAt, now))
        },
        catch: () => []
      }),
      E.flatMap((rows: DownloadTokenModel[]) => 
        E.all(rows.map((row: DownloadTokenModel) => this.fromDb(row)))
      ),
      E.catchAll(() => E.succeed([])) // Convert any errors to empty array
    )
  }

  cleanupExpired(): E.Effect<number, never> {
    const now = new Date()
    return pipe(
      E.tryPromise({
        try: async () => {
          const expired = await this.db.select().from(downloadTokens).where(lt(downloadTokens.expiresAt, now))
          const count = expired.length
          if (count > 0) await this.db.delete(downloadTokens).where(lt(downloadTokens.expiresAt, now))
          return count
        },
        catch: () => 0
      }),
      E.catchAll(() => E.succeed(0)) // Convert any errors to 0
    )
  }
}
