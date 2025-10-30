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

  // ========== Domain Methods ==========

  /**
   * Check if this policy grants a specific action
   */
  grantsAction(action: "read" | "write" | "delete" | "manage"): boolean {
    return this.actions.includes(action)
  }

  /**
   * Check if this policy has higher priority than another
   * Lower numbers = higher priority
   */
  hasHigherPriorityThan(other: AccessPolicyEntity): boolean {
    return this.priority < other.priority
  }

  /**
   * Check if this policy applies to a specific subject
   */
  appliesToSubject(subjectType: "user" | "role", subjectId: string): boolean {
    return this.subjectType === subjectType && this.subjectId === subjectId
  }

  /**
   * Check if this policy applies to a specific resource
   */
  appliesToResource(resourceType: "document" | "user", resourceId: string): boolean {
    return this.resourceType === resourceType && Option.getOrNull(this.resourceId) === resourceId
  }

  /**
   * Update the priority of this policy
   * Returns a new entity with updated priority
   */
  updatePriority(newPriority: number): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return AccessPolicyEntity.create({
      id: this.id,
      name: this.name,
      description: this.description,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      resourceType: this.resourceType,
      resourceId: Option.getOrNull(this.resourceId),
      actions: this.actions,
      isActive: this.isActive,
      priority: newPriority,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: new Date().toISOString()
    })
  }

  /**
   * Update the actions of this policy
   * Returns a new entity with updated actions
   */
  updateActions(newActions: ("read" | "write" | "delete" | "manage")[]): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return AccessPolicyEntity.create({
      id: this.id,
      name: this.name,
      description: this.description,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      resourceType: this.resourceType,
      resourceId: Option.getOrNull(this.resourceId),
      actions: newActions,
      isActive: this.isActive,
      priority: this.priority,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: new Date().toISOString()
    })
  }

  /**
   * Activate this policy
   * Returns a new entity with isActive = true
   */
  activate(): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return AccessPolicyEntity.create({
      id: this.id,
      name: this.name,
      description: this.description,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      resourceType: this.resourceType,
      resourceId: Option.getOrNull(this.resourceId),
      actions: this.actions,
      isActive: true,
      priority: this.priority,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: new Date().toISOString()
    })
  }

  /**
   * Deactivate this policy
   * Returns a new entity with isActive = false
   */
  deactivate(): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return AccessPolicyEntity.create({
      id: this.id,
      name: this.name,
      description: this.description,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      resourceType: this.resourceType,
      resourceId: Option.getOrNull(this.resourceId),
      actions: this.actions,
      isActive: false,
      priority: this.priority,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: new Date().toISOString()
    })
  }

  // ========== Computed Properties ==========

  /**
   * Check if this policy is active
   */
  get active(): boolean {
    return this.isActive
  }

  /**
   * Check if this policy has all permissions
   */
  get hasAllPermissions(): boolean {
    return this.actions.length === 4 && 
           this.actions.includes("read") && 
           this.actions.includes("write") && 
           this.actions.includes("delete") && 
           this.actions.includes("manage")
  }

  /**
   * Check if this policy is high priority (priority <= 50)
   */
  get isHighPriority(): boolean {
    return this.priority <= 50
  }

  /**
   * Check if this policy has been modified (updatedAt > createdAt)
   */
  get isModified(): boolean {
    return this.updatedAt > this.createdAt
  }
}
