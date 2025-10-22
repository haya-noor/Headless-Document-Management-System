import { Effect, Option, Schema as S } from "effect"

/**
 * Base interface for all domain entities.
 * 
 * Defines core properties shared by all entities:
 * - Unique identifier
 * - Audit timestamps (creation and last update)
 * 
 * @template TId - The branded type for the entity's unique identifier
 */
export interface IEntity<TId> {
  readonly id: TId
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Serialized entity type for persistence layer
 * 
 * Represents the plain object format suitable for database storage.
 * All Option types are converted to their underlying values or undefined.
 */
export type SerializedEntity = Record<string, unknown>

/**
 * BaseEntity
 * 
 * Abstract base class providing foundational entity functionality with Effect support.
 * 
 * Key responsibilities:
 * - Define common entity properties (id, createdAt, updatedAt)
 * - Enforce serialization contract via abstract methods
 * - Provide type-safe entity reconstruction from persistence layer
 * 
 * Each concrete entity must implement:
 * - `toDbRow()`: Convert entity → plain object (for DB writes)
 * - Static `fromDbRow()`: Convert plain object → entity (for DB reads)
 * 
 * @template TId - The branded type for entity's unique identifier
 * @template TError - Domain-specific validation error type
 */
export abstract class BaseEntity<TId, TError = Error> implements IEntity<TId> {
  abstract readonly id: TId
  abstract readonly createdAt: Date
  abstract readonly updatedAt: Date

  /**
   * Helper to unwrap Option types for serialization
   * 
   * Converts Option<T> → T | undefined for plain object serialization.
   * This is needed because entity instances store Options, but schemas 
   * expect T | undefined.
   * 
   * @param option - The Option to unwrap
   * @returns The unwrapped value or undefined
   */
  protected unwrapOption<T>(option: Option.Option<T>): T | undefined {
    return Option.getOrUndefined(option)
  }

  /**
   * Helper to unwrap multiple Option fields at once
   * 
   * Useful for batch unwrapping when serializing entities with many optional fields.
   * 
   * @param fields - Object with Option values
   * @returns Object with unwrapped values
   * 
   * @example
   * ```typescript
   * serialize(): Record<string, unknown> {
   *   return {
   *     id: this.id,
   *     ...this.unwrapOptions({
   *       dateOfBirth: this.dateOfBirth,
   *       phoneNumber: this.phoneNumber,
   *       profileImage: this.profileImage
   *     })
   *   }
   * }
   * ```
   */
  protected unwrapOptions<T extends Record<string, Option.Option<any>>>(
    fields: T
  ): { [K in keyof T]: T[K] extends Option.Option<infer U> ? U | undefined : never } {
    const result: any = {}
    for (const [key, value] of Object.entries(fields)) {
      result[key] = Option.getOrUndefined(value)
    }
    return result
  }
}
