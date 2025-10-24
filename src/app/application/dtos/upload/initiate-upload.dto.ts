import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

// here .pick is not applicable because we are not picking 
// fields from the one schema, we're picking fields form multiple schemas
// filename, mimeType, size are picked from the metadata schema 
export const InitiateUploadDTOSchema = S.Struct({
  documentId: DocumentId,
  userId: UserId,
  filename: S.String,
  mimeType: S.String,
  size: S.Number
})
export type InitiateUploadDTO = S.Schema.Type<typeof InitiateUploadDTOSchema>
export type InitiateUploadDTOEncoded = S.Schema.Encoded<typeof InitiateUploadDTOSchema>
