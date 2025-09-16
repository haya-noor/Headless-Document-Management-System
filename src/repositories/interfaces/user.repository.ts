/**
 * User repository interface
 * Defines user-specific data access operations
 */

import { User, UserRole } from '../../types';
import { BaseRepository } from './base.repository';

/**
 * User creation data transfer object
 */
export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * User update data transfer object
 */
export interface UpdateUserDTO {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * User filter data transfer object
 */
export interface UserFiltersDTO {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string; // Search in firstName, lastName, email
}

/**
 * User repository interface
 * Extends base repository with user-specific operations
 */
export interface IUserRepository extends BaseRepository<User, CreateUserDTO, UpdateUserDTO, UserFiltersDTO> {
  /**
   * Find single user by filters
   * @param {UserFiltersDTO} filters - Filters to apply
   * @param {boolean} includePassword - Whether to include password in result
   * @returns {Promise<User | null>} User or null if not found
   */
  findOne(filters: UserFiltersDTO, includePassword?: boolean): Promise<User | null>;
  /**
   * Find user by email address
   * @param {string} email - User email address
   * @returns {Promise<User | null>} User or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find users by role
   * @param {UserRole} role - User role to filter by
   * @returns {Promise<User[]>} Array of users with specified role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Find active users
   * @returns {Promise<User[]>} Array of active users
   */
  findActiveUsers(): Promise<User[]>;

  /**
   * Check if email is already taken
   * @param {string} email - Email address to check
   * @param {string} excludeUserId - Optional user ID to exclude from check
   * @returns {Promise<boolean>} True if email is taken
   */
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;

  /**
   * Update user password
   * @param {string} userId - User unique identifier
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<boolean>} True if password was updated
   */
  updatePassword(userId: string, hashedPassword: string): Promise<boolean>;

  /**
   * Update user last login timestamp
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if timestamp was updated
   */
  updateLastLogin(userId: string): Promise<boolean>;

  /**
   * Deactivate user account
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user was deactivated
   */
  deactivateUser(userId: string): Promise<boolean>;

  /**
   * Activate user account
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user was activated
   */
  activateUser(userId: string): Promise<boolean>;

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Promise<User[]>} Array of matching users
   */
  searchUsers(searchTerm: string, limit?: number): Promise<User[]>;
}
