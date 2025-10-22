import { Effect, Option, Schema as S, ParseResult } from "effect"
import { UserValidationError } from "./errors"
import { UserId } from "@/app/domain/refined/uuid"
import { BaseEntity } from "@/app/domain/shared/base.entity"
import { UserSchema } from "./schema"
import { serializeWith } from "@/app/domain/shared/schema.utils" 

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type UserType = S.Schema.Type<typeof UserSchema>
export type SerializedUser = S.Schema.Encoded<typeof UserSchema>


export class UserEntity extends BaseEntity<UserId, UserValidationError> {
  readonly id!: UserId
  readonly createdAt!: Date
  readonly updatedAt!: Date
  readonly email!: string
  readonly firstName!: string
  readonly lastName!: string
  readonly role!: "admin" | "user"
  readonly isActive!: boolean
  readonly dateOfBirth!: Option.Option<Date>
  readonly phoneNumber!: Option.Option<string>
  readonly profileImage!: Option.Option<string>
  readonly password!: string


  static create(input: SerializedUser): Effect.Effect<UserEntity, UserValidationError, never> {
    return S.decodeUnknown(UserSchema)(input).pipe(
      Effect.map((data) => new UserEntity(data)),
      Effect.mapError(() => UserValidationError.forField("user", input, "Validation failed"))
    ) as Effect.Effect<UserEntity, UserValidationError, never>
  }

  /**
   * Create entity from persistence layer (database row)
   * 
   * Accepts raw Option format { tag: "Some" | "None", value?: T }
   * and ISO string dates from database
   */

  private constructor(data: UserType) {
    super()
    this.id = data.id as UserId
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
    this.email = data.email
    this.password = data.password
    this.firstName = data.firstName
    this.lastName = data.lastName
    this.role = data.role
    this.isActive = data.isActive
    this.dateOfBirth = Option.fromNullable(data.dateOfBirth)
    this.phoneNumber = Option.fromNullable(data.phoneNumber)
    this.profileImage = Option.fromNullable(data.profileImage)
  }

  /**
   * Serialize entity using Effect Schema encoding
   * 
   * Automatically handles:
   * - Option types → T | undefined
   * - Branded types → primitives (UserId → string)
   * - Date objects → ISO strings (S.Date in schema)
   * 
   * @returns Effect with serialized user data
   */
  serialized(): Effect.Effect<SerializedUser, ParseResult.ParseError> {
    return serializeWith(UserSchema, this as unknown as UserType)
  }
}