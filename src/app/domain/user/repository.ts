import { Effect, Option } from "effect";
import { UserEntity } from "./entity";
import { UserId } from "@/app/domain/refined/uuid";
import { DatabaseError } from "@/app/domain/shared/base.errors";
import { UserValidationError, UserAlreadyExistsError, UserNotFoundError } from "./errors";
import { BaseRepository } from "@/app/domain/shared/base.repository";
import { PaginatedResponse, PaginationParams } from "../shared";

/**
 * User-specific filter for repository queries
 * 
 * Defines the available filter criteria for finding users.
 */
export interface UserFilter {
  readonly email?: string;
  readonly role?: "admin" | "user";
  readonly isActive?: boolean;
  readonly firstName?: string;
  readonly lastName?: string;
}

/**
 * User-specific sort options
 */
export interface UserSortOptions {
  readonly sortBy?: "createdAt" | "updatedAt" | "email" | "firstName" | "lastName";
  readonly sortOrder?: "asc" | "desc";
}

/**
 * User Repository Interface
 * 
 * Defines all persistence operations for User entities.
 * Implementation lives in infrastructure layer.
 * 
 * Error handling uses domain-specific errors:
 * - UserValidationError: Schema/validation failures
 * - UserAlreadyExistsError: Unique constraint violations (e.g., duplicate email)
 * - UserNotFoundError: Entity not found
 * - DatabaseError: Infrastructure failures
 * 
 * All methods return Effect for proper error handling and composition.
 */
export abstract class UserRepository extends BaseRepository<
  UserEntity,
  UserNotFoundError,
  UserAlreadyExistsError | UserValidationError
> {
  protected readonly entityName = "User" as const;

  // ---------------------------------------------------------------------------
  // Domain-specific read operations
  // ---------------------------------------------------------------------------

  /**
   * Find a user by their email address
   * 
   * Email is a unique identifier in the system.
   * 
   * @param email - User's email address
   * @returns Effect with Option<UserEntity> or DatabaseError
   */
  abstract findByEmail(
    email: string
  ): Effect.Effect<Option.Option<UserEntity>, DatabaseError, never>;

  /**
   * Find multiple users matching the given filter
   * 
   * @param filter - Optional filter criteria
   * @returns Effect with array of UserEntity or DatabaseError
   */
  abstract findMany(
    filter?: UserFilter
  ): Effect.Effect<UserEntity[], DatabaseError, never>;

  /**
   * Find users with pagination support
   * 
   * @param pagination - Pagination parameters (page, limit, sort)
   * @param filter - Optional filter criteria
   * @returns Effect with paginated response or DatabaseError
   */
  abstract findManyPaginated(
    pagination: PaginationParams,
    filter?: UserFilter
  ): Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError, never>;

  /**
   * Find all active users
   * 
   * Convenience method for common query.
   * 
   * @returns Effect with array of active users or DatabaseError
   */
  findActive(): Effect.Effect<UserEntity[], DatabaseError, never> {
    return this.findMany({ isActive: true });
  }

  /**
   * Find all inactive users
   * 
   * Convenience method for common query.
   * 
   * @returns Effect with array of inactive users or DatabaseError
   */
  findInactive(): Effect.Effect<UserEntity[], DatabaseError, never> {
    return this.findMany({ isActive: false });
  }

  /**
   * Find all admin users
   * 
   * @returns Effect with array of admin users or DatabaseError
   */
  findAdmins(): Effect.Effect<UserEntity[], DatabaseError, never> {
    return this.findMany({ role: "admin" });
  }

  /**
   * Find all regular (non-admin) users
   * 
   * @returns Effect with array of regular users or DatabaseError
   */
  findRegularUsers(): Effect.Effect<UserEntity[], DatabaseError, never> {
    return this.findMany({ role: "user" });
  }

  // ---------------------------------------------------------------------------
  // Domain-specific write operations
  // ---------------------------------------------------------------------------

  /**
   * Update user's active status
   * 
   * Business operation for activating/deactivating users.
   * 
   * @param id - User identifier
   * @param isActive - New active status
   * @returns Effect with updated UserEntity or error
   */
  abstract updateActiveStatus(
    id: UserId,
    isActive: boolean
  ): Effect.Effect<
    UserEntity,
    UserNotFoundError | UserValidationError | DatabaseError,
    never
  >;

  /**
   * Update user's role
   * 
   * Business operation for changing user roles.
   * 
   * @param id - User identifier
   * @param role - New role
   * @returns Effect with updated UserEntity or error
   */
  abstract updateRole(
    id: UserId,
    role: "admin" | "user"
  ): Effect.Effect<
    UserEntity,
    UserNotFoundError | UserValidationError | DatabaseError,
    never
  >;

  /**
   * Update user's password
   * 
   * Business operation for password changes.
   * 
   * @param id - User identifier
   * @param hashedPassword - New hashed password
   * @returns Effect with updated UserEntity or error
   */
  abstract updatePassword(
    id: UserId,
    hashedPassword: string
  ): Effect.Effect<
    UserEntity,
    UserNotFoundError | UserValidationError | DatabaseError,
    never
  >;

  /**
   * Update user profile information
   * 
   * Updates optional profile fields (phone, image, DOB).
   * 
   * @param id - User identifier
   * @param profile - Profile updates
   * @returns Effect with updated UserEntity or error
   */
  abstract updateProfile(
    id: UserId,
    profile: {
      phoneNumber?: string;
      profileImage?: string;
      dateOfBirth?: Date;
    }
  ): Effect.Effect<
    UserEntity,
    UserNotFoundError | UserValidationError | DatabaseError,
    never
  >;

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  /**
   * Check if email is already taken
   * 
   * Useful for preventing duplicate accounts during registration.
   * 
   * @param email - Email to check
   * @returns Effect with boolean (true if email exists)
   */
  emailExists(email: string): Effect.Effect<boolean, DatabaseError, never> {
    return Effect.gen(this, function* (_) {
      const user = yield* _(this.findByEmail(email));
      return Option.isSome(user);
    });
  }

  /**
   * Get user by email or fail
   * 
   * Convenience method that fails if user not found.
   * 
   * @param email - User's email
   * @returns Effect with UserEntity or UserNotFoundError
   */
  getByEmail(
    email: string
  ): Effect.Effect<UserEntity, UserNotFoundError | DatabaseError, never> {
    return Effect.gen(this, function* (_) {
      const userOption = yield* _(this.findByEmail(email));
      
      return yield* _(
        Option.match(userOption, {
          onNone: () => Effect.fail(UserNotFoundError.forResource("User", email)),
          onSome: (user) => Effect.succeed(user)
        })
      );
    });
  }

  /**
   * Get user by ID or fail
   * 
   * Convenience method that unwraps Option and fails if not found.
   * 
   * @param id - User identifier
   * @returns Effect with UserEntity or UserNotFoundError
   */
  getById(
    id: UserId
  ): Effect.Effect<UserEntity, UserNotFoundError | DatabaseError, never> {
    return Effect.gen(this, function* (_) {
      const userOption = yield* _(this.findById(id));
      
      return yield* _(
        Option.match(userOption, {
          onNone: () => Effect.fail(UserNotFoundError.forResource("User", id)),
          onSome: (user) => Effect.succeed(user)
        })
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Count operations
  // ---------------------------------------------------------------------------

  /**
   * Count users by role
   * 
   * @param role - User role to count
   * @returns Effect with count or DatabaseError
   */
  countByRole(
    role: "admin" | "user"
  ): Effect.Effect<number, DatabaseError, never> {
    return this.count({ role });
  }

  /**
   * Count active users
   * 
   * @returns Effect with count or DatabaseError
   */
  countActive(): Effect.Effect<number, DatabaseError, never> {
    return this.count({ isActive: true });
  }

  /**
   * Count inactive users
   * 
   * @returns Effect with count or DatabaseError
   */
  countInactive(): Effect.Effect<number, DatabaseError, never> {
    return this.count({ isActive: false });
  }
}