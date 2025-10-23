import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

export const InitiateUploadDTOSchema = S.Struct({
  documentId: DocumentId,
  userId: UserId,
  filename: S.String,
  mimeType: S.String,
  size: S.Number
})
export type InitiateUploadDTO = S.Schema.Type<typeof InitiateUploadDTOSchema>
export type InitiateUploadDTOEncoded = S.Schema.Encoded<typeof InitiateUploadDTOSchema>
