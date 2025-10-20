/**
 * AccessPolicy Repository - Declarative Implementation with Schema Codec
 * 
 * Uses Effect Schema codec for bidirectional encode/decode validation.
 * All operations composed declaratively via Effect combinators.
 * No imperative control flow - Option.match for all conditionals.
 */

import { Effect, Option, pipe, Schema as S } from "effect";
import { eq, and } from "drizzle-orm";

import { databaseService } from "@/app/infrastructure/services/drizzle-service";
import { accessPolicies } from "@/app/infrastructure/database/models";
import type { InferSelectModel } from "drizzle-orm";

import { AccessPolicyEntity } from "@/app/domain/access-policy/entity";
import { AccessPolicyCodec, AccessPolicyRow } from "@/app/domain/access-policy/schema";
import {
  AccessPolicyValidationError,
} from "@/app/domain/access-policy/errors";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/app/domain/shared/errors";
import { AccessPolicyId, DocumentId, UserId } from "@/app/domain/shared/uuid";

type AccessPolicyModel = InferSelectModel<typeof accessPolicies>;

/**
 * Pure error factory - declarative error construction
 * Single source of truth for error messages and formatting
 */
const Errors = {
  database: (operation: string, cause?: unknown) =>
    new DatabaseError({
      message: `${operation} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    }),

  notFound: (id: string, resource = "AccessPolicy") =>
    new NotFoundError({
      message: `${resource} not found`,
      resource,
      id,
    }),

  conflict: (message: string, field: string) =>
    new ConflictError(message, field),

  validation: (message: string, context: string) =>
    new ValidationError(message, context),
};

/**
 * AccessPolicy Repository Implementation
 */
export class AccessPolicyRepository {
  constructor(private readonly db = databaseService.getDatabase()) {}

  // ---------------------------------------------------------------------------
  // Private Helpers - Schema-based Encoding/Decoding
  // ---------------------------------------------------------------------------

  /**
   * Encodes AccessPolicyEntity to database row using Effect Schema Codec
   * Uses the Codec's encode transformation directly
   */
  private encodePolicy(
    policy: AccessPolicyEntity
  ): Effect.Effect<AccessPolicyRow, ValidationError> {
    // Extract domain data
    const domainData = {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      subjectType: policy.subjectType,
      subjectId: policy.subjectId,
      resourceType: policy.resourceType,
      resourceId: Option.getOrUndefined(policy.resourceId),
      actions: policy.actions,
      isActive: policy.active,
      priority: policy.priority,
      createdAt: policy.createdAt,
      updatedAt: Option.getOrUndefined(policy.updatedAt),
    };

    // Use Codec's encode to transform Domain -> DB Row
    return pipe(
      S.encode(AccessPolicyCodec)(domainData),
      Effect.mapError((err) =>
        Errors.validation(
          `Failed to encode policy: ${err.message}`,
          "AccessPolicy"
        )
      )
    ) as any;
  }

  /**
   * Decodes database row to AccessPolicyEntity using Effect Schema Codec
   * Uses the Codec's decode transformation directly
   */
  private decodePolicy(
    row: AccessPolicyModel
  ): Effect.Effect<AccessPolicyEntity, ValidationError> {
    // Use Codec's decode to transform DB Row -> Domain
    return pipe(
      S.decodeUnknown(AccessPolicyCodec)(row),
      Effect.mapError((err) =>
        Errors.validation(
          `Failed to decode policy: ${err.message}`,
          "AccessPolicy"
        )
      ),
      Effect.flatMap((decoded) => AccessPolicyEntity.create(decoded as any))
    );
  }

  /**
   * Fetch single row - composed declaratively
   */
  private fetchOne(
    query: () => Promise<AccessPolicyModel[]>
  ): Effect.Effect<Option.Option<AccessPolicyEntity>, DatabaseError | ValidationError> {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) => Errors.database("Query", err),
      }),
      Effect.map(Option.fromIterable),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeed(Option.none()),
          onSome: (row) => pipe(this.decodePolicy(row), Effect.map(Option.some)),
        })
      )
    );
  }

  /**
   * Fetch multiple rows - composed declaratively
   * Converts all errors to DatabaseError for consistent error handling
   */
  private fetchMany(
    query: () => Promise<AccessPolicyModel[]>
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: query,
        catch: (err) => Errors.database("Query", err),
      }),
      Effect.flatMap((rows) =>
        Effect.all(rows.map((row) => this.decodePolicy(row)))
      ),
      Effect.mapError((err) =>
        err instanceof DatabaseError
          ? err
          : err instanceof ValidationError
          ? Errors.database(`Decode error: ${err.message}`, err)
          : Errors.database("Decode", err)
      )
    );
  }

  /**
   * Write operation - detects conflicts declaratively
   */
  private executeWrite(
    operation: () => Promise<any>
  ): Effect.Effect<void, DatabaseError | ConflictError> {
    return Effect.tryPromise({
      try: operation,
      catch: (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes("unique") || msg.includes("duplicate")
          ? Errors.conflict(msg, "policy")
          : Errors.database("Write", err);
      },
    }).pipe(Effect.as(void 0));
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  findById(id: AccessPolicyId): Effect.Effect<Option.Option<AccessPolicyEntity>, DatabaseError> {
    return this.fetchOne(() =>
      this.db
        .select()
        .from(accessPolicies)
        .where(eq(accessPolicies.id, id))
        .limit(1)
    ).pipe(
      Effect.mapError((err) =>
        err instanceof DatabaseError ? err : Errors.database(`Find ${id}`, err)
      )
    );
  }

  findByResourceId(
    resourceId: DocumentId
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError> {
    return this.fetchMany(() =>
      this.db
        .select()
        .from(accessPolicies)
        .where(eq(accessPolicies.resourceId, resourceId))
    );
  }

  findBySubject(
    subjectType: "user" | "role",
    subjectId?: UserId,
    roleName?: string
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError> {
    return this.fetchMany(() => {
      // Build conditions declaratively using spread operator
      const baseCondition = eq(accessPolicies.subjectType, subjectType);
      const additionalConditions = [
        ...(subjectType === "user" && subjectId
          ? [eq(accessPolicies.subjectId, subjectId)]
          : []),
        ...(subjectType === "role" && roleName
          ? [eq(accessPolicies.name, roleName)]
          : []),
      ];

      return this.db
        .select()
        .from(accessPolicies)
        .where(
          additionalConditions.length > 0
            ? and(baseCondition, ...additionalConditions)
            : baseCondition
        );
    });
  }

  findByUserAndResource(
    userId: UserId,
    resourceId: DocumentId
  ): Effect.Effect<AccessPolicyEntity[], DatabaseError> {
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
    );
  }

  exists(id: AccessPolicyId): Effect.Effect<boolean, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: accessPolicies.id })
            .from(accessPolicies)
            .where(eq(accessPolicies.id, id))
            .limit(1),
        catch: (err) => Errors.database("Check exists", err),
      }),
      Effect.map((rows) => rows.length > 0)
    );
  }

  // ---------------------------------------------------------------------------
  // Write Operations
  // ---------------------------------------------------------------------------

  save(
    policy: AccessPolicyEntity
  ): Effect.Effect<AccessPolicyEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.findById(policy.id),
      Effect.flatMap(
        Option.match({
          onNone: () => this.insert(policy),
          onSome: () => this.update(policy) as Effect.Effect<AccessPolicyEntity, DatabaseError | ValidationError>,
        })
      ),
      // Convert NotFoundError to DatabaseError for consistent error handling
      Effect.mapError((err) =>
        err instanceof NotFoundError
          ? Errors.database(`Policy ${policy.id} not found during update`, err)
          : err
      )
    );
  }

  private insert(
    policy: AccessPolicyEntity
  ): Effect.Effect<AccessPolicyEntity, DatabaseError | ConflictError | ValidationError> {
    return pipe(
      this.encodePolicy(policy),
      Effect.flatMap((row) =>
        this.executeWrite(() => this.db.insert(accessPolicies).values(row as any))
      ),
      Effect.as(policy)
    );
  }

  private update(
    policy: AccessPolicyEntity
  ): Effect.Effect<AccessPolicyEntity, DatabaseError | ValidationError | NotFoundError> {
    return pipe(
      this.encodePolicy(policy),
      Effect.flatMap((row): Effect.Effect<AccessPolicyEntity, DatabaseError | ValidationError | NotFoundError> =>
        pipe(
          this.exists(policy.id),
          Effect.flatMap((exists): Effect.Effect<AccessPolicyEntity, DatabaseError | NotFoundError> => {
            if (!exists) {
              return Effect.fail(Errors.notFound(policy.id)) as Effect.Effect<
                AccessPolicyEntity,
                NotFoundError
              >;
            }

            return pipe(
              Effect.tryPromise({
                try: () =>
                  this.db
                    .update(accessPolicies)
                    .set(row as any)
                    .where(eq(accessPolicies.id, policy.id)),
                catch: (err) => Errors.database(`Update ${policy.id}`, err),
              }),
              Effect.as(policy)
            ) as Effect.Effect<AccessPolicyEntity, DatabaseError>;
          })
        )
      )
    );
  }

  delete(id: AccessPolicyId): Effect.Effect<boolean, DatabaseError | NotFoundError> {
    return pipe(
      this.exists(id),
      Effect.flatMap((exists) =>
        exists
          ? (pipe(
              Effect.tryPromise({
                try: () => this.db.delete(accessPolicies).where(eq(accessPolicies.id, id)),
                catch: (err) => Errors.database(`Delete ${id}`, err),
              }),
              Effect.as(true)
            ) as Effect.Effect<boolean, DatabaseError | NotFoundError>)
          : (Effect.fail(
              Errors.notFound(id)
            ) as Effect.Effect<boolean, DatabaseError | NotFoundError>)
      )
    );
  }

  deleteByResourceId(
    resourceId: DocumentId
  ): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: accessPolicies.id })
            .from(accessPolicies)
            .where(eq(accessPolicies.resourceId, resourceId)),
        catch: (err) => Errors.database("Count by resource", err),
      }),
      Effect.flatMap((rows) => {
        const count = rows.length;
        if (count === 0) {
          return Effect.succeed(0);
        }

        return pipe(
          Effect.tryPromise({
            try: () =>
              this.db
                .delete(accessPolicies)
                .where(eq(accessPolicies.resourceId, resourceId)),
            catch: (err) => Errors.database("Delete by resource", err),
          }),
          Effect.as(count)
        );
      })
    );
  }

  deleteByUserId(userId: UserId): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.db
            .select({ id: accessPolicies.id })
            .from(accessPolicies)
            .where(
              and(
                eq(accessPolicies.subjectType, "user"),
                eq(accessPolicies.subjectId, userId)
              )
            ),
        catch: (err) => Errors.database("Count by user", err),
      }),
      Effect.flatMap((rows) => {
        const count = rows.length;
        if (count === 0) {
          return Effect.succeed(0);
        }

        return pipe(
          Effect.tryPromise({
            try: () =>
              this.db
                .delete(accessPolicies)
                .where(
                  and(
                    eq(accessPolicies.subjectType, "user"),
                    eq(accessPolicies.subjectId, userId)
                  )
                ),
            catch: (err) => Errors.database("Delete by user", err),
          }),
          Effect.as(count)
        );
      })
    );
  }
}