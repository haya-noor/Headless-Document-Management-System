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
