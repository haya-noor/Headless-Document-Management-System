import { Effect, Schema as S } from "effect"
import { BusinessRuleViolationError, ValidationError } from "@/app/domain/shared/base.errors"

/**
 * DocumentGuards — schema & domain utilities for document-specific fields
 */
export class DocumentGuards {
  /** Title: 1–255 chars, trimmed */
  static readonly ValidTitle = S.String.pipe(
    S.minLength(1),
    S.maxLength(255),
    S.filter((t) => t.trim().length > 0, { message: () => "Title is required" })
  )

  /** Description: ≤1000 chars */
  static readonly ValidDescription = S.String.pipe(
    S.maxLength(1000)
  )

  /** Tags: max 20, unique, alphanumeric w/ dash or underscore */
  static readonly ValidTagList = S.Array(S.String.pipe(S.minLength(1), S.maxLength(50))).pipe(
    S.filter((arr) => arr.length <= 20, { message: () => "Too many tags (max 20)" }),
    S.filter((arr) => new Set(arr.map((t) => t.trim().toLowerCase())).size === arr.length, {
      message: () => "Duplicate tags not allowed"
    })
  )

  /** Tag helpers */
  static normalizeTag(tag: string): string {
    return tag.trim().toLowerCase().replace(/\s+/g, "_")
  }

  /** Validate single tag imperatively */
  static isValidTag(tag: string): boolean {
    return /^[a-zA-Z0-9\-_]+$/.test(tag.trim()) && tag.trim().length <= 50
  }

  static isValidTitle(title: string): boolean {
    return title.trim().length > 0 && title.length <= 255
  }

  static isValidDescription(description?: string | null): boolean {
    return description == null || description.length <= 1000
  }

  /** Effectful operations for tag changes */

  static prepareTagsForAddition(
    existingTags: readonly string[],
    candidateTags: readonly string[]
  ): Effect.Effect<readonly string[], ValidationError | BusinessRuleViolationError, never> {
    const normalizedNew = candidateTags.map(this.normalizeTag).filter((t) => t.length > 0)
    const unique = Array.from(new Set([...existingTags, ...normalizedNew]))

    if (unique.length > 20)
      return Effect.fail(new BusinessRuleViolationError("TOO_MANY_TAGS", "Max 20 tags allowed", { existingTags, candidateTags }))

    return Effect.succeed(unique)
  }

  static prepareTagsForRemoval(
    existingTags: readonly string[],
    tagsToRemove: readonly string[]
  ): Effect.Effect<readonly string[], ValidationError, never> {
    const removals = tagsToRemove.map(this.normalizeTag)
    const remaining = existingTags.filter((t) => !removals.includes(this.normalizeTag(t)))
    return Effect.succeed(remaining)
  }
}
