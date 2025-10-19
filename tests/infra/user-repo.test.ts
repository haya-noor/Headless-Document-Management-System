
import { Effect, Option, pipe, Schema as S } from "effect";
import { eq, desc, asc, count } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { users } from "@/app/infrastructure/database/user-model";
import type { InferSelectModel } from "drizzle-orm";

type UserModel = InferSelectModel<typeof users>;

import { UserEntity, type SerializedUser } from "@/app/domain/user/entity";
import { User, UserRow, UserCodec } from "@/app/domain/user/schema";
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  UserValidationError,
} from "@/app/domain/user/errors";
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

/**
 * User Repository Filter Interface
 */
export interface UserFilter {
  email?: string;
  role?: "admin" | "user";
  isActive?: boolean;
  searchTerm?: string;
}

/**
 * User Repository Implementation using Drizzle ORM
 * 
 * Implements the Repository<T, Filter> contract from domain layer.
 * Handles all database operations for User entities with proper error handling.
 */
export class UserDrizzleRepository implements Repository<UserEntity, UserFilter> {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ---------------------------------------------------------------------------
  // Private Helpers - Encoding/Decoding
  // ---------------------------------------------------------------------------

  /**
   * Encodes a UserEntity into a database row format
   */
  private encodeUser(user: UserEntity): Effect.Effect<UserRow, ValidationError> {
    return pipe(
      Effect.try({
        try: () => S.encodeSync(UserCodec)(user.toSerialized()),
        catch: (err) =>
          new ValidationError(
            `Failed to encode user: ${err instanceof Error ? err.message : String(err)}`,
            "user"
          ),
      })
    );
  }

  /**
   * Decodes a database row into a UserEntity
   */
  private decodeUser(row: UserModel): Effect.Effect<UserEntity, ValidationError> {
    return pipe(
      Effect.try({
        try: () => S.decodeSync(UserCodec)(row),
        catch: (err) =>
          new ValidationError(
            `Failed to decode user: ${err instanceof Error ? err.message : String(err)}`,
            "user"
          ),
      }),
      Effect.flatMap((decoded) => UserEntity.create(decoded))
    );
  }

  /**
   * Helper to fetch a single user by a query function
   */
  private fetchOne(
    query: () => Promise<UserModel[]>
  ): Effect.Effect<Option.Option<UserEntity>, DatabaseError | ValidationError> {
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
          onSome: (row) => pipe(this.decodeUser(row), Effect.map(Option.some)),
        })
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Repository Interface Implementation
  // ---------------------------------------------------------------------------

  /**
   * Finds a user by their ID
   */
  findById(id: string): Effect.Effect<Option.Option<UserEntity>, DatabaseError> {
    return pipe(
      this.fetchOne(() =>
        this.db.select().from(users).where(eq(users.id, id)).limit(1)
      ),
      Effect.mapError(
        (err) =>
          new DatabaseError({
            message: `Failed to find user by ID: ${id}`,
            cause: err,
          })
      )
    );
  }

  /**
   * Finds a user by their email address
   */
  findByEmail(
    email: string
  ): Effect.Effect<Option.Option<UserEntity>, DatabaseError> {
    return pipe(
      this.fetchOne(() =>
        this.db.select().from(users).where(eq(users.email, email)).limit(1)
      ),
      Effect.mapError(
        (err) =>
          new DatabaseError({
            message: `Failed to find user by email: ${email}`,
            cause: err,
          })
      )
    );
  }

  /**
   * Finds multiple users matching the given filter
   */
  findMany(
    filter?: UserFilter
  ): Effect.Effect<UserEntity[], DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          let query = this.db.select().from(users);

          if (filter?.email) {
            query = query.where(eq(users.email, filter.email)) as any;
          }
          if (filter?.role) {
            query = query.where(eq(users.role, filter.role)) as any;
          }
          if (filter?.isActive !== undefined) {
            query = query.where(eq(users.isActive, filter.isActive)) as any;
          }

          return await query;
        },
        catch: (err) =>
          new DatabaseError({
            message: `Failed to find users: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodeUser(row)))
      ),
      Effect.mapError(
        (err) =>
          err instanceof DatabaseError
            ? err
            : new DatabaseError({
                message: "Failed to decode users",
                cause: err,
              })
      )
    );
  }

  /**
   * Finds users with pagination support
   */
  findManyPaginated(
    { page, limit, sortBy = "createdAt", sortOrder = "desc" }: PaginationParams,
    filter?: UserFilter
  ): Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError> {
    const offset = (page - 1) * limit;
    const orderBy = sortOrder === "asc" ? asc : desc;
    const sortColumn = users[sortBy as keyof typeof users] ?? users.createdAt;

    return pipe(
      Effect.tryPromise({
        try: async () => {
          let query = this.db
            .select()
            .from(users)
            .orderBy(orderBy(sortColumn))
            .limit(limit)
            .offset(offset);

          if (filter?.email) {
            query = query.where(eq(users.email, filter.email)) as any;
          }
          if (filter?.role) {
            query = query.where(eq(users.role, filter.role)) as any;
          }
          if (filter?.isActive !== undefined) {
            query = query.where(eq(users.isActive, filter.isActive)) as any;
          }

          return await query;
        },
        catch: (err) =>
          new DatabaseError({
            message: `Pagination query failed: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodeUser(row)))
      ),
      Effect.flatMap((usersList) =>
        pipe(
          Effect.tryPromise({
            try: () => this.db.select({ count: count() }).from(users),
            catch: (err) =>
              new DatabaseError({
                message: `Count query failed: ${err instanceof Error ? err.message : String(err)}`,
                cause: err,
              }),
          }),
          Effect.map((results) => {
            const result = results[0];
            const total = Number(result?.count ?? 0);
            const totalPages = Math.ceil(total / limit);
            return {
              data: usersList,
              pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
              },
            } satisfies PaginatedResponse<UserEntity>;
          })
        )
      ),
      Effect.mapError(
        (err) =>
          err instanceof DatabaseError
            ? err
            : new DatabaseError({
                message: "Pagination failed",
                cause: err,
              })
      )
    );
  }

  /**
   * Saves a user entity (insert or update)
   */
  save(
    user: UserEntity
  ): Effect.Effect<UserEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.findByEmail(user.email),
      Effect.flatMap(
        Option.match({
          onNone: () => this.insert(user),
          onSome: (existing) =>
            existing.id === user.id
              ? this.update(user)
              : Effect.fail(
                  new ConflictError(
                    `User with email ${user.email} already exists`,
                    "email"
                  )
                ),
        })
      )
    );
  }

  /**
   * Inserts a new user into the database
   */
  private insert(
    user: UserEntity
  ): Effect.Effect<UserEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.encodeUser(user),
      Effect.flatMap((row) =>
        Effect.tryPromise({
          try: () => this.db.insert(users).values(row as any),
          catch: (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("unique") || msg.includes("duplicate")) {
              return new ConflictError(
                `User with email ${user.email} already exists`,
                "email"
              );
            }
            return new DatabaseError({
              message: `Failed to insert user: ${msg}`,
              cause: err,
            });
          },
        })
      ),
      Effect.as(user)
    );
  }

  /**
   * Updates an existing user in the database
   */
  private update(
    user: UserEntity
  ): Effect.Effect<UserEntity, DatabaseError | ValidationError | NotFoundError> {
    return pipe(
      this.exists(user.id),
      Effect.flatMap((exists) =>
        exists
          ? this.encodeUser(user)
          : Effect.fail(
              new NotFoundError({
                message: "User not found",
                resource: "User",
                id: user.id,
              })
            )
      ),
      Effect.flatMap((row) =>
        Effect.tryPromise({
          try: () =>
            this.db.update(users).set(row as any).where(eq(users.id, user.id)),
          catch: (err) =>
            new DatabaseError({
              message: `Failed to update user: ${err instanceof Error ? err.message : String(err)}`,
              cause: err,
            }),
        })
      ),
      Effect.as(user)
    );
  }

  /**
   * Deletes a user by ID (hard delete)
   */
  delete(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError> {
    return pipe(
      this.exists(id),
      Effect.flatMap((exists) =>
        exists
          ? pipe(
              Effect.tryPromise({
                try: () => this.db.delete(users).where(eq(users.id, id)),
                catch: (err) =>
                  new DatabaseError({
                    message: `Failed to delete user: ${err instanceof Error ? err.message : String(err)}`,
                    cause: err,
                  }),
              }),
              Effect.as(true)
            )
          : Effect.fail(
              new NotFoundError({
                message: "User not found",
                resource: "User",
                id,
              })
            )
      )
    );
  }

  /**
   * Soft deletes a user by marking them as inactive
   */
  softDelete(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError> {
    return pipe(
      this.findById(id),
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              new NotFoundError({
                message: "User not found",
                resource: "User",
                id,
              })
            ),
          onSome: (user) =>
            pipe(
              user.deactivate(),
              Effect.flatMap((deactivated) => this.save(deactivated)),
              Effect.as(true)
            ),
        })
      ),
      Effect.mapError((err) =>
        err instanceof NotFoundError
          ? err
          : new DatabaseError({
              message: "Failed to soft delete user",
              cause: err,
            })
      )
    );
  }

  /**
   * Checks if a user exists by ID
   */
  exists(id: string): Effect.Effect<boolean, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, id))
            .limit(1),
        catch: (err) =>
          new DatabaseError({
            message: `Failed to check user existence: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      }),
      Effect.map((rows) => rows.length > 0)
    );
  }

  /**
   * Counts users matching the given filter
   */
  count(filter?: UserFilter): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          let query = this.db.select({ count: count() }).from(users);

          if (filter?.email) {
            query = query.where(eq(users.email, filter.email)) as any;
          }
          if (filter?.role) {
            query = query.where(eq(users.role, filter.role)) as any;
          }
          if (filter?.isActive !== undefined) {
            query = query.where(eq(users.isActive, filter.isActive)) as any;
          }

          const result = await query;
          return Number(result[0]?.count ?? 0);
        },
        catch: (err) =>
          new DatabaseError({
            message: `Failed to count users: ${err instanceof Error ? err.message : String(err)}`,
            cause: err,
          }),
      })
    );
  }
}