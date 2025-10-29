import { Schema as S } from "effect"
import { AccessPolicyGuards } from "./guards"
import { AccessPolicyId, UserId, DocumentId } from "@/app/domain/refined/uuid"
import { BaseEntitySchema } from "@/app/domain/shared/schema.utils"
import { Optional } from "@/app/domain/shared/validation.utils"

/** 
 * AccessPolicy Schema
 * 
 * Domain model for an AccessPolicy entity.
 * Uses S.extend to combine BaseEntitySchema with domain-specific fields.
 * 
 * Controls access permissions: who (subject) can perform what (actions) on which resource.
 */
/**
 * Effect Schema Composition Pattern
 * 
 * Uses S.extend() and S.pipe() to compose schemas for better reusability.
 * Breaks down complex schemas into logical groups.
 */
const BaseAccessPolicyFields = S.Struct({
  name: AccessPolicyGuards.ValidName,
  description: AccessPolicyGuards.ValidDescription,
})

const SubjectFields = S.Struct({
  subjectType: S.Literal("user", "role"),
  subjectId: UserId,
})

const ResourceFields = S.Struct({
  resourceType: S.Literal("document", "user"),
  resourceId: Optional(DocumentId),
})

const PermissionFields = S.Struct({
  actions: AccessPolicyGuards.ValidActions,
  isActive: S.Boolean,
  priority: AccessPolicyGuards.ValidPriority,
})

/**
 * Composed AccessPolicy fields using Effect Schema composition
 * Combines base, subject, resource, and permission fields
 */
export const AccessPolicyFields = BaseAccessPolicyFields.pipe(
  S.extend(SubjectFields),
  S.extend(ResourceFields),
  S.extend(PermissionFields)
)

export const AccessPolicySchema = S.extend(
  BaseEntitySchema(AccessPolicyId),
  AccessPolicyFields
)

/**
 * Runtime type with proper Option<T> handling for optional fields
 */
export type AccessPolicyType = S.Schema.Type<typeof AccessPolicySchema>

/**
 * Serialized type for external APIs (DTOs, JSON responses)
 * Optional fields are represented as T | undefined in serialized form
 */
export type SerializedAccessPolicy = S.Schema.Encoded<typeof AccessPolicySchema>

/**
 * Smart constructor with validation
 * 
 * Validates and decodes unknown input into AccessPolicyType.
 * Returns Effect with validated data or ParseError.
 */
//export const makeAccessPolicy = (input: unknown) => S.decodeUnknown(AccessPolicySchema)(input)

