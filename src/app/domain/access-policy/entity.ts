import { Effect, Option, Schema as S } from "effect"
import { AccessPolicy, AccessPolicySchema } from "./schema"
import { AccessPolicyGuards } from "./guards"
import { BaseEntity, IEntity } from "../shared/base.entity"
import { BusinessRuleViolationError, ValidationError } from "../shared/errors"
import { AccessPolicyValidationError } from "./errors"
import { AccessPolicyId, UserId, DocumentId } from "../shared/uuid"

/**
 * IAccessPolicy — Aggregate contract
 */
export interface IAccessPolicy extends IEntity<AccessPolicyId> {
  readonly name: string
  readonly description: string
  readonly subjectType: "user" | "role"
  readonly subjectId: UserId
  readonly resourceType: "document" | "user"
  readonly resourceId: Option.Option<DocumentId>
  readonly actions: ("read" | "write" | "delete" | "manage")[]
  readonly active: boolean
  readonly priority: number
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>
}

/**
 * AccessPolicyEntity — Aggregate root for policy management
 */
export class AccessPolicyEntity extends BaseEntity<AccessPolicyId> implements IAccessPolicy {
  readonly id: AccessPolicyId
  readonly name: string
  readonly description: string
  readonly subjectType: "user" | "role"
  readonly subjectId: UserId
  readonly resourceType: "document" | "user"
  readonly resourceId: Option.Option<DocumentId>
  readonly actions: ("read" | "write" | "delete" | "manage")[]
  readonly active: boolean
  readonly priority: number
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>

  private constructor(data: S.Schema.Type<typeof AccessPolicySchema>) {
    super()
    this.id = data.id
    this.name = data.name
    this.description = data.description
    this.subjectType = data.subjectType
    this.subjectId = data.subjectId
    this.resourceType = data.resourceType
    this.resourceId = Option.fromNullable(data.resourceId)
    this.actions = [...data.actions]
    this.active = data.isActive
    this.priority = data.priority
    this.createdAt = data.createdAt
    this.updatedAt = Option.fromNullable(data.updatedAt)
  }

  /** Factory for validated entity creation */
  static create(input: unknown): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return S.decodeUnknown(AccessPolicySchema)(input).pipe(
      Effect.map((data) => new AccessPolicyEntity(data)),
      Effect.mapError((err) => AccessPolicyValidationError.fromParseError(input, err))
    )
  }

  // ------------------------------------------------------------
  // Derived Properties
  // ------------------------------------------------------------

  get resourceIdOrNull(): DocumentId | null {
    return Option.getOrNull(this.resourceId)
  }

  get hasResourceId(): boolean {
    return Option.isSome(this.resourceId)
  }

  get isModified(): boolean {
    return Option.isSome(this.updatedAt)
  }

  get hasAllPermissions(): boolean {
    return this.actions.length === 4
  }

  get isHighPriority(): boolean {
    return this.priority <= 10
  }

  get isLowPriority(): boolean {
    return this.priority >= 100
  }

  // ------------------------------------------------------------
  // Domain Logic
  // ------------------------------------------------------------

  appliesToSubject(subjectType: "user" | "role", subjectId: UserId): boolean {
    return this.subjectType === subjectType && this.subjectId === subjectId
  }

  appliesToResource(resourceType: "document" | "user", resourceId?: DocumentId): boolean {
    if (this.resourceType !== resourceType) return false
    if (this.hasResourceId && resourceId) {
      return Option.getOrNull(this.resourceId) === resourceId
    }
    return !this.hasResourceId // applies globally
  }

  grantsAction(action: "read" | "write" | "delete" | "manage"): boolean {
    return this.actions.includes(action)
  }

  hasHigherPriorityThan(other: AccessPolicyEntity): boolean {
    return this.priority < other.priority // lower number = higher priority
  }

  /** Updates allowed actions */
  updateActions(
    newActions: ("read" | "write" | "delete" | "manage")[]
  ): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    if (!AccessPolicyGuards.isValidActions(newActions)) {
      return Effect.fail(new AccessPolicyValidationError("actions", newActions, "Invalid policy actions"))
    }

    const updated = {
      ...this.toSerialized(),
      actions: newActions,
      updatedAt: new Date()
    }

    return AccessPolicyEntity.create(updated)
  }

  /** Updates policy priority */
  updatePriority(newPriority: number): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    if (!AccessPolicyGuards.isValidPriority(newPriority)) {
      return Effect.fail(new AccessPolicyValidationError("priority", newPriority, "Priority must be between 1 and 1000"))
    }

    const updated = {
      ...this.toSerialized(),
      priority: newPriority,
      updatedAt: new Date()
    }

    return AccessPolicyEntity.create(updated)
  }

  /** Activates the policy */
  activate(): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    if (this.active) return Effect.succeed(this)
    const updated = { ...this.toSerialized(), isActive: true, updatedAt: new Date() }
    return AccessPolicyEntity.create(updated)
  }

  /** Deactivates the policy */
  deactivate(): Effect.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    if (!this.active) return Effect.succeed(this)
    const updated = { ...this.toSerialized(), isActive: false, updatedAt: new Date() }
    return AccessPolicyEntity.create(updated)
  }

  // ------------------------------------------------------------
  // Serialization Helpers
  // ------------------------------------------------------------

  private toSerialized(): S.Schema.Type<typeof AccessPolicySchema> {
    return {
      ...this.serialized,
      name: this.name,
      description: this.description,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      resourceType: this.resourceType,
      resourceId: Option.getOrUndefined(this.resourceId),
      actions: this.actions,
      isActive: this.active,
      priority: this.priority
    }
  }

  /** Required by BaseEntity */
  isActive(): boolean {
    return this.active
  }
}
