/**
 * User repository implementation using Drizzle ORM
 * Concrete implementation of IUserRepository interface
 */

import { eq, and, or, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../../services';
import { users } from '../../db/models/schema';
import { User, UserRole, PaginationParams, PaginatedResponse } from '../../types';
import {
  IUserRepository,
  CreateUserDTO,
  UpdateUserDTO,
  UserFiltersDTO,
} from '../interfaces/user.repository';

/**
 * User repository implementation
 * Provides data access layer for user operations using Drizzle ORM
 */
export class UserRepository implements IUserRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Find user by ID
   * @param {string} id - User unique identifier
   * @returns {Promise<User | null>} User or null if not found
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  /**
   * Find multiple users with optional filtering
   * @param {UserFiltersDTO} filters - Optional filters to apply
   * @returns {Promise<User[]>} Array of users
   */
  async findMany(filters?: UserFiltersDTO): Promise<User[]> {
    const conditions = filters ? this.buildWhereConditions(filters) : undefined;
    
    const result = await this.db
      .select()
      .from(users)
      .where(conditions)
      .orderBy(desc(users.createdAt));
      
    return result.map(this.mapToUser);
  }

  /**
   * Find users with pagination
   * @param {PaginationParams} pagination - Pagination parameters
   * @param {UserFiltersDTO} filters - Optional filters to apply
   * @returns {Promise<PaginatedResponse<User>>} Paginated response
   */
  async findManyPaginated(
    pagination: PaginationParams,
    filters?: UserFiltersDTO
  ): Promise<PaginatedResponse<User>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;
    const conditions = filters ? this.buildWhereConditions(filters) : undefined;

    // Get data
    const sortColumn = this.getSortColumn(sortBy);
    const data = await this.db
      .select()
      .from(users)
      .where(conditions)
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(conditions);

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(this.mapToUser),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find single user by filters
   * @param {UserFiltersDTO} filters - Filters to apply
   * @param {boolean} includePassword - Whether to include password in result
   * @returns {Promise<User | null>} User or null if not found
   */
  async findOne(filters: UserFiltersDTO, includePassword = false): Promise<User | null> {
    const conditions = this.buildWhereConditions(filters);
    if (!conditions) {
      return null;
    }

    const result = await this.db
      .select()
      .from(users)
      .where(conditions)
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const user = this.mapToUser(result[0]);
    if (includePassword) {
      (user as any).password = result[0].password;
    }
    return user;
  }

  /**
   * Create new user
   * @param {CreateUserDTO} data - Data for user creation
   * @returns {Promise<User>} Created user
   */
  async create(data: CreateUserDTO): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const userData = {
      id,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || UserRole.USER,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(users).values(userData);
    return this.mapToUser(userData);
  }

  /**
   * Create multiple users
   * @param {CreateUserDTO[]} data - Array of data for user creation
   * @returns {Promise<User[]>} Array of created users
   */
  async createMany(data: CreateUserDTO[]): Promise<User[]> {
    const now = new Date();
    const usersData = data.map(user => ({
      id: uuidv4(),
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || UserRole.USER,
      isActive: user.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    await this.db.insert(users).values(usersData);
    return usersData.map(this.mapToUser);
  }

  /**
   * Update user by ID
   * @param {string} id - User unique identifier
   * @param {UpdateUserDTO} data - Data for user update
   * @returns {Promise<User | null>} Updated user or null if not found
   */
  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  /**
   * Update multiple users by filters
   * @param {UserFiltersDTO} filters - Filters to identify users to update
   * @param {UpdateUserDTO} data - Data for user update
   * @returns {Promise<number>} Number of updated users
   */
  async updateMany(filters: UserFiltersDTO, data: UpdateUserDTO): Promise<number> {
    const conditions = this.buildWhereConditions(filters);
    if (!conditions) {
      return 0;
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.db
      .update(users)
      .set(updateData)
      .where(conditions)
      .returning({ id: users.id });

    return result.length;
  }

  /**
   * Delete user by ID
   * @param {string} id - User unique identifier
   * @returns {Promise<boolean>} True if user was deleted
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return result.length > 0;
  }

  /**
   * Delete multiple users by filters
   * @param {UserFiltersDTO} filters - Filters to identify users to delete
   * @returns {Promise<number>} Number of deleted users
   */
  async deleteMany(filters: UserFiltersDTO): Promise<number> {
    const conditions = this.buildWhereConditions(filters);
    if (!conditions) {
      return 0;
    }

    const result = await this.db
      .delete(users)
      .where(conditions)
      .returning({ id: users.id });

    return result.length;
  }

  /**
   * Check if user exists by ID
   * @param {string} id - User unique identifier
   * @returns {Promise<boolean>} True if user exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Count users with optional filtering
   * @param {UserFiltersDTO} filters - Optional filters to apply
   * @returns {Promise<number>} Number of users
   */
  async count(filters?: UserFiltersDTO): Promise<number> {
    const conditions = filters ? this.buildWhereConditions(filters) : undefined;
    
    const result = await this.db
      .select({ count: count() })
      .from(users)
      .where(conditions);

    return result[0].count;
  }

  // User-specific methods

  /**
   * Find user by email address
   * @param {string} email - User email address
   * @returns {Promise<User | null>} User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  /**
   * Find users by role
   * @param {UserRole} role - User role to filter by
   * @returns {Promise<User[]>} Array of users with specified role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(desc(users.createdAt));

    return result.map(this.mapToUser);
  }

  /**
   * Find active users
   * @returns {Promise<User[]>} Array of active users
   */
  async findActiveUsers(): Promise<User[]> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(desc(users.createdAt));

    return result.map(this.mapToUser);
  }

  /**
   * Check if email is already taken
   * @param {string} email - Email address to check
   * @param {string} excludeUserId - Optional user ID to exclude from check
   * @returns {Promise<boolean>} True if email is taken
   */
  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const conditions = excludeUserId 
      ? and(eq(users.email, email), sql`${users.id} != ${excludeUserId}`)
      : eq(users.email, email);

    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(conditions)
      .limit(1);

    return result.length > 0;
  }

  /**
   * Update user password
   * @param {string} userId - User unique identifier
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<boolean>} True if password was updated
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return result.length > 0;
  }

  /**
   * Update user last login timestamp
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if timestamp was updated
   */
  async updateLastLogin(userId: string): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return result.length > 0;
  }

  /**
   * Deactivate user account
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user was deactivated
   */
  async deactivateUser(userId: string): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return result.length > 0;
  }

  /**
   * Activate user account
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user was activated
   */
  async activateUser(userId: string): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return result.length > 0;
  }

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Promise<User[]>} Array of matching users
   */
  async searchUsers(searchTerm: string, limit = 10): Promise<User[]> {
    const searchPattern = `%${searchTerm}%`;
    
    const result = await this.db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, searchPattern),
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern)
        )
      )
      .limit(limit)
      .orderBy(desc(users.createdAt));

    return result.map(this.mapToUser);
  }

  // Private helper methods

  /**
   * Map database row to User entity
   * @param {any} row - Database row
   * @returns {User} User entity
   */
  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as UserRole,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Build WHERE conditions from filters
   * @param {UserFiltersDTO} filters - Filters to apply
   * @returns {any} Drizzle WHERE condition or undefined
   */
  private buildWhereConditions(filters: UserFiltersDTO): any {
    const conditions = [];

    if (filters.email) {
      conditions.push(eq(users.email, filters.email));
    }

    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(users.email, searchPattern),
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern)
        )
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Get sort column for ordering
   * @param {string} sortBy - Sort field name
   * @returns {any} Drizzle column reference
   */
  private getSortColumn(sortBy: string): any {
    switch (sortBy) {
      case 'email':
        return users.email;
      case 'firstName':
        return users.firstName;
      case 'lastName':
        return users.lastName;
      case 'role':
        return users.role;
      case 'isActive':
        return users.isActive;
      case 'updatedAt':
        return users.updatedAt;
      case 'createdAt':
      default:
        return users.createdAt;
    }
  }
}