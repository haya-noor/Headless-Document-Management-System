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
 * Database row schema - matches actual DB structure
 * Uses DateFromSelf to keep Date objects (no serialization to strings)
 * Note: isActive is varchar 'Y'/'N' in DB, not boolean
 */
export const AccessPolicyRow = S.Struct({
  id: S.String,
  name: S.String,
  description: S.Union(S.String, S.Null),
  subjectType: S.String,
  subjectId: S.Union(S.String, S.Null),
  resourceType: S.String,
  resourceId: S.Union(S.String, S.Null),
  actions: S.Array(S.String),
  isActive: S.String,  // 'Y' or 'N' in database
  priority: S.Number,
  createdAt: S.DateFromSelf,  // Type=Date, Encoded=Date (no serialization)
  updatedAt: S.DateFromSelf   // Type=Date, Encoded=Date (no serialization)
})
export type AccessPolicyRow = S.Schema.Type<typeof AccessPolicyRow>

/**
 * Codec for DB ↔ Domain
 * Handles conversion between DB format (Y/N strings, nulls) and Domain (booleans, Options)
 */
export const AccessPolicyCodec = S.transform(AccessPolicyRow, AccessPolicySchema, {
  decode: (r) => ({
    id: S.decodeUnknownSync(AccessPolicyId)(r.id),
    name: r.name,
    description: r.description || "",
    subjectType: r.subjectType as "user" | "role",
    subjectId: S.decodeUnknownSync(UserId)(r.subjectId || r.id),
    resourceType: r.resourceType as "document" | "user",
    resourceId: r.resourceId ? S.decodeUnknownSync(DocumentId)(r.resourceId) : undefined,
    actions: r.actions as ("read" | "write" | "delete" | "manage")[],
    isActive: r.isActive === 'Y',  // Convert 'Y'/'N' to boolean
    priority: r.priority,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }),
  encode: (d) => ({
    id: d.id,
    name: d.name,
    description: d.description || null,
    subjectType: d.subjectType,
    subjectId: d.subjectId || null,
    resourceType: d.resourceType,
    resourceId: d.resourceId || null,
    actions: d.actions,
    isActive: d.isActive ? 'Y' : 'N',  // Convert boolean to 'Y'/'N'
    priority: d.priority,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt ?? d.createdAt
  }),
  strict: false
})
