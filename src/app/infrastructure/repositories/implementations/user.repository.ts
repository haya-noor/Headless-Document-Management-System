/**
 * User repository implementation using Drizzle ORM
 * Concrete implementation of UserRepository interface
 */

import { eq, and, or, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Effect, Option } from 'effect';
import { databaseService } from '../../../application/workflow';
import { users } from '../../database/models';
import { User } from '../../../application/interfaces';
import { PaginationParams, PaginatedResponse } from '../../../domain/shared/api.interface';
import { UserRole } from '../../../application/types';
import {
  UserRepository,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilterDTO,
} from '../../../application/interfaces/user.interface';
import { Repository } from '../../../domain/shared/errors';
import { UserEntity } from '../../../domain/user/entity';

// DTO types for user repository
export interface UserFiltersDTO {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

/**
 * User repository implementation
 * Provides data access layer for user operations using Drizzle ORM
 */
export class UserRepositoryImpl implements UserRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Find user by ID
   * @param {string} id - User unique identifier
   * @returns {Promise<Option.Option<User>>} Option.Some(user) if found, Option.None if not found
   */
  async findById(id: string): Promise<Option.Option<User>> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1); 

    return result[0] ? Option.some(this.mapToUser(result[0])) : Option.none();
  }

  /**
   * Find multiple users with optional filtering
   * @param {UserFiltersDTO} filters - Optional filters to apply
   * @returns {Promise<User[]>} Array of users
   * 
   * conditions: 
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
    // it is the offset of the page, it is the number of records to skip
    // so if we are on page 2, and we have 10 records per page, we will skip the first 10 records
    // and get the next 10 records.
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
        // if the page is less than the total pages, then we have a next page 
        hasNext: page < totalPages,
        // if the page is greater than 1, then we have a previous page
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find single user by filters
   * @param {UserFiltersDTO} filters - Filters to apply
   * @param {boolean} includePassword - Whether to include password in result
   * @returns {Promise<Option.Option<User>>} Option.Some(user) if found, Option.None if not found
   */
  async findOne(filters: UserFiltersDTO, includePassword = false): Promise<Option.Option<User>> {
    const conditions = this.buildWhereConditions(filters);
    if (!conditions) {
      return Option.none();  
    }

    const result = await this.db
      .select()
      .from(users)
      .where(conditions)
      .limit(1);

      // if no user is found, return Option.none()
    if (!result[0]) {
      return Option.none();
    }

    const user = this.mapToUser(result[0]);
    if (includePassword) {
      // it is a type assertion, it is saying that the user is of type any
      (user as any).password = result[0].password;
    }
    return Option.some(user);
  }

  /**
   * Create new user
   * @param {CreateUserDTO} data - Data for user creation
   * @returns {Promise<User>} Created user
   */
  async create(data: CreateUserDTO): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    // userData is the data that will be inserted into the database. serializes the 
    // data into the database, taking the input DTO 
    // and converting it to the database format (DB row)
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
    // usersData is the data that will be inserted into the database. 
    // serializes the data into the database, taking the input DTO 
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
   * @returns {Promise<Option.Option<User>>} Option.Some(updated user) if found, Option.None if not found
   */
  async update(id: string, data: UpdateUserDTO): Promise<Option.Option<User>> {
    const updateData = {
      ...data, // spread the data object, so we can update the user with the new data
      updatedAt: new Date(),
    };

    const result = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return result[0] ? Option.some(this.mapToUser(result[0])) : Option.none();
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

    // ...data = spread the data object, so we can update the user with the new data
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
   * @returns {Promise<Option.Option<User>>} Option.Some(user) if found, Option.None if not found
   */
  async findByEmail(email: string): Promise<Option.Option<User>> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ? Option.some(this.mapToUser(result[0])) : Option.none();
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
   * why descending order?
   * because we want to get the users that have been created most recently
   * and are active.
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
   * 
   * UpdateLastLogin = update the user's last login timestamp, this user last logged in
   * right now. 
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

  // Specialized profile methods

  /**
   * Find users with complete profiles (pagination)
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<User>>} Users with complete profiles
   */
  async fetchWithCompleteProfiles(pagination: PaginationParams): Promise<PaginatedResponse<User>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;
    const sortColumn = this.getSortColumn(sortBy);
    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Filter for users with complete profiles (all profile fields not null)
    const conditions = and(
      sql`${users.dateOfBirth} IS NOT NULL`,
      sql`${users.phoneNumber} IS NOT NULL`,
      sql`${users.profileImage} IS NOT NULL`
    );

    const data = await this.db
      .select()
      .from(users)
      .where(conditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

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
   * Find users with minimal profiles (pagination)
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<User>>} Users with minimal profiles
   */
  async fetchWithMinimalProfiles(pagination: PaginationParams): Promise<PaginatedResponse<User>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;
    const sortColumn = this.getSortColumn(sortBy);
    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Filter for users with minimal profiles (missing profile fields)
    const conditions = or(
      sql`${users.dateOfBirth} IS NULL`,
      sql`${users.phoneNumber} IS NULL`,
      sql`${users.profileImage} IS NULL`
    );

    const data = await this.db
      .select()
      .from(users)
      .where(conditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

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
   * Find user by phone number
   * @param {string} phoneNumber - User phone number
   * @returns {Promise<Option.Option<User>>} Option.Some(user) if found, Option.None if not found
   */
  async fetchByPhoneNumber(phoneNumber: string): Promise<Option.Option<User>> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    return result[0] ? Option.some(this.mapToUser(result[0])) : Option.none();
  }

  /**
   * Check if user exists by ID
   * @param {string} userId - User unique identifier
   * @returns {Promise<boolean>} True if user exists
   */
  async existsByUserId(userId: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0].count > 0;
  }

  // Public serialization methods (for testing and external use)
  
  /**
   * Convert UserEntity to database format
   * @param {UserEntity} user - User domain entity
   * @returns {any} Database row
   */
  public serializeToDatabase(user: UserEntity): any {
    return this.userEntityToDatabaseSync(user);
  }

  /**
   * Convert database row to UserEntity
   * @param {any} row - Database row
   * @returns {UserEntity} User domain entity
   */
  public deserializeFromDatabase(row: any): UserEntity {
    return this.databaseToUserEntitySync(row);
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
      dateOfBirth: row.dateOfBirth,
      phoneNumber: row.phoneNumber,
      profileImage: row.profileImage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Convert UserEntity to database format
   * @param {UserEntity} user - User domain entity
   * @returns {Effect.Effect<any, never, never>} Database row
   */
  private userEntityToDatabase(user: UserEntity): Effect.Effect<any, never, never> {
    return Effect.succeed({
      id: user.id.getValue(),
      email: user.email,
      password: '', // Password is handled separately
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.getValue(),
      updatedAt: user.updatedAt.getValue(),
      isDeleted: false,
    });
  }

  /**
   * Convert database row to UserEntity
   * @param {any} row - Database row
   * @returns {Effect.Effect<UserEntity, Error, never>} User domain entity
   */
  private databaseToUserEntity(row: any): Effect.Effect<UserEntity, Error, never> {
    return Effect.try(() => {
      // Validate required fields
      if (!row.id) throw new Error('Missing required field: id');
      if (!row.email) throw new Error('Missing required field: email');
      if (!row.firstName) throw new Error('Missing required field: firstName');
      if (!row.lastName) throw new Error('Missing required field: lastName');
      if (!row.role) throw new Error('Missing required field: role');
      if (row.isActive === undefined) throw new Error('Missing required field: isActive');
      if (!row.createdAt) throw new Error('Missing required field: createdAt');
      if (!row.updatedAt) throw new Error('Missing required field: updatedAt');

      // Validate role
      if (!Object.values(UserRole).includes(row.role as UserRole)) {
        throw new Error(`Invalid role: ${row.role}`);
      }

      // Create UserEntity from persistence data
      return UserEntity.fromPersistence({
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role as UserRole,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });
  }

  /**
   * Convert UserEntity to database format (synchronous)
   * @param {UserEntity} user - User domain entity
   * @returns {any} Database row
   */
  private userEntityToDatabaseSync(user: UserEntity): any {
    return {
      id: user.id.getValue(),
      email: user.email,
      password: '', // Password is handled separately
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.getValue(),
      updatedAt: user.updatedAt.getValue(),
      isDeleted: false,
    };
  }

  /**
   * Convert database row to UserEntity (synchronous)
   * @param {any} row - Database row
   * @returns {UserEntity} User domain entity
   */
  private databaseToUserEntitySync(row: any): UserEntity {
    // Validate required fields
    if (!row.id) throw new Error('Missing required field: id');
    if (!row.email) throw new Error('Missing required field: email');
    if (!row.firstName) throw new Error('Missing required field: firstName');
    if (!row.lastName) throw new Error('Missing required field: lastName');
    if (!row.role) throw new Error('Missing required field: role');
    if (row.isActive === undefined) throw new Error('Missing required field: isActive');
    if (!row.createdAt) throw new Error('Missing required field: createdAt');
    if (!row.updatedAt) throw new Error('Missing required field: updatedAt');

    // Validate role
    if (!Object.values(UserRole).includes(row.role as UserRole)) {
      throw new Error(`Invalid role: ${row.role}`);
    }

    // Create UserEntity from persistence data
    return UserEntity.fromPersistence({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as UserRole,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
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

      /*
      find user that matches the filters, or match any of these conditions:
      ilike = where i is case insensitive, like = where it is case sensitive
      */
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