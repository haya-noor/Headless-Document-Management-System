/**
 * UserProfile Value Object
 * 
 * Encapsulates personal information with its own schema and validation.
 * Reuses shared ValidationError and shared EmailAddress schema.
 */

import { Schema as S, Effect } from "effect"
import { ValidationError } from "@/app/domain/shared/base.errors"
import { EmailAddress } from "@/app/domain/refined/email"

export interface UserProfileData {
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly dateOfBirth?: Date
  readonly phoneNumber?: string
  readonly profileImage?: string
}

/** Schema-based validation */
export const UserProfileSchema = S.Struct({
  firstName: S.String.pipe(S.minLength(1), S.maxLength(100)),
  lastName: S.String.pipe(S.minLength(1), S.maxLength(100)),
  email: EmailAddress,
  dateOfBirth: S.optional(S.Date),
  phoneNumber: S.optional(S.String.pipe(S.maxLength(20))),
  profileImage: S.optional(S.String.pipe(S.maxLength(500)))
})
export type UserProfileSchema = S.Schema.Type<typeof UserProfileSchema>

export class UserProfile {
  private constructor(private readonly data: UserProfileSchema) {}

  static create(input: unknown): Effect.Effect<UserProfile, ValidationError> {
    return Effect.try({
      try: () => new UserProfile(S.decodeUnknownSync(UserProfileSchema)(input)),
      catch: (error: unknown) =>
        ValidationError.forField(
          "UserProfile",
          input,
          (error as Error).message || "User profile validation failed"
        )
    })
  }

  get firstName() { return this.data.firstName }
  get lastName() { return this.data.lastName }
  get email() { return this.data.email }
  get dateOfBirth() { return this.data.dateOfBirth }
  get phoneNumber() { return this.data.phoneNumber }
  get profileImage() { return this.data.profileImage }

  get fullName() { return `${this.data.firstName} ${this.data.lastName}` }

  get completeness(): number {
    const total = 6  // total number of fields like firstName, lastName, email, dateOfBirth, phoneNumber, profileImage
    const complete = Object.values(this.data).filter((v) => !!v).length
    return Math.round((complete / total) * 100)
  }
}
