import { Schema as S, Option } from "effect"
import { DocumentId, DocumentVersionId, UserId } from "@/app/domain/shared/uuid"
import { DocumentVersionGuards } from "./guards"
import { FileKey, FileSize } from "@/app/domain/shared/metadata"
import { Sha256 } from "@/app/domain/shared/checksum"

/** Declarative schema for DocumentVersion domain model */
export const DocumentVersionSchema = S.Struct({
  id: DocumentVersionId,
  documentId: DocumentId,
  version: DocumentVersionGuards.ValidVersion,
  filename: S.String,
  mimeType: S.String,
  size: S.Number,
  storageKey: S.String,
  storageProvider: S.Literal("local", "s3", "gcs"),
  checksum: S.optional(Sha256),
  tags: S.optional(DocumentVersionGuards.ValidTags),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  uploadedBy: UserId,
  createdAt: S.Date
})

export type DocumentVersion = S.Schema.Type<typeof DocumentVersionSchema>

/** Database row representation - uses DateFromSelf to keep Date objects (no serialization) */
export const DocumentVersionRow = S.Struct({
  id: S.String,
  documentId: S.Union(S.String, S.Null),
  version: S.Number,
  filename: S.String,
  mimeType: S.String,
  size: S.Number,
  storageKey: S.String,
  storageProvider: S.String,
  checksum: S.optional(S.String),
  tags: S.optional(S.Array(S.String)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  uploadedBy: S.Union(S.String, S.Null),
  createdAt: S.DateFromSelf  // Type=Date, Encoded=Date (no serialization)
})

export type DocumentVersionRow = S.Schema.Type<typeof DocumentVersionRow>

/** Codec for DB ↔ Domain transformations */
export const DocumentVersionCodec = S.transform(DocumentVersionRow, DocumentVersionSchema, {
  decode: (r) => ({
    id: S.decodeUnknownSync(DocumentVersionId)(r.id),
    documentId: S.decodeUnknownSync(DocumentId)(r.documentId || r.id),
    version: r.version,
    filename: r.filename,
    mimeType: r.mimeType,
    size: r.size,
    storageKey: r.storageKey,
    storageProvider: r.storageProvider as "local" | "s3" | "gcs",
    checksum: r.checksum ? S.decodeUnknownSync(Sha256)(r.checksum) : undefined,
    tags: Option.fromNullable(r.tags),
    metadata: Option.fromNullable(r.metadata),
    uploadedBy: S.decodeUnknownSync(UserId)(r.uploadedBy || r.id),
    createdAt: r.createdAt
  }),
  encode: (d) => ({
    id: d.id,
    documentId: d.documentId || null,
    version: d.version,
    filename: d.filename,
    mimeType: d.mimeType,
    size: d.size,
    storageKey: d.storageKey,
    storageProvider: d.storageProvider,
    checksum: d.checksum,
    tags: d.tags ?? null,
    metadata: d.metadata ?? null,
    uploadedBy: d.uploadedBy || null,
    createdAt: d.createdAt
  }),
  strict: false
})
