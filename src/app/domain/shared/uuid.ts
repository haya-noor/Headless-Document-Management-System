import { Schema as S } from "effect"

/**
 * Shared UUID Schema 
 * 
 * Branded UUID base used for all domain entity identifiers.

 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const Uuid = S.String.pipe(
  S.filter((value) => UUID_RE.test(value), { message: () => "Invalid UUID" }),
  S.brand("Uuid")
)
export type Uuid = S.Schema.Type<typeof Uuid>

/**
 * Factory for creating branded UUID schemas for specific domain entities.
 * 
 * Prevents cross-usage between different ID types (e.g., UserId ≠ DocumentId).
 */
const makeIdSchema = <const Brand extends string>(brand: Brand) =>
  Uuid.pipe(S.brand(brand))

// --------------------
// Domain Entity IDs
// --------------------
export const DocumentId = makeIdSchema("DocumentId")
export type DocumentId = S.Schema.Type<typeof DocumentId>

export const DocumentVersionId = makeIdSchema("DocumentVersionId")
export type DocumentVersionId = S.Schema.Type<typeof DocumentVersionId>

export const UserId = makeIdSchema("UserId")
export type UserId = S.Schema.Type<typeof UserId>

export const DownloadTokenId = makeIdSchema("DownloadTokenId")
export type DownloadTokenId = S.Schema.Type<typeof DownloadTokenId>

export const WorkspaceId = makeIdSchema("WorkspaceId")
export type WorkspaceId = S.Schema.Type<typeof WorkspaceId>

export const AccessPolicyId = makeIdSchema("AccessPolicyId")
export type AccessPolicyId = S.Schema.Type<typeof AccessPolicyId>

/**
 * Safe ID constructors
 * 
 * Decode unknown inputs (from HTTP requests, database rows, etc.)
 * into typed, validated domain IDs.
 * 
 * These ensure the domain never receives invalid or cross-typed IDs.
 */
export const makeDocumentId = (input: unknown) => S.decodeUnknown(DocumentId)(input)
export const makeDocumentVersionId = (input: unknown) => S.decodeUnknown(DocumentVersionId)(input)
export const makeUserId = (input: unknown) => S.decodeUnknown(UserId)(input)
export const makeDownloadTokenId = (input: unknown) => S.decodeUnknown(DownloadTokenId)(input)
export const makeWorkspaceId = (input: unknown) => S.decodeUnknown(WorkspaceId)(input)
export const makeAccessPolicyId = (input: unknown) => S.decodeUnknown(AccessPolicyId)(input)

/**
 * Sync versions of the same constructors.
 * Use when the input is already guaranteed to be trusted and valid.
 */
export const makeDocumentIdSync = (input: unknown) => S.decodeUnknownSync(DocumentId)(input)
export const makeDocumentVersionIdSync = (input: unknown) => S.decodeUnknownSync(DocumentVersionId)(input)
export const makeUserIdSync = (input: unknown) => S.decodeUnknownSync(UserId)(input)
export const makeDownloadTokenIdSync = (input: unknown) => S.decodeUnknownSync(DownloadTokenId)(input)
export const makeWorkspaceIdSync = (input: unknown) => S.decodeUnknownSync(WorkspaceId)(input)
export const makeAccessPolicyIdSync = (input: unknown) => S.decodeUnknownSync(AccessPolicyId)(input)
