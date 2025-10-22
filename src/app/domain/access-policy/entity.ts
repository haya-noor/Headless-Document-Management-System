import { Effect, Option, Schema as S, ParseResult } from "effect"
import { AccessPolicySchema } from "./schema"
import { AccessPolicyGuards } from "./guards"
import { BaseEntity } from "@/app/domain/shared/base.entity"
import { BusinessRuleViolationError, ValidationError } from "@/app/domain/shared/base.errors"
import { AccessPolicyValidationError } from "./errors"
import { AccessPolicyId, UserId, DocumentId } from "@/app/domain/refined/uuid"
import { serializeWith } from "@/app/domain/shared/schema.utils"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AccessPolicyType = S.Schema.Type<typeof AccessPolicySchema>
export type SerializedAccessPolicy = S.Schema.Encoded<typeof AccessPolicySchema>

/**
 * AccessPolicyEntity — Aggregate root for policy management
 * 
 * Manages access control policies for documents and users.
 * Controls who (subject) can do what (actions) on which resource.
 */
export class AccessPolicyEntity extends BaseEntity<AccessPolicyId, AccessPolicyValidationError> {
  readonly id!: AccessPolicyId
  readonly createdAt!: Date
  readonly updatedAt!: Date
  readonly name!: string
  readonly description!: string
  readonly subjectType!: "user" | "role"
  readonly subjectId!: UserId
  readonly resourceType!: "document" | "user"
  readonly resourceId!: Option.Option<DocumentId>
  readonly actions!: ("read" | "write" | "delete" | "manage")[]
  readonly isActive!: boolean
  readonly priority!: number

  private constructor(data: AccessPolicyType) {
    super()
    this.id = data.id as AccessPolicyId
    this.name = data.name
    this.description = data.description
    this.subjectType = data.subjectType
    this.subjectId = data.subjectId as UserId
    this.resourceType = data.resourceType
    this.resourceId = Option.fromNullable(data.resourceId)
    this.actions = [...data.actions]
    this.isActive = data.isActive
    this.priority = data.priority
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /** Factory for validated entity creation */
  static create(input: unknown): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return S.decodeUnknown(AccessPolicySchema)(input).pipe(
      Effect.map((data) => new AccessPolicyEntity(data)),
      Effect.mapError((error) => 
        AccessPolicyValidationError.forField(
          "AccessPolicy",
          input,
          error && typeof error === 'object' && 'message' in error
            ? (error as ParseResult.ParseError).message ?? "Validation failed"
            : String(error)
        )
      )
    ) as Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never>
  }

  /**
   * Serialize entity using Effect Schema encoding
   * 
   * Automatically handles:
   * - Option types → T | undefined
   * - Branded types → primitives
   * - Date objects → kept as Date for database operations
   * 
   * @returns Effect with serialized access policy data
   */
  serialized(): Effect.Effect<SerializedAccessPolicy, ParseResult.ParseError> {
    return serializeWith(AccessPolicySchema, this as unknown as AccessPolicyType)
  }
}
