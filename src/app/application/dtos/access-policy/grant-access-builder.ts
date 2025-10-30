import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DocumentAction, Permissions } from "@/app/domain/shared/permissions"

/**
 * Builder Pattern for Grant Access DTO
 * Refactoring Guru Builder Pattern implementation
 * 
 * Reduces parameter passing and provides fluent API
 */
export class GrantAccessBuilder {
  private documentId?: DocumentId
  private grantedTo?: UserId
  private grantedBy?: UserId
  private actions: DocumentAction[] = []
  private priority: number = 100

  /**
   * Set document ID
   */
  forDocument(documentId: DocumentId | string): this {
    this.documentId = typeof documentId === "string" 
      ? documentId as DocumentId 
      : documentId
    return this
  }

  /**
   * Set user to grant access to
   */
  toUser(userId: UserId | string): this {
    this.grantedTo = typeof userId === "string"
      ? userId as UserId
      : userId
    return this
  }

  /**
   * Set user granting the access (owner/admin)
   */
  grantedByUser(userId: UserId | string): this {
    this.grantedBy = typeof userId === "string"
      ? userId as UserId
      : userId
    return this
  }

  /**
   * Add read permission
   */
  withRead(): this {
    if (!this.actions.includes(Permissions.READ)) {
      this.actions.push(Permissions.READ)
    }
    return this
  }

  /**
   * Add write/update permission (synonyms)
   */
  withWrite(): this {
    if (!this.actions.includes(Permissions.WRITE)) {
      this.actions.push(Permissions.WRITE)
    }
    return this
  }

  /**
   * Add update permission (alias for write)
   */
  withUpdate(): this {
    if (!this.actions.includes(Permissions.UPDATE) && !this.actions.includes(Permissions.WRITE)) {
      this.actions.push(Permissions.UPDATE)
    }
    return this
  }

  /**
   * Add delete permission
   */
  withDelete(): this {
    if (!this.actions.includes(Permissions.DELETE)) {
      this.actions.push(Permissions.DELETE)
    }
    return this
  }

  /**
   * Add manage permission (full control)
   */
  withManage(): this {
    if (!this.actions.includes(Permissions.MANAGE)) {
      this.actions.push(Permissions.MANAGE)
    }
    return this
  }

  /**
   * Set multiple actions at once
   */
  withActions(...actions: DocumentAction[]): this {
    this.actions = [...new Set([...this.actions, ...actions])]
    return this
  }

  /**
   * Set priority (1-1000, lower = higher priority)
   */
  withPriority(priority: number): this {
    if (priority >= 1 && priority <= 1000) {
      this.priority = priority
    }
    return this
  }

  /**
   * Build the DTO (validates required fields)
   */
  build(): {
    documentId: DocumentId
    grantedTo: UserId
    grantedBy: UserId
    actions: DocumentAction[]
    priority: number
  } {
    if (!this.documentId) {
      throw new Error("Document ID is required")
    }
    if (!this.grantedTo) {
      throw new Error("Granted to user ID is required")
    }
    if (!this.grantedBy) {
      throw new Error("Granted by user ID is required")
    }
    if (this.actions.length === 0) {
      throw new Error("At least one action is required")
    }

    return {
      documentId: this.documentId,
      grantedTo: this.grantedTo,
      grantedBy: this.grantedBy,
      actions: this.actions,
      priority: this.priority,
    }
  }

  /**
   * Static factory method for common patterns
   */
  static create(): GrantAccessBuilder {
    return new GrantAccessBuilder()
  }

  /**
   * Quick builder for owner granting update permission
   */
  static ownerGrantsUpdate(documentId: DocumentId, ownerId: UserId, targetUserId: UserId): GrantAccessBuilder {
    return new GrantAccessBuilder()
      .forDocument(documentId)
      .grantedByUser(ownerId)
      .toUser(targetUserId)
      .withUpdate()
  }
}

