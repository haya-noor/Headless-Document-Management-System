import { pgTable, varchar, text, timestamp, unique, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { sharedColumns, softDeleteColumns, commonConstraints } from './shared-columns'

/**
 * Users table — authentication and profile information
 */
export const users = pgTable('users', {
  ...sharedColumns,
  email: varchar('email', { length: 255 }).notNull(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  dateOfBirth: timestamp('date_of_birth'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  profileImage: text('profile_image'),
  ...softDeleteColumns,
}, (table) => ({
  emailUnique: unique().on(table.email),
  validEmail: check('valid_email', commonConstraints.validEmail),
  validUuid: check('valid_uuid', commonConstraints.validUuid),
  validRole: check('valid_role', sql`role IN ('admin', 'user')`),
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role),
  activeIdx: index('idx_users_active').on(table.isActive),
  createdAtIdx: index('idx_users_created_at').on(table.createdAt),
}))
