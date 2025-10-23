import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

export const RevokeAccessDTOSchema = S.Struct({
  documentId: DocumentId,
  revokedFrom: UserId,
  revokedBy: UserId
})
export type RevokeAccessDTO = S.Schema.Type<typeof RevokeAccessDTOSchema>
export type RevokeAccessDTOEncoded = S.Schema.Encoded<typeof RevokeAccessDTOSchema>
