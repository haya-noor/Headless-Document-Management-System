/**
 * Shared Columns for Database Schema
 * Provides consistent column definitions across all tables
 * Following d4-effect.md requirements for SharedColumns and app-generated UUIDs
 */

import { varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Shared columns that should be present in all tables
 * - id: Application-generated UUID (36 characters)
 * - createdAt: Timestamp when record was created
 * - updatedAt: Timestamp when record was last updated
 * - isActive: Soft delete flag (optional, defaults to true)
 */
export const sharedColumns = {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
} as const;

/**
 * Optional shared columns for tables that support soft deletes
 * Soft deletion is a technique used to mark a record as "deleted" without actually removing 
 * it from the database. Instead of deleting a record permanently, you mark it as inactive or 
 * deleted, allowing you to keep the record for historical reference or for restoring it later.
 * 
 * is_active is a boolean column that is used to indicate if a record is active or deleted. 
 * by default, all records are active.
 * 
 * By using as const, TypeScript infers the exact values and prevents any modification 
 * to the object after it is defined.
 */
export const softDeleteColumns = {
  isActive: boolean('is_active').notNull().default(true),
} as const;

/**
 * Foreign key column for referencing other tables
 * @param tableName - Name of the referenced table
 * @param columnName - Name of the foreign key column
 * @param nullable - Whether the foreign key can be null
 */
export const foreignKey = (tableName: string, columnName: string, nullable = false) => {
  const baseColumn = varchar(columnName, { length: 36 });
  return nullable ? baseColumn : baseColumn.notNull();
};

/**
 * Common constraints and indexes
 */
export const commonConstraints = {
  /**
   * Check constraint for version numbers (must be >= 1)
   */
  versionCheck: sql`version >= 1`,
  
  /**
   * Check constraint for positive sizes
   */
  positiveSize: sql`size > 0`,
  
  /**
   * Check constraint for valid email format
   */
  validEmail: sql`email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`,
  
  /**
   * Check constraint for valid UUID format
   */
  validUuid: sql`id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`,
} as const;

/**
 * Common indexes for performance
 * commonIndexes section is defining it as a shared index that you can use across tables.
 */
export const commonIndexes = {
  /**
   * Index on created_at for time-based queries
   */
  createdAt: 'idx_created_at',
  
  /**
   * Index on updated_at for time-based queries
   */
  updatedAt: 'idx_updated_at',
  
  /**
   * Index on is_active for soft delete queries
   */
  isActive: 'idx_is_active',
} as const;
