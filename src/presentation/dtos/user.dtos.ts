/**
 * User Data Transfer Objects using Effect Schema
 * DTOs for user-related API operations
 */

import { Schema } from '@effect/schema';

/**
 * User role enum
 */
export const UserRoleSchema = Schema.Literal('admin', 'user');
export type UserRole = Schema.Schema.Type<typeof UserRoleSchema>;

/**
 * User registration DTO
 */
export const UserRegistrationDTOSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  role: UserRoleSchema
});

export type UserRegistrationDTO = Schema.Schema.Type<typeof UserRegistrationDTOSchema>;

/**
 * User login DTO
 */
export const UserLoginDTOSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String
});

export type UserLoginDTO = Schema.Schema.Type<typeof UserLoginDTOSchema>;

/**
 * Password change DTO
 */
export const PasswordChangeDTOSchema = Schema.Struct({
  currentPassword: Schema.String,
  newPassword: Schema.String,
  confirmPassword: Schema.String
});

export type PasswordChangeDTO = Schema.Schema.Type<typeof PasswordChangeDTOSchema>;

/**
 * Profile update DTO
 */
export const ProfileUpdateDTOSchema = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  email: Schema.String
});

export type ProfileUpdateDTO = Schema.Schema.Type<typeof ProfileUpdateDTOSchema>;