import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { Sha256 } from "@/app/domain/refined/checksum"


export const ConfirmUploadDTOSchema = S.Struct({
  documentId: DocumentId,
  userId: UserId,
  checksum: Sha256,
  storageKey: S.String,
  mimeType: S.String,
  size: S.Number
})
export type ConfirmUploadDTO = S.Schema.Type<typeof ConfirmUploadDTOSchema>
export type ConfirmUploadDTOEncoded = S.Schema.Encoded<typeof ConfirmUploadDTOSchema>
