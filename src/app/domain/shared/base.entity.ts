import { Option } from "effect"

/**
 * Base interface for all domain entities.
 * 
 * WHY WE NEED THIS:
 * Provides a consistent contract for all domain entities.
 * 
 * WHAT IT DOES:
 * - Defines core properties shared by all entities (id, timestamps)
 * - Ensures consistent typing across the domain layer
 * TId is the type of the id of the entity(user, document, access policy, etc.)
 */
export interface IEntity<TId> {
  readonly id: TId
  readonly createdAt: Date
  readonly updatedAt: Option.Option<Date>
}

/**
 * BaseEntity
 * 
 * Abstract class that defines shared behavior for all domain entities.
 * Subclasses must define how they determine their "active" state
 * and how they are deserialized from plain data.
 */
export abstract class BaseEntity<TId> implements IEntity<TId> {
  // Subclasses must define these properties
  abstract readonly id: TId
  abstract readonly createdAt: Date
  abstract readonly updatedAt: Option.Option<Date>

  // Each entity defines its own active/inactive logic.
  // Example:
  // - User: isActive flag
  // - Document: !isDeleted
  // - AccessPolicy: isEnabled
  abstract isActive(): boolean

  /**
   * Serializes the entity into a plain object for storage or transmission.
   * Converts Option values into JSON-safe types (T or null).
   * 
   * Notes:
   * - getOrNull() returns the underlying value or null if None
   * - Used for repositories or API responses
   * 
   * 
   * We specify serialization in BaseEntity because it's generic and consistent 
   * across all entities,
   * but deserialization is entity-specific, so it can't be implemented in the base class.
   */
  get serialized(): Record<string, unknown> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: Option.getOrNull(this.updatedAt)
    }
  }

  /**
   * Static factory to recreate an entity from serialized data.
   * 
   * WHY STATIC:
   * - Called on the class (e.g., UserEntity.fromSerialized(row))
   * - Not on an instance.
   * 
   * WHY ABSTRACT (throws by default):
   * - Each entity has unique deserialization logic:
   *   field mappings, validation, Option conversions, etc.
   * - BaseEntity defines the contract but not the implementation.
   */
  static fromSerialized<T extends BaseEntity<any>>(
    this: new (...args: any[]) => T,
    data: Record<string, unknown>
  ): T {
    throw new Error("fromSerialized must be implemented by subclasses")
  }
}
