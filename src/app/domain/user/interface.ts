/**
 * Effect-based User Repository Interface
 * Defines user-specific data access operations using Effect
 * Following d4-effect.md requirements for effectful signatures and typed errors
 */

import { Effect, Option } from 'effect';
import { Repository, RepositoryErrorType } from './base.interface';
import { UserEntity } from '../../domain/entities';
import { PaginationParams, PaginatedResponse } from './api.interface';

/**
 * User creation data transfer object
 */
export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
  // Profile fields
  dateOfBirth?: Date;
  phoneNumber?: string;
  profileImage?: string;
}

/**
 * User update data transfer object
 */
export interface UpdateUserDTO {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
  // Profile fields
  dateOfBirth?: Date;
  phoneNumber?: string;
  profileImage?: string;
}

/**
 * User filter data transfer object
 */
export interface UserFilterDTO {
  email?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
  search?: string; // Search in firstName, lastName, email
}

/**
 * Effect-based User repository interface
 * Provides Effect-based operations for user management
 */
export interface UserRepository extends Repository<
  UserEntity,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilterDTO
> {
  /**
   * Find user by email address
   * @param {string} email - User email address
   * @returns {Promise<Option.Option<UserEntity>>} Option.Some(user) if found, Option.None if not found
   */
  findByEmail(email: string): Promise<Option.Option<UserEntity>>;

  /**
   * Find users by role
   * @param {'admin' | 'user'} role - User role to filter by
   * @returns {Effect.Effect<UserEntity[], DatabaseError>} Array of users with specified role or error
   */
  findByRole(role: 'admin' | 'user'): Effect.Effect<UserEntity[], DatabaseError>;

  /**
   * Find active users
   * @returns {Effect.Effect<UserEntity[], DatabaseError>} Array of active users or error
   */
  findActiveUsers(): Effect.Effect<UserEntity[], DatabaseError>;

  /**
   * Check if email is already taken
   * @param {string} email - Email address to check
   * @param {string} excludeUserId - Optional user ID to exclude from check
   * @returns {Effect.Effect<boolean, DatabaseError>} True if email is taken or error
   */
  isEmailTaken(email: string, excludeUserId?: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Update user password
   * @param {string} userId - User unique identifier
   * @param {string} hashedPassword - New hashed password
   * @returns {Effect.Effect<boolean, NotFoundError | DatabaseError>} True if password was updated or error
   */
  updatePassword(userId: string, hashedPassword: string): Effect.Effect<boolean, NotFoundError | DatabaseError>;

  /**
   * Update user last login timestamp
   * @param {string} userId - User unique identifier
   * @returns {Effect.Effect<boolean, NotFoundError | DatabaseError>} True if timestamp was updated or error
   */
  updateLastLogin(userId: string): Effect.Effect<boolean, NotFoundError | DatabaseError>;

  /**
   * Deactivate user account
   * @param {string} userId - User unique identifier
   * @returns {Effect.Effect<UserEntity, NotFoundError | DatabaseError>} Updated user or error
   */
  deactivateUser(userId: string): Effect.Effect<UserEntity, NotFoundError | DatabaseError>;

  /**
   * Activate user account
   * @param {string} userId - User unique identifier
   * @returns {Effect.Effect<UserEntity, NotFoundError | DatabaseError>} Updated user or error
   */
  activateUser(userId: string): Effect.Effect<UserEntity, NotFoundError | DatabaseError>;

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Effect.Effect<UserEntity[], DatabaseError>} Array of matching users or error
   */
  searchUsers(searchTerm: string, limit?: number): Effect.Effect<UserEntity[], DatabaseError>;

  /**
   * Find users by multiple IDs
   * @param {string[]} userIds - Array of user IDs
   * @returns {Effect.Effect<UserEntity[], DatabaseError>} Array of users or error
   */
  findByIds(userIds: string[]): Effect.Effect<UserEntity[], DatabaseError>;

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
   * @returns {Effect.Effect<UserEntity[], DatabaseError>} Array of users or error
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Effect.Effect<UserEntity[], DatabaseError>;

  /**
   * Find users with complete profiles (pagination)
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<UserEntity>>} Users with complete profiles
   */
  fetchWithCompleteProfiles(pagination: PaginationParams): Promise<PaginatedResponse<UserEntity>>;

  /**
   * Find users with minimal profiles (pagination)
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<UserEntity>>} Users with minimal profiles
   */
  fetchWithMinimalProfiles(pagination: PaginationParams): Promise<PaginatedResponse<UserEntity>>;

  /**
   * Find user by phone number
   * @param {string} phoneNumber - User phone number
   * @returns {Promise<Option.Option<UserEntity>>} Option.Some(user) if found, Option.None if not found
   */
  fetchByPhoneNumber(phoneNumber: string): Promise<Option.Option<UserEntity>>;

  /**
   * Check if user exists by ID
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user exists
   */
  existsByUserId(userId: string): Promise<boolean>;
}
