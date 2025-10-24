import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DocumentVersionFields } from "@/app/domain/d-version/schema"

export const InitiateUploadDTOSchema = DocumentVersionFields
  .pick("documentId", "filename", "mimeType", "size")
  .pipe(S.extend(S.Struct({
    userId: UserId
  })))
export type InitiateUploadDTO = S.Schema.Type<typeof InitiateUploadDTOSchema>
export type InitiateUploadDTOEncoded = S.Schema.Encoded<typeof InitiateUploadDTOSchema>
