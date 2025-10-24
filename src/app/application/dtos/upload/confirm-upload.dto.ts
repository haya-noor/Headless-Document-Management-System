import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DocumentVersionFields } from "@/app/domain/d-version/schema"

export const ConfirmUploadDTOSchema = DocumentVersionFields
  .pick("documentId", "checksum", "storageKey", "mimeType", "size")
  .pipe(S.extend(S.Struct({
    userId: UserId
  })))
export type ConfirmUploadDTO = S.Schema.Type<typeof ConfirmUploadDTOSchema>
export type ConfirmUploadDTOEncoded = S.Schema.Encoded<typeof ConfirmUploadDTOSchema>
