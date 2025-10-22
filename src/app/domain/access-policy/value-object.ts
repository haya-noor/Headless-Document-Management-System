import { Schema as S, Effect } from "effect"
import { ValidationError } from "@/app/domain/shared/base.errors"

/**
 * Value object representing an atomic access policy rule
 */
export class PolicyRule {
  private constructor(
    private readonly subjectTypeValue: "user" | "role",
    private readonly subjectIdValue: string,
    private readonly resourceTypeValue: "document" | "user",
    private readonly resourceIdValue?: string,
    private readonly actionsValue: ("read" | "write" | "delete" | "manage")[] = [],
    private readonly priorityValue: number = 100
  ) {}

  /** Schema for validation */
  static readonly PolicyRuleSchema = S.Struct({
    subjectType: S.Literal("user", "role"),
    subjectId: S.String,
    resourceType: S.Literal("document", "user"),
    resourceId: S.optional(S.String),
    actions: S.Array(S.Literal("read", "write", "delete", "manage")),
    priority: S.Number.pipe(S.int(), S.filter((n) => n >= 1 && n <= 1000))
  })

  static create(input: unknown): Effect.Effect<PolicyRule, ValidationError, never> {
    return S.decodeUnknown(PolicyRule.PolicyRuleSchema)(input).pipe(
      Effect.map(
        (data) =>
          new PolicyRule(
            data.subjectType,
            data.subjectId,
            data.resourceType,
            data.resourceId,
            [...data.actions],
            data.priority
          )
      ),
      Effect.mapError((err) => new ValidationError("Invalid policy rule", "PolicyRule.create"))
    )
  }

  // --- Accessors ---
  get subjectType() { return this.subjectTypeValue }
  get subjectId() { return this.subjectIdValue }
  get resourceType() { return this.resourceTypeValue }
  get resourceId() { return this.resourceIdValue }
  get actions() { return [...this.actionsValue] }
  get priority() { return this.priorityValue }

  // --- Domain helpers ---
  grantsAction(action: "read" | "write" | "delete" | "manage"): boolean {
    return this.actionsValue.includes(action)
  }

  hasHigherPriorityThan(other: PolicyRule): boolean {
    return this.priorityValue < other.priorityValue
  }

  toData() {
    return {
      subjectType: this.subjectTypeValue,
      subjectId: this.subjectIdValue,
      resourceType: this.resourceTypeValue,
      resourceId: this.resourceIdValue,
      actions: [...this.actionsValue],
      priority: this.priorityValue
    }
  }
}
