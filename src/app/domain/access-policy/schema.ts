import { Option, Schema as S } from "effect"
import { AccessPolicyGuards } from "./guards"
import { AccessPolicyId, UserId, DocumentId } from "@/app/domain/shared/uuid"
import { DateTimeFromAny } from "@/app/domain/shared/date-time"

/**
 * Domain schema
 */
export const AccessPolicySchema = S.Struct({
  id: AccessPolicyId,
  name: AccessPolicyGuards.ValidName,
  description: AccessPolicyGuards.ValidDescription,
  subjectType: S.Literal("user", "role"),
  subjectId: UserId,
  resourceType: S.Literal("document", "user"),
  resourceId: S.optional(DocumentId),
  actions: AccessPolicyGuards.ValidActions,
  isActive: S.Boolean,
  priority: AccessPolicyGuards.ValidPriority,
  createdAt: S.Date,
  updatedAt: S.optional(S.Date)
})
export type AccessPolicy = S.Schema.Type<typeof AccessPolicySchema>

/**
 * Serialized form (for input/API)
 */
export const AccessPolicySerialized = S.Struct({
  id: AccessPolicyId,
  name: AccessPolicyGuards.ValidName,
  description: AccessPolicyGuards.ValidDescription,
  subjectType: S.Literal("user", "role"),
  subjectId: UserId,
  resourceType: S.Literal("document", "user"),
  resourceId: S.optional(DocumentId),
  actions: AccessPolicyGuards.ValidActions,
  isActive: S.Boolean,
  priority: AccessPolicyGuards.ValidPriority,
  createdAt: S.String,
  updatedAt: S.optional(S.String)
})
export type AccessPolicySerialized = S.Schema.Type<typeof AccessPolicySerialized>

/**
 * Database row schema (encoded)
 */
export const AccessPolicyRow = S.Struct({
  id: S.String,
  name: S.String,
  description: S.String,
  subjectType: S.String,
  subjectId: S.String,
  resourceType: S.String,
  resourceId: S.optional(S.String),
  actions: S.Array(S.String),
  isActive: S.Boolean,
  priority: S.Number,
  createdAt: S.Date,
  updatedAt: S.optional(S.Date)
})
export type AccessPolicyRow = S.Schema.Type<typeof AccessPolicyRow>

/**
 * Codec for DB ↔ Domain
 */
export const AccessPolicyCodec = S.transform(AccessPolicyRow, AccessPolicySchema, {
  decode: (r) => ({
    id: S.decodeUnknownSync(AccessPolicyId)(r.id),
    name: r.name,
    description: r.description,
    subjectType: r.subjectType as "user" | "role",
    subjectId: S.decodeUnknownSync(UserId)(r.subjectId),
    resourceType: r.resourceType as "document" | "user",
    resourceId: Option.fromNullable(r.resourceId).pipe(Option.map((id) => S.decodeUnknownSync(DocumentId)(id))),
    actions: r.actions as ("read" | "write" | "delete" | "manage")[],
    isActive: r.isActive,
    priority: r.priority,
    createdAt: r.createdAt,
    updatedAt: Option.fromNullable(r.updatedAt)
  }),
  encode: (d) => ({
    id: S.encodeUnknownSync(AccessPolicyId)(d.id),
    name: d.name,
    description: d.description,
    subjectType: d.subjectType,
    subjectId: S.encodeUnknownSync(UserId)(d.subjectId),
    resourceType: d.resourceType,
    resourceId: d.resourceId ? d.resourceId : null,
    actions: d.actions,
    isActive: d.isActive,
    priority: d.priority,
    createdAt: d.createdAt,
    updatedAt: Option.getOrNull(d.updatedAt as Option.Option<Date>)
  }),
  strict: false
})
