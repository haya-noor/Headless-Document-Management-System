import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

export const PublishDocumentDTOSchema = S.Struct({
  documentId: DocumentId,
  userId: UserId
})
export type PublishDocumentDTO = S.Schema.Type<typeof PublishDocumentDTOSchema>
export type PublishDocumentDTOEncoded = S.Schema.Encoded<typeof PublishDocumentDTOSchema>
