import { Schema as S } from "effect";
import { UserGuards } from "@/app/domain/user/guards";
import { UserId } from "@/app/domain/refined/uuid";
import { EmailAddress } from "@/app/domain/refined/email";
import { HashedPassword } from "@/app/domain/refined/password";
import { BaseEntitySchema } from "@/app/domain/shared/schema.utils";
import { Optional } from "@/app/domain/shared/validation.utils";

/** 
 * User Schema
 * 
 * Domain model for a User entity.
 * Uses S.extend to combine BaseEntitySchema with domain-specific fields.
 * 
 * Note: Uses Date objects (not ISO string dates) for createdAt/updatedAt
 * because repository works with database Date objects.
 */
export const UserSchema = S.extend(
  BaseEntitySchema(UserId),
  S.Struct({
    email: EmailAddress,
    firstName: S.String.pipe(UserGuards.ValidName),
    lastName: S.String.pipe(UserGuards.ValidName),
    password: HashedPassword,
    role: S.Literal('admin', 'user'),
    isActive: S.Boolean,
    dateOfBirth: Optional(S.DateFromSelf),
    phoneNumber: Optional(S.String.pipe(UserGuards.ValidPhoneNumber)),
    profileImage: Optional(S.String.pipe(UserGuards.ValidProfileImage))
  })
);

/**
 * Runtime type with proper Option<T> handling for optional fields
 */
export type UserType = S.Schema.Type<typeof UserSchema>;

/**
 * Serialized type for external APIs (DTOs, JSON responses)
 * Optional fields are represented as T | undefined in serialized form
 * serializedUser is directly derived from UserSchema 
 */
export type SerializedUser = S.Schema.Encoded<typeof UserSchema>;

