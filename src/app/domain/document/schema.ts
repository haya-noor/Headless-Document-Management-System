import { Schema as S, Option } from "effect"
import { DocumentGuards } from "./guards"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/shared/uuid"

/**
 * Declarative Document Schema
 */
export const CreateDocumentSchema = S.Struct({
  uploadedBy: UserId, // you might rename to ownerId if consistent
  filename: S.String.pipe(S.minLength(1), S.maxLength(255)),
  mimeType: S.String.pipe(S.minLength(3), S.maxLength(100)),
  size: S.Number.pipe(S.greaterThan(0)),
  checksum: S.optional(S.String.pipe(S.minLength(64), S.maxLength(64))),
  tags: S.optional(S.Union(DocumentGuards.ValidTagList, S.Null)),
  metadata: S.optional(S.Unknown),
})
export type CreateDocumentInput = S.Schema.Type<typeof CreateDocumentSchema>


export type Document = S.Schema.Type<typeof DocumentSchema>

/** Database row representation - uses DateFromSelf to keep Date objects (no serialization) */
export const DocumentRow = S.Struct({
  id: S.String,
  filename: S.String,
  originalName: S.String,
  mimeType: S.String,
  size: S.Number,
  storageKey: S.String,
  storageProvider: S.String,
  checksum: S.Union(S.String, S.Null),
  tags: S.Union(S.Array(S.String), S.Null),
  metadata: S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null),
  uploadedBy: S.Union(S.String, S.Null),  // Can be null in DB
  currentVersion: S.Number,
  isActive: S.Boolean,
  createdAt: S.DateFromSelf,  // Type=Date, Encoded=Date (no serialization)
  updatedAt: S.DateFromSelf   // Type=Date, Encoded=Date (no serialization)
})

export type DocumentRow = S.Schema.Type<typeof DocumentRow>

/** Domain Document Schema - matches DocumentSchemaEntity structure */
export const DocumentSchema = S.Struct({
  id: DocumentId,
  ownerId: UserId,           // Maps from DB's uploadedBy
  title: DocumentGuards.ValidTitle,  // Maps from DB's filename
  description: S.optional(S.Union(DocumentGuards.ValidDescription, S.Null)),
  tags: S.optional(S.Union(DocumentGuards.ValidTagList, S.Null)),
  currentVersionId: DocumentVersionId, // Maps from DB's... wait, we need to handle this
  createdAt: S.Date,
  updatedAt: S.optional(S.Union(S.Date, S.Null))
})


/** Codec — bidirectional domain↔DB - maps between DB field names and Domain field names */
export const DocumentCodec = S.transform(DocumentRow, DocumentSchema, {
  decode: (r) => ({
    id: S.decodeUnknownSync(DocumentId)(r.id),
    ownerId: S.decodeUnknownSync(UserId)(r.uploadedBy || r.id),  // DB uploadedBy -> Domain ownerId (fallback to id if null)
    title: r.filename,  // DB filename -> Domain title
    description: Option.fromNullable(null), // DB doesn't have description
    tags: Option.fromNullable(r.tags),
    currentVersionId: S.decodeUnknownSync(DocumentVersionId)(r.id + '-v' + r.currentVersion),  // Generate from id + version
    createdAt: r.createdAt,
    updatedAt: Option.fromNullable(r.updatedAt)
  }),
  encode: (d) => ({
    id: d.id,
    filename: d.title,  // Domain title -> DB filename
    originalName: d.title, // Use title as originalName
    mimeType: 'application/octet-stream',  // Default, should come from elsewhere
    size: 0,  // Default, should come from elsewhere
    storageKey: `documents/${d.id}`,  // Generate storage key
    storageProvider: 'local',
    checksum: null,
    tags: d.tags ?? null,
    metadata: null,
    uploadedBy: d.ownerId,  // Domain ownerId -> DB uploadedBy
    currentVersion: parseInt(d.currentVersionId.split('-v')[1] || '1'),  // Extract version number
    isActive: true,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt ?? d.createdAt
  }),
  strict: false
})
