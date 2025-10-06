/**
 * Authentication validation schemas using Effect Schema
 * Basic schemas without complex optional patterns
 */

import { Schema } from '@effect/schema';

/**
 * User role enum
 */
export const UserRoleSchema = Schema.Literal('admin', 'user');
export type UserRole = Schema.Schema.Type<typeof UserRoleSchema>;

/**
 * User registration schema
 */
export const RegisterSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  role: UserRoleSchema
});

export type RegisterInput = Schema.Schema.Type<typeof RegisterSchema>;

/**
 * User login schema
 */
export const LoginSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String
});

export type LoginInput = Schema.Schema.Type<typeof LoginSchema>;

/**
 * Password change schema
 */
export const ChangePasswordSchema = Schema.Struct({
  currentPassword: Schema.String,
  newPassword: Schema.String,
  confirmPassword: Schema.String
});

export type ChangePasswordInput = Schema.Schema.Type<typeof ChangePasswordSchema>;

/**
 * Profile update schema
 */
export const UpdateProfileSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  email: Schema.String
});

export type UpdateProfileInput = Schema.Schema.Type<typeof UpdateProfileSchema>;