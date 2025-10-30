import { Schema as S } from "effect"

/**
 * Declarative guards for AccessPolicy domain validation
 * All validation rules are effect/schema compatible
 */
export class AccessPolicyGuards {
  static readonly ValidName = S.String.pipe(S.minLength(1), S.maxLength(255))
  static readonly ValidDescription = S.String.pipe(S.maxLength(1000))

  static readonly ValidPriority = S.Number.pipe(
    S.int(),
    S.filter((n) => n >= 1 && n <= 1000, { message: () => "Priority must be between 1 and 1000" })
  )

  static readonly ValidActions = S.Array(S.Literal("read", "write", "delete", "manage")).pipe(
    S.filter((arr) => arr.length > 0 && arr.length <= 4, {
      message: () => "Actions must contain 1–4 valid permissions"
    })
  )

  static isValidActions(actions: string[]): boolean {
    const valid = ["read", "write", "delete", "manage"]
    return Array.isArray(actions) && actions.length > 0 && actions.length <= 4 && actions.every((a) => valid.includes(a))
  }

  static isValidPriority(priority: number): boolean {
    return Number.isInteger(priority) && priority >= 1 && priority <= 1000
  }
}
