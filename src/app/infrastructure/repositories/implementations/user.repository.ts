import { Effect, Option, pipe, Schema as S } from "effect";
import { eq, desc, asc, count } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { users } from "@/app/infrastructure/database/models";
import type { InferSelectModel } from "drizzle-orm";

type UserModel = InferSelectModel<typeof users>;

import { UserEntity, type SerializedUser } from "@/app/domain/user/entity";
import { User, UserRow, UserCodec } from "@/app/domain/user/schema";
import { UserId } from "@/app/domain/shared/uuid";
import { HashedPassword } from "@/app/domain/shared/password";
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

  /**
   * Encodes a UserEntity to a database row using Effect Schema Codec
   * Uses the Codec's encode transformation directly
   */
  private encodeUser(user: UserEntity): Effect.Effect<UserRow, ValidationError> {
    // Extract domain data
    const domainData = {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      dateOfBirth: Option.getOrUndefined(user.dateOfBirth),
      phoneNumber: Option.getOrUndefined(user.phoneNumber),
      profileImage: Option.getOrUndefined(user.profileImage),
      isActive: user.isActive(),
      createdAt: user.createdAt,
      updatedAt: Option.getOrUndefined(user.updatedAt)
    };

    // Use Codec's encode to transform Domain -> DB Row (Context type suppressed with 'as any')
    return pipe(
      S.encode(UserCodec)(domainData as any),
      Effect.mapError((err: any) =>
        new ValidationError(`Failed to encode user: ${err.message}`, "User")
      )
    ) as any;
  }

  /**
   * Decodes a database row into a UserEntity using Effect Schema Codec
   * Uses the Codec's decode transformation directly
   */
  private decodeUser(row: UserModel): Effect.Effect<UserEntity, ValidationError | UserValidationError> {
    // Use Codec's decode to transform DB Row -> Domain, then create entity (Context type suppressed with 'as any')
    return pipe(
      S.decodeUnknown(UserCodec)(row),
      Effect.mapError((err: any) =>
        new ValidationError(`Failed to decode user: ${err.message}`, "User")
      ),
      Effect.flatMap((decoded) => UserEntity.create(decoded as any))
    ) as any;
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
    
    // Type-safe column selection for sorting
    let sortColumn;
    if (sortBy === 'email') sortColumn = users.email;
    else if (sortBy === 'firstName') sortColumn = users.firstName;
    else if (sortBy === 'lastName') sortColumn = users.lastName;
    else if (sortBy === 'role') sortColumn = users.role;
    else sortColumn = users.createdAt;

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
          Effect.map(([result]) => {
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
              ? pipe(
                  this.update(user),
                  // Convert NotFoundError to DatabaseError for save interface consistency
                  Effect.mapError((err) =>
                    err instanceof NotFoundError
                      ? new DatabaseError({
                          message: err.message,
                          cause: err,
                        })
                      : err
                  )
                )
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
      this.encodeUser(user),
      Effect.flatMap((row): Effect.Effect<UserEntity, DatabaseError | ValidationError | NotFoundError> =>
        pipe(
          this.exists(user.id),
          Effect.flatMap((exists): Effect.Effect<UserEntity, DatabaseError | NotFoundError> => {
            if (!exists) {
              return Effect.fail(
                new NotFoundError({
                  message: "User not found",
                  resource: "User",
                  id: user.id,
                })
              ) as Effect.Effect<UserEntity, NotFoundError>;
            }
            
            return pipe(
              Effect.tryPromise({
                try: () =>
                  this.db.update(users).set(row as any).where(eq(users.id, user.id)),
                catch: (err) =>
                  new DatabaseError({
                    message: `Failed to update user: ${err instanceof Error ? err.message : String(err)}`,
                    cause: err,
                  }),
              }),
              Effect.as(user)
            ) as Effect.Effect<UserEntity, DatabaseError>;
          })
        )
      )
    );
  }

  /**
   * Deletes a user by ID (hard delete)
   */
  delete(id: string): Effect.Effect<boolean, DatabaseError> {
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
              new DatabaseError({
                message: "User not found",
                cause: undefined,
              })
            )
      )
    );
  }

  /**
   * Soft deletes a user by marking them as inactive
   */
  // softDelete(id: string): Effect.Effect<boolean, DatabaseError | NotFoundError> {
  //   return pipe(
  //     this.findById(id),
  //     Effect.flatMap(
  //       Option.match({
  //         onNone: () =>
  //           Effect.fail(
  //             new NotFoundError({
  //               message: "User not found",
  //               resource: "User",
  //               id,
  //             })
  //           ),
  //         onSome: (user) =>
  //           pipe(
  //             user.deactivate(),
  //             Effect.flatMap((deactivated) => this.save(deactivated)),
  //             Effect.as(true)
  //           ),
  //       })
  //     ),
  //     Effect.mapError((err) =>
  //       err instanceof NotFoundError
  //         ? err
  //         : new DatabaseError({
  //             message: "Failed to soft delete user",
  //             cause: err,
  //           })
  //     )
  //   );
  // }

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