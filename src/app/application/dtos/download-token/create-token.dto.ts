import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

export const CreateDownloadTokenDTOSchema = S.Struct({
  documentId: DocumentId,
  issuedTo: UserId,
  // S.DateFromSelf is a helper function that converts a date string to a date object
  // bc we receive a date string from the client and we need to convert it to a date object
  expiresAt: S.DateFromSelf
})
export type CreateDownloadTokenDTO = S.Schema.Type<typeof CreateDownloadTokenDTOSchema>
export type CreateDownloadTokenDTOEncoded = S.Schema.Encoded<typeof CreateDownloadTokenDTOSchema>
