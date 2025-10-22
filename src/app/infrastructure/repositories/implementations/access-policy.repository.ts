import { Effect as E, Option as O, pipe } from "effect"
import { eq, and, desc, asc, count } from "drizzle-orm"

import { databaseService } from "@/app/infrastructure/services/drizzle-service"
import { accessPolicies } from "@/app/infrastructure/database/models"
import type { InferSelectModel } from "drizzle-orm"

type AccessPolicyModel = InferSelectModel<typeof accessPolicies>

import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import {
  AccessPolicyNotFoundError,
  AccessPolicyValidationError,
} from "@/app/domain/access-policy/errors"
import { AccessPolicyFilter } from "@/app/domain/access-policy/repository"
import {
  DatabaseError,
} from "@/app/domain/shared/base.errors"
import {
  calculateOffset,
  buildPaginatedResponse,
  PaginationParams,
  PaginatedResponse,
} from "@/app/domain/shared/pagination"

/**
 * Drizzle-based AccessPolicy Repository Implementation
 *
 * Uses Effect patterns for composable, type-safe database operations.
 * Follows the reference architecture with clean helper methods.
 */
export class AccessPolicyDrizzleRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ========== Serialization Helpers ==========

  /**
   * Serialize entity to database format using Effect Schema
   *
   * Uses entity's serialized() method which automatically handles:
   * - Option<T> → T | undefined
   * - Branded types → primitives
   * - Date objects preserved for database
   */
  private toDbSerialized(policy: AccessPolicyEntity): E.Effect<Record<string, any>, AccessPolicyValidationError, never> {
    return pipe(
      policy.serialized(),
      E.mapError((err) => AccessPolicyValidationError.forField(
        "accessPolicy",
        policy.id,
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : "Failed to serialize entity to database row"
      ))
    ) as E.Effect<Record<string, any>, AccessPolicyValidationError, never>
  }

  /**
   * Deserialize database row to entity using Effect Schema
   *
   * Converts database row → domain entity using AccessPolicyEntity.create
   */
  private fromDbRow(row: AccessPolicyModel): E.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return AccessPolicyEntity.create(row as any)
  }

  // ========== Query Helpers ==========

  /**
   * Execute a database query with error handling
   */
  private executeQuery<T>(query: () => Promise<T>): E.Effect<T, DatabaseError> {
    return E.tryPromise({
      try: query,
      catch: (error) => DatabaseError.forOperation(
        "query",
        error instanceof Error ? error : new Error(String(error))
      )
    })
  }

  /**
   * Fetch a single access policy record
   */
  private fetchSingle(
    query: () => Promise<AccessPolicyModel[]>
  ): E.Effect<O.Option<AccessPolicyEntity>, DatabaseError | AccessPolicyValidationError, never> {
    return pipe(
      this.executeQuery(query),
      E.map(O.fromIterable),
      E.flatMap((option) =>
        O.match(option, {
          onNone: () => E.succeed(O.none()),
          onSome: (row) => pipe(
            this.fromDbRow(row),
            E.map(O.some)
          )
        })
      )
    ) as E.Effect<O.Option<AccessPolicyEntity>, DatabaseError | AccessPolicyValidationError, never>
  }

  /**
   * Ensure policy exists, fail with AccessPolicyNotFoundError if not
   */
  private ensureExists(id: string): E.Effect<void, AccessPolicyNotFoundError, never> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        exists
          ? E.succeed(undefined as void)
          : E.fail(AccessPolicyNotFoundError.forResource("AccessPolicy", id))
      )
    ) as E.Effect<void, AccessPolicyNotFoundError, never>
  }

  // ---------------------------------------------------------------------------
  // Repository Interface
  // ---------------------------------------------------------------------------

  /**
   * Find access policy by ID
   */
  findById(
    id: string
  ): E.Effect<O.Option<AccessPolicyEntity>, DatabaseError | AccessPolicyValidationError> {
    return this.fetchSingle(() =>
      this.db.select().from(accessPolicies).where(eq(accessPolicies.id, id)).limit(1)
    )
  }

  /**
   * Check if policy exists by ID
   */
  exists(id: string): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.executeQuery(() =>
        this.db.select({ id: accessPolicies.id }).from(accessPolicies).where(eq(accessPolicies.id, id)).limit(1)
      ),
      E.map((result) => result.length > 0)
    )
  }

  /**
   * Count policies based on filter
   */
  count(filter?: AccessPolicyFilter): E.Effect<number, DatabaseError> {
    const conditions = [
      ...(filter?.subjectType ? [eq(accessPolicies.subjectType, filter.subjectType)] : []),
      ...(filter?.subjectId ? [eq(accessPolicies.subjectId, filter.subjectId)] : []),
      ...(filter?.resourceType ? [eq(accessPolicies.resourceType, filter.resourceType)] : []),
      ...(filter?.resourceId ? [eq(accessPolicies.resourceId, filter.resourceId)] : []),
      ...(filter?.isActive !== undefined ? [eq(accessPolicies.isActive, filter.isActive ? 'Y' : 'N')] : []),
    ]

    return pipe(
      this.executeQuery(() =>
        this.db
          .select({ count: count() })
          .from(accessPolicies)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      ),
      E.map((result) => Number(result[0]?.count ?? 0))
    )
  }

  /**
   * Find multiple policies
   */
  findMany(
    filter?: AccessPolicyFilter
  ): E.Effect<AccessPolicyEntity[], DatabaseError | AccessPolicyValidationError> {
    const conditions = [
      ...(filter?.subjectType ? [eq(accessPolicies.subjectType, filter.subjectType)] : []),
      ...(filter?.subjectId ? [eq(accessPolicies.subjectId, filter.subjectId)] : []),
      ...(filter?.resourceType ? [eq(accessPolicies.resourceType, filter.resourceType)] : []),
      ...(filter?.resourceId ? [eq(accessPolicies.resourceId, filter.resourceId)] : []),
      ...(filter?.isActive !== undefined ? [eq(accessPolicies.isActive, filter.isActive ? 'Y' : 'N')] : []),
    ]

    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(accessPolicies)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      )
    ) as E.Effect<AccessPolicyEntity[], DatabaseError | AccessPolicyValidationError, never>
  }

  /**
   * Find policies with pagination
   */
  findManyPaginated(
    { page, limit, sortBy = "createdAt", sortOrder = "desc" }: PaginationParams,
    filter?: AccessPolicyFilter
  ): E.Effect<PaginatedResponse<AccessPolicyEntity>, DatabaseError | AccessPolicyValidationError> {
    const offset = calculateOffset(page, limit)
    const orderBy = sortOrder === "asc" ? asc : desc

    const sortColumns: Record<string, any> = {
      name: accessPolicies.name,
      priority: accessPolicies.priority,
      createdAt: accessPolicies.createdAt,
    }
    const sortColumn = sortColumns[sortBy] ?? accessPolicies.createdAt

    const conditions = [
      ...(filter?.subjectType ? [eq(accessPolicies.subjectType, filter.subjectType)] : []),
      ...(filter?.subjectId ? [eq(accessPolicies.subjectId, filter.subjectId)] : []),
      ...(filter?.resourceType ? [eq(accessPolicies.resourceType, filter.resourceType)] : []),
      ...(filter?.resourceId ? [eq(accessPolicies.resourceId, filter.resourceId)] : []),
      ...(filter?.isActive !== undefined ? [eq(accessPolicies.isActive, filter.isActive ? 'Y' : 'N')] : []),
    ]

    return pipe(
      this.executeQuery(() =>
        this.db
          .select()
          .from(accessPolicies)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy(sortColumn))
          .limit(limit)
          .offset(offset)
      ),
      E.flatMap((rows) =>
        E.all(rows.map((row) => this.fromDbRow(row)))
      ),
      E.flatMap((policiesList) =>
        pipe(
          this.count(filter),
          E.map((total) => buildPaginatedResponse(policiesList, page, limit, total))
        )
      )
    ) as E.Effect<PaginatedResponse<AccessPolicyEntity>, DatabaseError | AccessPolicyValidationError, never>
  }

  /**
   * Insert a new policy
   */
  private insert(
    policy: AccessPolicyEntity
  ): E.Effect<AccessPolicyEntity, AccessPolicyValidationError, never> {
    return pipe(
      this.toDbSerialized(policy),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.insert(accessPolicies).values(dbData as any),
          catch: (error) => {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return AccessPolicyValidationError.forField("accessPolicy", { policyId: policy.id }, errorMsg)
          }
        })
      ),
      E.as(policy)
    ) as E.Effect<AccessPolicyEntity, AccessPolicyValidationError, never>
  }

  /**
   * Update an existing policy
   */
  private update(
    policy: AccessPolicyEntity
  ): E.Effect<AccessPolicyEntity, AccessPolicyValidationError | AccessPolicyNotFoundError, never> {
    return pipe(
      this.ensureExists(policy.id),
      E.flatMap(() => this.toDbSerialized(policy)),
      E.flatMap((dbData) =>
        E.tryPromise({
          try: () => this.db.update(accessPolicies).set(dbData as any).where(eq(accessPolicies.id, policy.id)),
          catch: (error) => AccessPolicyValidationError.forField(
            "accessPolicy",
            { policyId: policy.id },
            error instanceof Error ? error.message : String(error)
          )
        })
      ),
      E.as(policy)
    ) as E.Effect<AccessPolicyEntity, AccessPolicyValidationError | AccessPolicyNotFoundError, never>
  }

  /**
   * Delete policy by ID
   */
  delete(id: string): E.Effect<boolean, DatabaseError> {
    return pipe(
      this.exists(id),
      E.flatMap((exists) =>
        E.if(exists, {
          onTrue: () =>
            pipe(
              E.tryPromise({
                try: () => this.db.delete(accessPolicies).where(eq(accessPolicies.id, id)),
                catch: (error) => DatabaseError.forOperation("delete", error)
              }),
              E.as(true)
            ),
          onFalse: () => E.succeed(false)
        })
      )
    )
  }
}
