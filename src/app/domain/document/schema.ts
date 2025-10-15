import { Schema as S, Option } from "effect"
import { DocumentGuards } from "./guards"
import { DocumentId, DocumentVersionId, UserId } from "../shared/uuid"

/**
 * Declarative Document Schema
 */
export const DocumentSchema = S.Struct({
  id: DocumentId,
  ownerId: UserId,
  title: DocumentGuards.ValidTitle,
  currentVersionId: DocumentVersionId,
  createdAt: S.Date,
  description: S.optional(S.Union(DocumentGuards.ValidDescription, S.Null)),
  tags: S.optional(S.Union(DocumentGuards.ValidTagList, S.Null)),
  updatedAt: S.optional(S.Union(S.Date, S.Null))
})

export type Document = S.Schema.Type<typeof DocumentSchema>

/** Database row representation */
export const DocumentRow = S.Struct({
  id: S.String,
  ownerId: S.String,
  title: S.String,
  description: S.optional(S.String),
  tags: S.optional(S.Array(S.String)),
  currentVersionId: S.String,
  createdAt: S.Date,
  updatedAt: S.Union(S.Date, S.Null)
})

export type DocumentRow = S.Schema.Type<typeof DocumentRow>

/** Codec — bidirectional domain↔DB */
export const DocumentCodec = S.transform(DocumentRow, DocumentSchema, {
  decode: (r) => ({
    id: S.decodeUnknownSync(DocumentId)(r.id),
    ownerId: S.decodeUnknownSync(UserId)(r.ownerId),
    title: r.title,
    description: Option.fromNullable(r.description),
    tags: Option.fromNullable(r.tags),
    currentVersionId: S.decodeUnknownSync(DocumentVersionId)(r.currentVersionId),
    createdAt: r.createdAt,
    updatedAt: Option.fromNullable(r.updatedAt)
  }),
  encode: (d) => ({
    id: S.encodeUnknownSync(DocumentId)(d.id),
    ownerId: S.encodeUnknownSync(UserId)(d.ownerId),
    title: d.title,
    description: Option.getOrNull(d.description as string | undefined),
    tags: Option.getOrNull(d.tags as string[] | undefined),
    currentVersionId: S.encodeUnknownSync(DocumentVersionId)(d.currentVersionId),
    createdAt: d.createdAt,
    updatedAt: Option.getOrNull(d.updatedAt)
  }),
  strict: false
})
