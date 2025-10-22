import { Effect, Option } from "effect"
import { AccessPolicyEntity } from "./entity"
import { AccessPolicyId, UserId, DocumentId } from "@/app/domain/refined/uuid"
import { DatabaseError, ConflictError } from "@/app/domain/shared/base.errors"
import { AccessPolicyValidationError, AccessPolicyNotFoundError } from "./errors"
import { BaseRepository } from "@/app/domain/shared/base.repository"

/**
 * AccessPolicy-specific filter for repository queries
 */
export interface AccessPolicyFilter {
  readonly subjectType?: "user" | "role"
  readonly subjectId?: UserId
  readonly resourceType?: "document" | "user"
  readonly resourceId?: DocumentId
  readonly isActive?: boolean
}

/**
 * Access Policy Repository Interface
 * 
 * Defines all persistence operations for AccessPolicy entities.
 * Manages authorization rules for document access.
 */
export abstract class AccessPolicyRepository extends BaseRepository<
  AccessPolicyEntity,
  AccessPolicyNotFoundError,
  AccessPolicyValidationError | ConflictError
> {
  protected readonly entityName = "AccessPolicy"

  // ---------------------------------------------------------------------------
  // Domain-specific read operations
  // ---------------------------------------------------------------------------

  /**
   * Find all policies for a specific user (subject)
   */
  abstract findBySubjectId(
    subjectId: UserId
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError, never>

  /**
   * Find all policies for a specific resource
   */
  abstract findByResourceId(
    resourceId: DocumentId
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError, never>

  /**
   * Find policies matching the given filter
   */
  abstract findMany(
    filter?: AccessPolicyFilter
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError, never>

  /**
   * Find policies with pagination
   */
  abstract findManyPaginated(
    pagination: PaginationParams,
    filter?: AccessPolicyFilter
  ): Effect.Effect<PaginatedResponse<AccessPolicyEntity>, DatabaseError, never>

  // ---------------------------------------------------------------------------
  // Domain-specific write operations
  // ---------------------------------------------------------------------------

  /**
   * Delete all policies for a specific resource
   * Returns count of deleted policies
   */
  abstract deleteByResourceId(
    resourceId: DocumentId
  ): Effect.Effect<number, DatabaseError, never>

  /**
   * Delete all policies for a specific user
   * Returns count of deleted policies
   */
  abstract deleteByUserId(
    userId: UserId
  ): Effect.Effect<number, DatabaseError, never>
}

