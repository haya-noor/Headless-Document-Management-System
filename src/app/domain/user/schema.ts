import { Option, Schema as S } from "effect";
import { UserGuards } from "@/app/domain/user/guards";
import { DateTime } from "@/app/domain/shared/date-time";
import { UserId } from "@/app/domain/shared/uuid";
import { EmailAddress } from "@/app/domain/shared/email";
import { HashedPassword } from "@/app/domain/shared/password";

/** Domain model for a User 
 * 
 * the User schema is a struct that defines the user object
 * it is used to validate the user object, create the user object, update the user object
 * delete the user object, get the user object, list the user objects
 * 
 * Note: Uses DateTime (Date objects) not DateTimeIso (strings) because repository works with DB Dates
*/
export const User = S.Struct({
  id: UserId,
  email: EmailAddress,
  firstName: S.String.pipe(UserGuards.ValidName),
  lastName: S.String.pipe(UserGuards.ValidName),
  password: HashedPassword,
  role: S.Literal('admin', 'user'),
  isActive: S.Boolean,
  dateOfBirth: S.optional(S.Date),
  phoneNumber: S.optional(S.String.pipe(UserGuards.ValidPhoneNumber)),
  profileImage: S.optional(S.String.pipe(UserGuards.ValidProfileImage)),
  createdAt: DateTime,
  updatedAt: S.optional(DateTime)
})
export type User = S.Schema.Type<typeof User>

/** DB row representation 
 * Represents how user data is actually stored in the database table. 
 * 
 * When fetching data from DB, first decode into userRow, then decode/transform into 
 * user object via UserCodec
 * 
 * UserRow is a struct that defines the user object from the database (persistence Model)
 * mirrors the DB table structure - this is the data that is stored in the database
 * plain, primitive types, suitable for direct database mapping, no validation, no branding
 * 
*/
/** 
 * Database row schema - uses DateFromSelf to keep Date objects (no serialization)
 */
export const UserRow = S.Struct({
  id: S.String,
  email: S.String,
  firstName: S.String,
  lastName: S.String,
  password: S.String,
  role: S.String,
  isActive: S.Boolean,
  dateOfBirth: S.optional(S.DateFromSelf),  // Type=Date, Encoded=Date
  phoneNumber: S.optional(S.String),
  profileImage: S.optional(S.String),
  createdAt: S.DateFromSelf,  // Type=Date, Encoded=Date
  updatedAt: S.optional(S.DateFromSelf)  // Type=Date, Encoded=Date
})
export type UserRow = S.Schema.Type<typeof UserRow>

/** Codec for DB <-> Domain transformations with strong typing */
export const UserCodec = S.transform(UserRow, User, {
  decode: (r) => ({
    id: S.decodeUnknownSync(UserId)(r.id),
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    password: S.decodeUnknownSync(HashedPassword)(r.password),
    role: r.role as 'admin' | 'user',
    isActive: r.isActive,
    dateOfBirth: Option.fromNullable(r.dateOfBirth),
    phoneNumber: Option.fromNullable(r.phoneNumber),
    profileImage: Option.fromNullable(r.profileImage),
    createdAt: r.createdAt,
    updatedAt: Option.fromNullable(r.updatedAt)
  }),
  encode: (d) => ({
    id: d.id,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    password: d.password,
    role: d.role,
    isActive: d.isActive,
    dateOfBirth: Option.getOrNull(d.dateOfBirth),
    phoneNumber: Option.getOrNull(d.phoneNumber),
    profileImage: Option.getOrNull(d.profileImage),
    createdAt: d.createdAt,
    updatedAt: Option.getOrNull(d.updatedAt)
  }),
  strict: false
})

/** Smart constructors */
export const makeUser = (input: unknown) => S.decodeUnknown(User)(input)
export const makeUserRow = (input: unknown) => S.decodeUnknown(UserRow)(input)