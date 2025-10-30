import { Schema as S } from "effect"
import { DocumentFields } from "@/app/domain/document/schema"
import { UserId } from "@/app/domain/refined/uuid"

/**
 * Builder Pattern for Create Document DTO
 * Refactoring Guru Builder Pattern implementation
 */
export class CreateDocumentBuilder {
  private ownerId?: UserId
  private title?: string
  private description?: string
  private tags: string[] = []

  /**
   * Set document owner
   */
  ownedBy(ownerId: UserId | string): this {
    this.ownerId = typeof ownerId === "string" ? ownerId as UserId : ownerId
    return this
  }

  /**
   * Set document title
   */
  withTitle(title: string): this {
    this.title = title
    return this
  }

  /**
   * Set document description
   */
  withDescription(description: string): this {
    this.description = description
    return this
  }

  /**
   * Add tag(s)
   */
  withTags(...tags: string[]): this {
    this.tags = [...new Set([...this.tags, ...tags])]
    return this
  }

  /**
   * Build the DTO
   */
  build(): {
    ownerId: UserId
    title: string
    description?: string
    tags?: string[]
  } {
    if (!this.ownerId) {
      throw new Error("Owner ID is required")
    }
    if (!this.title) {
      throw new Error("Title is required")
    }

    return {
      ownerId: this.ownerId,
      title: this.title,
      ...(this.description && { description: this.description }),
      ...(this.tags.length > 0 && { tags: this.tags }),
    }
  }

  /**
   * Static factory method
   */
  static create(): CreateDocumentBuilder {
    return new CreateDocumentBuilder()
  }
}

