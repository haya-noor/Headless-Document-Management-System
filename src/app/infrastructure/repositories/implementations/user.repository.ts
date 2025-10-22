import { Effect as E, Option as O, pipe } from "effect";
import { eq, desc, asc, count, and } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { users } from "@/app/infrastructure/database/models";
import type { InferSelectModel } from "drizzle-orm";

type UserModel = InferSelectModel<typeof users>;

import { UserEntity } from "@/app/domain/user/entity";
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  UserValidationError,
} from "@/app/domain/user/errors";
import { UserFilter } from "@/app/domain/user/repository";
import {
  DatabaseError,
} from "@/app/domain/shared/base.errors";
import { 
  calculateOffset,
  buildPaginatedResponse,
  PaginationParams,
  PaginatedResponse,
} from "@/app/domain/shared/pagination";

/**
 * Drizzle-based User Repository Implementation
 * 
 * Uses Effect patterns for composable, type-safe database operations.
 * Follows the reference architecture with clean helper methods.
 */
export class UserDrizzleRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ========== Serialization Helpers ==========

  /**
   * Serialize entity to database format
   * 
   * Maps domain entity fields to database columns.
   * Unwraps Option types to null for database storage.
   */
  private toDbSerialized(user: UserEntity): E.Effect<UserModel, UserValidationError, never> {
    return E.sync(() => ({
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      dateOfBirth: O.getOrNull(user.dateOfBirth),
      phoneNumber: O.getOrNull(user.phoneNumber),
      profileImage: O.getOrNull(user.profileImage),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
  }

  /**
   * Deserialize database row to entity
   * 
   * Converts database row → domain entity using UserEntity.create
   * Schema automatically converts null/undefined to Option.None and values to Option.Some
   */
  private fromDbRow(row: UserModel): E.Effect<UserEntity, UserValidationError, never> {
    return UserEntity.create({
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as "admin" | "user",
      isActive: row.isActive,
      dateOfBirth: row.dateOfBirth ?? undefined,
      phoneNumber: row.phoneNumber ?? undefined,
      profileImage: row.profileImage ?? undefined,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt
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
   * Fetch a single user record
   */
  private fetchSingle(
    query: () => Promise<UserModel[]>
  ): E.Effect<O.Option<UserEntity>, DatabaseError | UserValidationError, never> {
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
    ) as E.Effect<O.Option<UserEntity>, DatabaseError | UserValidationError, never>
  }

  /**
   * Ensure user exists, fail with UserNotFoundError if not
   */
  private ensureExists(id: string): E.Effect<void, UserNotFoundError, never> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        exists
          ? E.succeed(undefined as void)
          : E.fail(UserNotFoundError.forResource("User", id))
      )
    ) as E.Effect<void, UserNotFoundError, never>
  }

  // ========== Repository Methods ==========

  /**
   * Find user by ID
   */
  findById(id: string): E.Effect<O.Option<UserEntity>, DatabaseError | UserValidationError> {
    return this.fetchSingle(() =>
      this.db.select().from(users).where(eq(users.id, id)).limit(1)
    )
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): E.Effect<O.Option<UserEntity>, DatabaseError | UserValidationError> {
    return this.fetchSingle(() =>
      this.db.select().from(users).where(eq(users.email, email)).limit(1)
    )
  }

  /**
   * Find multiple users matching filter
   */
  findMany(
    filter?: UserFilter
  ): E.Effect<UserEntity[], DatabaseError | UserValidationError> {
    const conditions = [
      ...(filter?.email ? [eq(users.email, filter.email)] : []),
      ...(filter?.role ? [eq(users.role, filter.role)] : []),
      ...(filter?.isActive !== undefined ? [eq(users.isActive, filter.isActive)] : []),
    ];

    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(users)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<UserEntity[], DatabaseError | UserValidationError, never>
  }

  /**
   * Find users with pagination
   */
  findManyPaginated(
    { page, limit, sortBy = "createdAt", sortOrder = "desc" }: PaginationParams,
    filter?: UserFilter
  ): E.Effect<PaginatedResponse<UserEntity>, DatabaseError | UserValidationError> {
    const offset = calculateOffset(page, limit);
    const orderBy = sortOrder === "asc" ? asc : desc;
    
    const sortColumns: Record<string, any> = {
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
    };
    const sortColumn = sortColumns[sortBy] ?? users.createdAt;

    const conditions = [
      ...(filter?.email ? [eq(users.email, filter.email)] : []),
      ...(filter?.role ? [eq(users.role, filter.role)] : []),
      ...(filter?.isActive !== undefined ? [eq(users.isActive, filter.isActive)] : []),
    ];

    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(users)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy(sortColumn))
          .limit(limit)
          .offset(offset)
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      ),
      E.flatMap((usersList) =>
        pipe(
          this.count(filter),
          E.map((total) => buildPaginatedResponse(usersList, page, limit, total))
        )
      )
    ) as E.Effect<PaginatedResponse<UserEntity>, DatabaseError | UserValidationError, never>
  }

  /**
   * Check if user exists by ID
   */
  exists(id: string): E.Effect<boolean, DatabaseError> {
    return pipe(
      E.tryPromise({
        try: (): Promise<Pick<UserModel, "id">[]> =>
          this.db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1),
        catch: (error) => DatabaseError.forOperation("exists check", error)
      }),
      E.map((result) => result.length > 0)
    )
  }

  /**
   * Count users matching filter
   */
  count(filter?: UserFilter): E.Effect<number, DatabaseError> {
    const conditions = [
      ...(filter?.email ? [eq(users.email, filter.email)] : []),
      ...(filter?.role ? [eq(users.role, filter.role)] : []),
      ...(filter?.isActive !== undefined ? [eq(users.isActive, filter.isActive)] : []),
    ];

    return pipe(
      E.tryPromise({
        try: () =>
          this.db
            .select({ count: count() })
            .from(users)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        catch: (error) => DatabaseError.forOperation("count", error)
      }),
      E.map(([result]) => Number(result?.count ?? 0))
    )
  }

  /**
   * Insert a new user
   */
  private insert(
    user: UserEntity
  ): E.Effect<UserEntity, UserAlreadyExistsError | UserValidationError, never> {
    return pipe(
      this.toDbSerialized(user),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.insert(users).values(dbData as any),
          catch: (error) => {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
              return UserAlreadyExistsError.forField("email", user.email)
            }
            return UserValidationError.forField("user", { userId: user.id }, errorMsg)
          }
        })
      ),
      E.as(user)
    ) as E.Effect<UserEntity, UserAlreadyExistsError | UserValidationError, never>
  }
  
  /**
   * Update an existing user
   */
  private update(
    user: UserEntity
  ): E.Effect<UserEntity, UserValidationError | UserNotFoundError, never> {
    return pipe(
      this.ensureExists(user.id),
      E.flatMap(() => this.toDbSerialized(user)),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.update(users).set(dbData as any).where(eq(users.id, user.id)),
          catch: (error) => UserValidationError.forField(
            "user",
            { userId: user.id },
            error instanceof Error ? error.message : String(error)
          )
        })
      ),
      E.as(user)
    ) as E.Effect<UserEntity, UserValidationError | UserNotFoundError, never>
  }

  /**
   * Delete user by ID
   */
  delete(id: string): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        E.if(exists, {
          onTrue: () =>
            pipe(
              E.tryPromise({
                try: () => this.db.delete(users).where(eq(users.id, id)),
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

