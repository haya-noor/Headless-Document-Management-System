// access-policy.drizzle.repository.ts

// Effect primitives (E = Effect, O = Option, pipe for composition)
// Schema import is unused in this file, but keeping your original import list intact
import { Effect as E, Option as O, pipe, Schema as S } from "effect"
import { eq, and } from "drizzle-orm"

import { AccessPolicyEntity } from "../../../domain/access-policy/entity"
import {
  AccessPolicyNotFoundError,
  AccessPolicyValidationError
} from "../../../domain/access-policy/errors"
import {
  AccessPolicyCodec,
  type AccessPolicyRow
} from "../../../domain/access-policy/schema"
import { DocumentId, UserId } from "../../../domain/shared/uuid"

// Drizzle table object for access_policies
import { accessPolicies } from "../../database/models/access-policy-model"

/**
 * Access Policy Repository
 * - Maps between domain entity and DB row using AccessPolicyCodec
 * - Validates construction via AccessPolicyEntity.create(...)
 */
export class AccessPolicyRepository {
  // db is expected to be a Drizzle client/connection implementing select/insert/update/delete
  constructor(private readonly db: any) {}

  // ---------- Mapping helpers ----------

  private toRow(policy: AccessPolicyEntity): E.Effect<AccessPolicyRow, AccessPolicyValidationError> {
    // Prepare a persistence-ready row from the domain entity.
    // Note: Option fields are converted to null/undefined as expected by your DB schema.
    const rowData: AccessPolicyRow = {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      subjectType: policy.subjectType,
      subjectId: policy.subjectId,
      resourceType: policy.resourceType,
      // Convert Option<DocumentId> to nullable for DB
      resourceId: O.getOrNull(policy.resourceId) ?? undefined,
      actions: policy.actions,
      isActive: policy.isActive(),
      priority: policy.priority,
      createdAt: policy.createdAt,
      // Convert Option<Date> to nullable for DB
      updatedAt: O.getOrNull(policy.updatedAt) ?? undefined
    }

    // We’re not re-validating here; entity invariants were already checked.
    return E.succeed(rowData)
  }

  private fromRow(row: AccessPolicyRow): E.Effect<AccessPolicyEntity, AccessPolicyValidationError> {
    // Convert raw DB row back to domain shape understood by the entity factory
    const domainData = {
      id: row.id,
      name: row.name,
      description: row.description,
      subjectType: row.subjectType as "user" | "role",
      subjectId: row.subjectId,
      resourceType: row.resourceType as "document" | "user",
      resourceId: row.resourceId, // entity factory accepts nullable/undefined for optional
      actions: row.actions as ("read" | "write" | "delete" | "manage")[],
      isActive: row.isActive,
      priority: row.priority,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }

    // Validate + construct domain entity (returns Effect with AccessPolicyValidationError on failure)
    return AccessPolicyEntity.create(domainData)
  }

  // ---------- Query helpers ----------

  // Wrap a promise-returning thunk in Effect, mapping unknown errors to NotFoundError
  private exec<T>(thunk: () => Promise<T>, onErr?: (e: unknown) => Error): E.Effect<T, AccessPolicyNotFoundError> {
    return E.tryPromise({
      try: thunk,
      catch: (e) =>
        new AccessPolicyNotFoundError(
          "unknown",
          "unknown",
          onErr ? String(onErr(e)) : (e instanceof Error ? e.message : String(e))
        )
    })
  }

  // Execute a query expected to return 0..1 rows and decode to Option<Entity>
  private fetchOne(q: () => Promise<AccessPolicyRow[]>): E.Effect<O.Option<AccessPolicyEntity>, AccessPolicyNotFoundError | AccessPolicyValidationError> {
    return pipe(
      this.exec(q),
      E.map((rows) => rows[0] ?? undefined),                  // pick first row if present
      E.flatMap((rowOrUndef) =>
        rowOrUndef
          ? pipe(this.fromRow(rowOrUndef), E.map(O.some))     // decode to entity
          : E.succeed(O.none())                               // no rows → none
      )
    )
  }

  // Execute a query returning many rows and decode to readonly array of entities
  private fetchMany(q: () => Promise<AccessPolicyRow[]>): E.Effect<readonly AccessPolicyEntity[], AccessPolicyNotFoundError | AccessPolicyValidationError> {
    return pipe(
      this.exec(q),
      E.flatMap((rows) => E.all(rows.map((r) => this.fromRow(r)))) // decode all rows
    )
  }

  // ---------- Repository API ----------

  // Find by primary id
  findById(id: string) {
    return this.fetchOne(() =>
      this.db.select().from(accessPolicies).where(eq(accessPolicies.id, id)).limit(1)
    )
  }

  // Get all policies for a resource
  findByResourceId(resourceId: DocumentId) {
    return this.fetchMany(() =>
      this.db.select().from(accessPolicies).where(eq(accessPolicies.resourceId, resourceId))
    )
  }

  // Query policies by subject (user/role). If roleName maps to a dedicated column in your schema, adjust accordingly.
  findBySubject(subjectType: "user" | "role", subjectId?: UserId, roleName?: string) {
    return this.fetchMany(() => {
      const conds = [eq(accessPolicies.subjectType, subjectType)]
      if (subjectType === "user" && subjectId) conds.push(eq(accessPolicies.subjectId, subjectId))
      // Using name as role discriminator here; replace with role column if you have one.
      if (subjectType === "role" && roleName) conds.push(eq(accessPolicies.name, roleName))
      return this.db.select().from(accessPolicies).where(and(...conds))
    })
  }

  // All policies for a specific user on a specific resource
  findByUserAndResource(userId: UserId, resourceId: DocumentId) {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(accessPolicies)
        .where(
          and(
            eq(accessPolicies.resourceId, resourceId),
            eq(accessPolicies.subjectType, "user"),
            eq(accessPolicies.subjectId, userId)
          )
        )
    )
  }

  // Fast existence check by id (SELECT 1 pattern)
  exists(id: string) {
    return pipe(
      this.exec<Pick<AccessPolicyRow, "id">[]>(
        () =>
          this.db
            .select({ id: accessPolicies.id })
            .from(accessPolicies)
            .where(eq(accessPolicies.id, id))
            .limit(1)
      ),
      E.map((rows) => rows.length > 0)
    )
  }

  // Ensure policy exists or fail with NotFound
  private ensureExists(id: string) {
    return pipe(
      this.exists(id),
      E.flatMap((ok) =>
        E.if(ok, {
          onTrue: () => E.void,
          onFalse: () => E.fail(new AccessPolicyNotFoundError("id", id))
        })
      )
    )
  }

  // Upsert-like: insert if not found, otherwise update
  save(policy: AccessPolicyEntity) {
    return pipe(
      this.findById(policy.id),
      E.flatMap((opt) =>
        O.match(opt, {
          onNone: () => this.insert(policy),
          onSome: () => this.update(policy)
        })
      )
    )
  }

  // Insert a new policy
  private insert(policy: AccessPolicyEntity) {
    return pipe(
      this.toRow(policy),
      E.flatMap((row) =>
        E.tryPromise({
          try: () => this.db.insert(accessPolicies).values(row),
          catch: (e) =>
            new AccessPolicyValidationError(
              "insert",
              policy.id,
              e instanceof Error ? e.message : String(e)
            )
        })
      ),
      E.as(policy) // return the same domain entity on success
    )
  }

  // Update an existing policy
  private update(policy: AccessPolicyEntity) {
    return pipe(
      this.ensureExists(policy.id),
      E.flatMap(() => this.toRow(policy)),
      E.flatMap((row) =>
        E.tryPromise({
          try: () =>
            this.db.update(accessPolicies).set(row).where(eq(accessPolicies.id, policy.id)),
          catch: (e) =>
            new AccessPolicyValidationError(
              "update",
              policy.id,
              e instanceof Error ? e.message : String(e)
            )
        })
      ),
      E.as(policy) // return the domain entity on success
    )
  }

  // Delete by id (returns false if already absent)
  delete(id: string) {
    return pipe(
      this.exists(id),
      E.flatMap((ok) =>
        E.if(ok, {
          onTrue: () =>
            pipe(
              this.exec(() => this.db.delete(accessPolicies).where(eq(accessPolicies.id, id))),
              E.as(true)
            ),
          onFalse: () => E.succeed(false)
        })
      )
    )
  }

  // Bulk delete by resource; returns number of deleted rows (counted via a pre-select)
  deleteByResourceId(resourceId: DocumentId) {
    return this.exec(async () => {
      const ids = await this.db
        .select({ id: accessPolicies.id })
        .from(accessPolicies)
        .where(eq(accessPolicies.resourceId, resourceId))

      const count = ids.length
      if (count > 0) {
        await this.db.delete(accessPolicies).where(eq(accessPolicies.resourceId, resourceId))
      }
      return count
    })
  }

  // Bulk delete all user-targeted policies for a given user; returns number deleted
  deleteByUserId(userId: UserId) {
    return this.exec(async () => {
      const ids = await this.db
        .select({ id: accessPolicies.id })
        .from(accessPolicies)
        .where(and(eq(accessPolicies.subjectType, "user"), eq(accessPolicies.subjectId, userId)))

      const count = ids.length
      if (count > 0) {
        await this.db
          .delete(accessPolicies)
          .where(and(eq(accessPolicies.subjectType, "user"), eq(accessPolicies.subjectId, userId)))
      }
      return count
    })
  }
}
