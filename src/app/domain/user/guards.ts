
/**
 * UserGuards
 * 
 * Declarative reusable filters and validators.
 * Integrates with Effect Schema filtering API.
 * 
 * id guarded by shared 
 * email validated by shared EmailAddress
 * data fields validated by shared via DateTimeFromAny
 * password validated by shared via Password + hashedPassword
 * role/status flags validated at schemal level 
 * 
 */

import { Schema as S } from "effect"

export class UserGuards {
  /** Name: required and within limits */
  static readonly ValidName = S.filter(
    (name: string) => typeof name === "string" && name.trim().length > 0 && name.trim().length <= 100,
    { message: () => "Name is required and must be <= 100 characters" }
  )

  /** Phone: optional string (<=20 chars) */
  static readonly ValidPhoneNumber = S.filter(
    (phone: string) => typeof phone === "string" && phone.length <= 20,
    { message: () => "Phone number must be <= 20 characters" }
  )

  /** Profile Image: optional string (<=500 chars) */
  static readonly ValidProfileImage = S.filter(
    (image: string) => typeof image === "string" && image.length <= 500,
    { message: () => "Profile image URL cannot exceed 500 characters" }
  )
}
