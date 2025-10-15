import { Option, Schema as S } from "effect";
import { UserGuards } from "@/app/domain/user/guards";
import { DateTimeFromAny } from "@/app/domain/shared/date-time";
import { UserId } from "@/app/domain/shared/uuid";

/** Domain model for a User 
 * 
 * the User schema is a struct that defines the user object
 * it is used to validate the user object,create the user object,update the user object
 * delete the user object, get the user object, list the user objects
*/
export const User = S.Struct({
  id: UserId,
  email: S.String.pipe(UserGuards.ValidEmail),
  firstName: S.String.pipe(UserGuards.ValidName),
  lastName: S.String.pipe(UserGuards.ValidName),
  role: S.Literal('admin', 'user'),
  isActive: S.Boolean,
  dateOfBirth: S.optional(S.Date),
  phoneNumber: S.optional(S.String.pipe(UserGuards.ValidPhoneNumber)),
  profileImage: S.optional(S.String.pipe(UserGuards.ValidProfileImage)),
  createdAt: DateTimeFromAny,
  updatedAt: DateTimeFromAny
})
export type User = S.Schema.Type<typeof User>

/** DB row representation 
 * Represents how user data is actually stored in the database table. 
 * 
 * 
 * when fetching data from DB, first decode into userRow, then decode(transfrom) into 
 * user object
 * 
 * 
 * UserRow is a struct that defines the user object from the database (persistence Model)
 * mirrors the DB table structure - this is the data that is stored in the database
 * plain, primitive types, suitable for direct database mapping, no validation, no branding
 * 
*/
export const UserRow = S.Struct({
  id: S.String,
  email: S.String,
  firstName: S.String,
  lastName: S.String,
  role: S.String,
  isActive: S.Boolean,
  dateOfBirth: S.optional(S.Date),
  phoneNumber: S.optional(S.String),
  profileImage: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date
})
export type UserRow = S.Schema.Type<typeof UserRow>

/** Codec for DB <-> Domain transformations with strong typing */
export const UserCodec = S.transform(UserRow, User, {
  decode: (r) => ({
    id: S.decodeUnknownSync(UserId)(r.id),
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    role: r.role as 'admin' | 'user',
    isActive: r.isActive,
    dateOfBirth: Option.fromNullable(r.dateOfBirth),
    phoneNumber: Option.fromNullable(r.phoneNumber),
    profileImage: Option.fromNullable(r.profileImage),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }),
  encode: (d) => ({
    id: d.id,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    role: d.role,
    isActive: d.isActive,
    dateOfBirth: Option.getOrNull(d.dateOfBirth as any),
    phoneNumber: Option.getOrNull(d.phoneNumber as any),
    profileImage: Option.getOrNull(d.profileImage as any),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  }),
  strict: false
})

/** Smart constructors */
export const makeUser = (input: unknown) => S.decodeUnknown(User)(input)
export const makeUserRow = (input: unknown) => S.decodeUnknown(UserRow)(input)





