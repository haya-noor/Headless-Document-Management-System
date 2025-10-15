/**
 * Effect-based User Repository Interface
 * Defines user-specific data access operations using Effect
 * Following d4-effect.md requirements for effectful signatures and typed errors
 * 
 * Uses Effect Schema concepts with pick/omit to eliminate repetition
 */

import { Effect } from 'effect';
import { Schema } from '@effect/schema';
import { Repository, DatabaseError, NotFoundError, ValidationError } from "../shared/errors";
import { PaginationParams, PaginatedResponse } from '../../domain/shared/api.interface';
import { UserEntity, UserSchema } from '../../domain/user/entity';

/**
 * Base user fields schema - core user properties
 */
const BaseUserFieldsSchema = Schema.Struct({
  email: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  ),
  firstName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  lastName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  role: Schema.Literal('admin', 'user'),
  isActive: Schema.Boolean,
});

/**
 * Optional user fields schema - fields that can be optional
 */
const OptionalUserFieldsSchema = Schema.Struct({
  dateOfBirth: Schema.optional(Schema.Date),
  phoneNumber: Schema.optional(Schema.String.pipe(Schema.maxLength(20))),
  profileImage: Schema.optional(Schema.String.pipe(Schema.maxLength(500))),
});

/**
 * User creation data transfer object schema
 * Combines base fields with optional fields for creation
 */
export const CreateUserDTOSchema = Schema.Struct({
  ...BaseUserFieldsSchema.fields,
  ...OptionalUserFieldsSchema.fields,
});

/**
 * User update data transfer object schema
 * All fields are optional for updates, plus additional update-specific fields
 */
export const UpdateUserDTOSchema = Schema.Struct({
  email: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  )),
  firstName: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  )),
  lastName: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  )),
  role: Schema.optional(Schema.Literal('admin', 'user')),
  isActive: Schema.optional(Schema.Boolean),
  dateOfBirth: Schema.optional(Schema.Date),
  phoneNumber: Schema.optional(Schema.String.pipe(Schema.maxLength(20))),
  profileImage: Schema.optional(Schema.String.pipe(Schema.maxLength(500))),
});

/**
 * User filter data transfer object schema
 * Fields for filtering and searching users
 * Uses field schemas where appropriate
 */
export const UserFilterDTOSchema = Schema.Struct({
  email: Schema.optional(Schema.String),
  role: Schema.optional(Schema.Literal('admin', 'user')),
  isActive: Schema.optional(Schema.Boolean),
  search: Schema.optional(Schema.String), // Search in firstName, lastName, email
  hasCompleteProfile: Schema.optional(Schema.Boolean),
  hasMinimalProfile: Schema.optional(Schema.Boolean),
  createdAfter: Schema.optional(Schema.Date),
  createdBefore: Schema.optional(Schema.Date),
});

/**
 * User creation data transfer object type
 */
export type CreateUserDTO = Schema.Schema.Type<typeof CreateUserDTOSchema>;

/**
 * User update data transfer object type
 */
export type UpdateUserDTO = Schema.Schema.Type<typeof UpdateUserDTOSchema>;

/**
 * User filter data transfer object type
 */
export type UserFilterDTO = Schema.Schema.Type<typeof UserFilterDTOSchema>;

/**
 * User statistics schema
 */
export const UserStatisticsSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.nonNegative()),
  byRole: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  active: Schema.Number.pipe(Schema.nonNegative()),
  inactive: Schema.Number.pipe(Schema.nonNegative()),
  withCompleteProfile: Schema.Number.pipe(Schema.nonNegative()),
  withMinimalProfile: Schema.Number.pipe(Schema.nonNegative()),
});

/**
 * User statistics type
 */
export type UserStatistics = Schema.Schema.Type<typeof UserStatisticsSchema>;

/**
 * Derived schemas using pick and omit for specific use cases
 */

/**
 * User summary schema - only essential fields for listing
 */
export const UserSummarySchema = Schema.Struct({
  id: UserSchema.fields.id,
  email: UserSchema.fields.email,
  firstName: UserSchema.fields.firstName,
  lastName: UserSchema.fields.lastName,
  role: UserSchema.fields.role,
  isActive: UserSchema.fields.isActive,
  createdAt: UserSchema.fields.createdAt,
});

/**
 * User profile schema - only profile fields
 */
export const UserProfileSchema = Schema.Struct({
  id: UserSchema.fields.id,
  firstName: UserSchema.fields.firstName,
  lastName: UserSchema.fields.lastName,
  email: UserSchema.fields.email,
  dateOfBirth: UserSchema.fields.dateOfBirth,
  phoneNumber: UserSchema.fields.phoneNumber,
  profileImage: UserSchema.fields.profileImage,
});

/**
 * User public schema - only public fields
 */
export const UserPublicSchema = Schema.Struct({
  id: UserSchema.fields.id,
  firstName: UserSchema.fields.firstName,
  lastName: UserSchema.fields.lastName,
  role: UserSchema.fields.role,
  isActive: UserSchema.fields.isActive,
  createdAt: UserSchema.fields.createdAt,
});

/**
 * User audit schema - only audit fields
 */
export const UserAuditSchema = Schema.Struct({
  id: UserSchema.fields.id,
  email: UserSchema.fields.email,
  role: UserSchema.fields.role,
  isActive: UserSchema.fields.isActive,
  createdAt: UserSchema.fields.createdAt,
  updatedAt: UserSchema.fields.updatedAt,
});

/**
 * User creation input schema - omits system-generated fields
 */
export const UserCreationInputSchema = Schema.Struct({
  email: UserSchema.fields.email,
  firstName: UserSchema.fields.firstName,
  lastName: UserSchema.fields.lastName,
  role: UserSchema.fields.role,
  dateOfBirth: UserSchema.fields.dateOfBirth,
  phoneNumber: UserSchema.fields.phoneNumber,
  profileImage: UserSchema.fields.profileImage,
});

/**
 * User update input schema - only updatable fields
 */
export const UserUpdateInputSchema = Schema.Struct({
  email: UserSchema.fields.email,
  firstName: UserSchema.fields.firstName,
  lastName: UserSchema.fields.lastName,
  role: UserSchema.fields.role,
  dateOfBirth: UserSchema.fields.dateOfBirth,
  phoneNumber: UserSchema.fields.phoneNumber,
  profileImage: UserSchema.fields.profileImage,
});

/**
 * User search result schema - optimized for search results
 */
export const UserSearchResultSchema = Schema.Struct({
  id: UserSchema.fields.id,
  email: UserSchema.fields.email,
  firstName: UserSchema.fields.firstName,
  lastName: UserSchema.fields.lastName,
  role: UserSchema.fields.role,
  isActive: UserSchema.fields.isActive,
  createdAt: UserSchema.fields.createdAt,
});

/**
 * Type exports for the derived schemas
 */
export type UserSummary = Schema.Schema.Type<typeof UserSummarySchema>;
export type UserProfile = Schema.Schema.Type<typeof UserProfileSchema>;
export type UserPublic = Schema.Schema.Type<typeof UserPublicSchema>;
export type UserAudit = Schema.Schema.Type<typeof UserAuditSchema>;
export type UserCreationInput = Schema.Schema.Type<typeof UserCreationInputSchema>;
export type UserUpdateInput = Schema.Schema.Type<typeof UserUpdateInputSchema>;
export type UserSearchResult = Schema.Schema.Type<typeof UserSearchResultSchema>;

/**
 * Effect-based User repository interface
 * Provides Effect-based operations for user management with proper validation
 */
export interface UserRepository {
  /**
   * Create a new user with validation
   * @param {CreateUserDTO} data - User creation data
   * @returns {Effect.Effect<UserEntity, ValidationError | DatabaseError>} Created user or error
   */
  create(data: CreateUserDTO): Effect.Effect<UserEntity, ValidationError | DatabaseError>;

  /**
   * Update a user with validation
   * @param {string} id - User ID
   * @param {UpdateUserDTO} data - User update data
   * @returns {Effect.Effect<UserEntity, ValidationError | NotFoundError | DatabaseError>} Updated user or error
   */
  update(id: string, data: UpdateUserDTO): Effect.Effect<UserEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Effect.Effect<UserEntity | null, DatabaseError>} User or null if not found
   */
  findById(id: string): Effect.Effect<UserEntity | null, DatabaseError>;

  /**
   * Find all users with pagination
   * @param {PaginationParams} params - Pagination parameters
   * @returns {Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError>} Paginated users or error
   */
  findAll(params: PaginationParams): Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError>;

  /**
   * Delete a user by ID
   * @param {string} id - User ID
   * @returns {Effect.Effect<boolean, DatabaseError>} Success or error
   */
  delete(id: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Find user by email address
   * @param {string} email - User email address
   * @returns {Effect.Effect<UserEntity | null, ValidationError | DatabaseError>} User or null if not found
   */
  findByEmail(email: string): Effect.Effect<UserEntity | null, ValidationError | DatabaseError>;

  /**
   * Find users by role
   * @param {'admin' | 'user'} role - User role to filter by
   * @returns {Effect.Effect<UserEntity[], ValidationError | DatabaseError>} Array of users with specified role or error
   */
  findByRole(role: 'admin' | 'user'): Effect.Effect<UserEntity[], ValidationError | DatabaseError>;

  /**
   * Find active users
   * @returns {Effect.Effect<UserEntity[], DatabaseError>} Array of active users or error
   */
  findActiveUsers(): Effect.Effect<UserEntity[], DatabaseError>;

  /**
   * Check if email is already taken
   * @param {string} email - Email address to check
   * @param {string} excludeUserId - Optional user ID to exclude from check
   * @returns {Effect.Effect<boolean, ValidationError | DatabaseError>} True if email is taken or error
   */
  isEmailTaken(email: string, excludeUserId?: string): Effect.Effect<boolean, ValidationError | DatabaseError>;

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Effect.Effect<UserEntity[], ValidationError | DatabaseError>} Array of matching users or error
   */
  searchUsers(searchTerm: string, limit?: number): Effect.Effect<UserEntity[], ValidationError | DatabaseError>;

  /**
   * Find users by multiple IDs
   * @param {string[]} userIds - Array of user IDs
   * @returns {Effect.Effect<UserEntity[], ValidationError | DatabaseError>} Array of users or error
   */
  findByIds(userIds: string[]): Effect.Effect<UserEntity[], ValidationError | DatabaseError>;

  /**
   * Count users by role
   * @param {'admin' | 'user'} role - User role to count
   * @returns {Effect.Effect<number, DatabaseError>} Number of users with specified role or error
   */
  countByRole(role: 'admin' | 'user'): Effect.Effect<number, DatabaseError>;

  /**
   * Find users created within date range
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Effect.Effect<UserEntity[], ValidationError | DatabaseError>} Array of users or error
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Effect.Effect<UserEntity[], ValidationError | DatabaseError>;

  /**
   * Find users with complete profiles (pagination)
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError>} Users with complete profiles
   */
  findWithCompleteProfiles(pagination: PaginationParams): Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError>;

  /**
   * Find users with minimal profiles (pagination)
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError>} Users with minimal profiles
   */
  findWithMinimalProfiles(pagination: PaginationParams): Effect.Effect<PaginatedResponse<UserEntity>, DatabaseError>;

  /**
   * Find user by phone number
   * @param {string} phoneNumber - User phone number
   * @returns {Effect.Effect<UserEntity | null, ValidationError | DatabaseError>} User or null if not found
   */
  findByPhoneNumber(phoneNumber: string): Effect.Effect<UserEntity | null, ValidationError | DatabaseError>;

  /**
   * Check if user exists by ID
   * @param {string} userId - User unique identifier
   * @returns {Effect.Effect<boolean, DatabaseError>} True if user exists
   */
  existsById(userId: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Get user statistics
   * @returns {Effect.Effect<UserStatistics, DatabaseError>} Statistics or error
   */
  getStatistics(): Effect.Effect<UserStatistics, DatabaseError>;

  /**
   * Deactivate user account
   * @param {string} userId - User unique identifier
   * @returns {Effect.Effect<UserEntity, ValidationError | NotFoundError | DatabaseError>} Updated user or error
   */
  deactivateUser(userId: string): Effect.Effect<UserEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Activate user account
   * @param {string} userId - User unique identifier
   * @returns {Effect.Effect<UserEntity, ValidationError | NotFoundError | DatabaseError>} Updated user or error
   */
  activateUser(userId: string): Effect.Effect<UserEntity, ValidationError | NotFoundError | DatabaseError>;
}

/**
 * User repository validation utilities
 * Provides Effect-based validation functions using the schemas
 */
export const UserRepositoryValidation = {
  /**
   * Validate create user data
   */
  validateCreate: (data: unknown) => 
    Schema.decodeUnknown(CreateUserDTOSchema)(data),

  /**
   * Validate update user data
   */
  validateUpdate: (data: unknown) => 
    Schema.decodeUnknown(UpdateUserDTOSchema)(data),

  /**
   * Validate filter user data
   */
  validateFilter: (data: unknown) => 
    Schema.decodeUnknown(UserFilterDTOSchema)(data),

  /**
   * Validate user ID
   */
  validateUserId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('UserId')))(id),

  /**
   * Validate user email
   */
  validateEmail: (email: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      Schema.maxLength(255)
    ))(email),

  /**
   * Validate user summary data
   */
  validateSummary: (data: unknown) => 
    Schema.decodeUnknown(UserSummarySchema)(data),

  /**
   * Validate user profile data
   */
  validateProfile: (data: unknown) => 
    Schema.decodeUnknown(UserProfileSchema)(data),

  /**
   * Validate user public data
   */
  validatePublic: (data: unknown) => 
    Schema.decodeUnknown(UserPublicSchema)(data),

  /**
   * Validate user search result data
   */
  validateSearchResult: (data: unknown) => 
    Schema.decodeUnknown(UserSearchResultSchema)(data),
};

/**
 * User schema transformation utilities
 * Demonstrates advanced Effect Schema concepts
 */
export const UserSchemaUtils = {
  /**
   * Transform user to summary format
   */
  toSummary: (user: UserEntity) => 
    Schema.decodeUnknown(UserSummarySchema)(user),

  /**
   * Transform user to public format (removes sensitive data)
   */
  toPublic: (user: UserEntity) => 
    Schema.decodeUnknown(UserPublicSchema)(user),

  /**
   * Transform user to search result format
   */
  toSearchResult: (user: UserEntity) => 
    Schema.decodeUnknown(UserSearchResultSchema)(user),

  /**
   * Extract profile from user
   */
  extractProfile: (user: UserEntity) => 
    Schema.decodeUnknown(UserProfileSchema)(user),

  /**
   * Extract audit information from user
   */
  extractAudit: (user: UserEntity) => 
    Schema.decodeUnknown(UserAuditSchema)(user),

  /**
   * Create a partial user from update data
   */
  createPartial: (updateData: UpdateUserDTO) => 
    Schema.decodeUnknown(UserUpdateInputSchema)(updateData),

  /**
   * Merge user with update data
   */
  mergeWithUpdate: (user: UserEntity, updateData: UpdateUserDTO) => 
    Effect.gen(function* () {
      const partialUpdate = yield* Schema.decodeUnknown(UserUpdateInputSchema)(updateData);
      // Return the merged data as a plain object
      // Note: In a real implementation, you would create a new UserEntity
      return {
        ...user,
        ...partialUpdate,
        updatedAt: new Date()
      };
    }),
};

/**
 * User schema composition utilities
 * Shows how to compose schemas for different use cases
 */
export const UserSchemaComposition = {
  /**
   * Create a schema for user with specific fields
   * Example usage: UserSchemaComposition.withFields(['id', 'email', 'firstName'])
   */
  withFields: (fields: Array<keyof UserEntity>) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      if (field in UserSchema.fields) {
        acc[field] = (UserSchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for user without specific fields
   * Example usage: UserSchemaComposition.withoutFields(['email', 'phoneNumber'])
   */
  withoutFields: (fieldsToOmit: Array<keyof UserEntity>) => {
    const allFields = Object.keys(UserSchema.fields) as Array<keyof UserEntity>;
    const remainingFields = allFields.filter(field => !fieldsToOmit.includes(field));
    
    const fieldSchemas = remainingFields.reduce((acc, field) => {
      if (field in UserSchema.fields) {
        acc[field] = (UserSchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for user with additional validation
   * Example usage: UserSchemaComposition.withValidation(['email'], { email: Schema.String.pipe(Schema.minLength(5)) })
   */
  withValidation: (
    fields: Array<keyof UserEntity>,
    validators: Partial<Record<keyof UserEntity, Schema.Schema<any, any, never>>>
  ) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      acc[field] = validators[field] || (UserSchema.fields as any)[field];
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },
};
