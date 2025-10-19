import { Effect, Option, Schema as S, ParseResult } from "effect"
import { UserValidationError } from "./errors"
import { UserId } from "../shared/uuid"

import { BaseEntity, type IEntity } from "../shared/base.entity"
import { EmailAddress } from "../shared/email"
import { User } from "./schema" 


// -----------------------------------------------------------------------------
// Reusable Schemas
// -----------------------------------------------------------------------------

// Common timestamp fields shared by all entities
export const BaseEntitySchema = S.Struct({
  id: S.String, 
  createdAt: S.Date,
  updatedAt: S.optional(S.Date)
})

// Common user profile fields
export const UserProfileFields = S.Struct({
  firstName: S.String,
  lastName: S.String,
  dateOfBirth: S.optional(S.Date),
  phoneNumber: S.optional(S.String),
  profileImage: S.optional(S.String)
})

// Core user fields (specific to User)
export const UserCoreFields = S.Struct({
  email: EmailAddress, 
  role: S.Literal("admin", "user"),
  isActive: S.Boolean
})

// Full user schema — combines reusable parts
export const UserSchema = S.extend(S.extend(UserCoreFields, UserProfileFields), BaseEntitySchema)

// -----------------------------------------------------------------------------
// Derived Types
// -----------------------------------------------------------------------------

export type UserType = S.Schema.Type<typeof User>
export type SerializedUser = S.Schema.Encoded<typeof User>

// -----------------------------------------------------------------------------
// Domain Contract
// -----------------------------------------------------------------------------

export interface IUser extends IEntity<UserId> {
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly role: "admin" | "user"
  readonly dateOfBirth: Option.Option<Date>
  readonly phoneNumber: Option.Option<string>
  readonly profileImage: Option.Option<string>
}

// -----------------------------------------------------------------------------
// User Entity
// -----------------------------------------------------------------------------

export class UserEntity extends BaseEntity<UserId> implements IUser {
  readonly id: UserId
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly role: "admin" | "user"
  readonly dateOfBirth: Option.Option<Date>
  readonly phoneNumber: Option.Option<string>
  readonly profileImage: Option.Option<string>

  private constructor(data: UserType) {
    super()
    this.id = data.id as UserId
    this.createdAt = data.createdAt
    this.updatedAt = Option.fromNullable(data.updatedAt)
    this.email = data.email
    this.firstName = data.firstName
    this.lastName = data.lastName
    this.role = data.role
    this.dateOfBirth = Option.fromNullable(data.dateOfBirth)
    this.phoneNumber = Option.fromNullable(data.phoneNumber)
    this.profileImage = Option.fromNullable(data.profileImage)
  }

  // ---------------------------------------------------------------------------
  // Factory / Validation
  // ---------------------------------------------------------------------------

  static create(input: SerializedUser): Effect.Effect<UserEntity, UserValidationError> {
    return S.decodeUnknown(User)(input).pipe(
      Effect.map((data) => new UserEntity(data)),
      Effect.mapError((error) => UserEntity.toValidationError(error, input))
    )
  }

  private static toValidationError(error: unknown, input: SerializedUser): UserValidationError {
    if (error instanceof UserValidationError) return error
    
    // Handle ParseResult.ParseError
    if (error && typeof error === 'object' && 'message' in error) {
      const parseError = (error as ParseResult.ParseError).message ?? "Validation failed"
      return new UserValidationError("user", input, parseError)
    }
    
    // Handle other error types
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new UserValidationError("user", input, errorMessage)
  }

  // ---------------------------------------------------------------------------
  // Domain Behavior
  // ---------------------------------------------------------------------------

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  get hasDateOfBirth(): boolean {
    return Option.isSome(this.dateOfBirth)
  }

  get hasPhoneNumber(): boolean {
    return Option.isSome(this.phoneNumber)
  }

  get hasProfileImage(): boolean {
    return Option.isSome(this.profileImage)
  }

  get isModified(): boolean {
    return Option.isSome(this.updatedAt)
  }

  get dateOfBirthOrNull(): Date | null {
    return Option.getOrNull(this.dateOfBirth)
  }

  get phoneNumberOrNull(): string | null {
    return Option.getOrNull(this.phoneNumber)
  }

  get profileImageOrNull(): string | null {
    return Option.getOrNull(this.profileImage)
  }

  isActiveUser(): boolean {
    return this.isActive()
  }

  isAdmin(): boolean {
    return this.role === "admin"
  }

  hasCompleteProfile(): boolean {
    return this.hasDateOfBirth && this.hasPhoneNumber && this.hasProfileImage
  }

  hasMinimalProfile(): boolean {
    return Boolean(this.firstName && this.lastName && this.email)
  }

  getProfileCompleteness(): number {
    const totalFields = 6
    const completedFields =
      Number(!!this.firstName) +
      Number(!!this.lastName) +
      Number(!!this.email) +
      Number(this.hasDateOfBirth) +
      Number(this.hasPhoneNumber) +
      Number(this.hasProfileImage)
    return Math.round((completedFields / totalFields) * 100)
  }

  // ---------------------------------------------------------------------------
  // Update Operations
  // ---------------------------------------------------------------------------

  updateEmail(newEmail: string): Effect.Effect<UserEntity, UserValidationError> {
    return UserEntity.create({
      ...this.toSerialized(),
      email: newEmail,
      updatedAt: new Date().toISOString()
    })
  }

  updateProfile(
    firstName?: string,
    lastName?: string,
    dateOfBirth?: Date | null,
    phoneNumber?: string | null,
    profileImage?: string | null
  ): Effect.Effect<UserEntity, UserValidationError> {
    return UserEntity.create({
      ...this.toSerialized(),
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      dateOfBirth: (dateOfBirth ?? Option.getOrNull(this.dateOfBirth))?.toISOString() ?? undefined,
      phoneNumber: phoneNumber ?? Option.getOrNull(this.phoneNumber) ?? undefined,
      profileImage: profileImage ?? Option.getOrNull(this.profileImage) ?? undefined,
      updatedAt: new Date().toISOString()
    })
  }

  activate(): Effect.Effect<UserEntity, UserValidationError> {
    return UserEntity.create({
      ...this.toSerialized(),
      isActive: true,
      updatedAt: new Date().toISOString()
    })
  }

  deactivate(): Effect.Effect<UserEntity, UserValidationError> {
    return UserEntity.create({
      ...this.toSerialized(),
      isActive: false,
      updatedAt: new Date().toISOString()
    })
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toSerialized(): SerializedUser {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive(),
      dateOfBirth: Option.getOrNull(this.dateOfBirth)?.toISOString() ?? undefined,
      phoneNumber: Option.getOrNull(this.phoneNumber) ?? undefined,
      profileImage: Option.getOrNull(this.profileImage) ?? undefined,
      createdAt: this.createdAt.toISOString(),
      updatedAt: Option.getOrNull(this.updatedAt)?.toISOString() ?? undefined
    }
  }

  // ---------------------------------------------------------------------------
  // DDD Base
  // ---------------------------------------------------------------------------

  isActive(): boolean {
    return this.isActiveUser()
  }
}
