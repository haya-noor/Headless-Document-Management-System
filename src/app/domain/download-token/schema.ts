import { Schema as S, Option } from "effect"
import { DownloadTokenId, DocumentId, UserId } from "@/app/domain/shared/uuid"
import { BaseEntitySchema, Optional } from "@/app/domain/shared/schema.utils"
import { DownloadTokenString } from "./value-object"
import { ExpiryWindow } from "./value-object"

/**
 * Schema for Option<Date> that converts between string | undefined and Option<Date>
 */
const OptionDateSchema = S.optional(S.DateFromString)

/**
 * DownloadToken Schema
 * Defines the structure and validation rules for the DownloadToken entity.
 * Derived from Effect Schema to enforce domain-level invariants.
 */
export const DownloadTokenSchema = S.extend(
  BaseEntitySchema(DownloadTokenId),
  S.Struct({
    token: DownloadTokenString,
    documentId: DocumentId,
    issuedTo: UserId,
    expiresAt: ExpiryWindow()(S.DateFromString),
    usedAt: OptionDateSchema
  })
)

export type DownloadTokenType = S.Schema.Type<typeof DownloadTokenSchema>
export type SerializedDownloadToken = S.Schema.Encoded<typeof DownloadTokenSchema>

/**
 * Database row representation - uses DateFromSelf to keep Date objects (no serialization)
 */
export const DownloadTokenRow = S.Struct({
  id: S.String,
  token: S.String,
  documentId: S.String,
  issuedTo: S.String,
  expiresAt: S.DateFromSelf,  // Type=Date, Encoded=Date (no serialization)
  usedAt: S.Union(S.DateFromSelf, S.Null),  // Type=Date, Encoded=Date
  createdAt: S.DateFromSelf,  // Type=Date, Encoded=Date
  updatedAt: S.Union(S.DateFromSelf, S.Null)  // Type=Date, Encoded=Date
})

export type DownloadTokenRow = S.Schema.Type<typeof DownloadTokenRow>

/**
 * Codec for DB ↔ Domain transformations
 * Now keeps dates as Date objects (no string conversion needed)
 */
export const DownloadTokenCodec = S.transform(DownloadTokenRow, DownloadTokenSchema, {
  decode: (r) => ({
    id: S.decodeUnknownSync(DownloadTokenId)(r.id),
    token: S.decodeUnknownSync(DownloadTokenString)(r.token),
    documentId: S.decodeUnknownSync(DocumentId)(r.documentId),
    issuedTo: S.decodeUnknownSync(UserId)(r.issuedTo),
    expiresAt: r.expiresAt.toISOString(),  // Entity still expects ISO string
    usedAt: r.usedAt ? r.usedAt.toISOString() : undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : undefined
  }),
  encode: (d) => ({
    id: d.id,
    token: d.token,
    documentId: d.documentId,
    issuedTo: d.issuedTo,
    expiresAt: new Date(d.expiresAt),  // Convert ISO string to Date
    usedAt: d.usedAt ? new Date(d.usedAt) : null,
    createdAt: new Date(d.createdAt),
    updatedAt: d.updatedAt ? new Date(d.updatedAt) : null
  }),
  strict: false
})
