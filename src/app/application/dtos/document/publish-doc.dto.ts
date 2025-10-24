import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

// haven't used .pick here, because this is workflow dto, documentId
// userId are just references to existing entities 
// this is not entity data, it needs to identify which document and user
// are involved in the action 
export const PublishDocumentDTOSchema = S.Struct({
  documentId: DocumentId,
  userId: UserId
})
export type PublishDocumentDTO = S.Schema.Type<typeof PublishDocumentDTOSchema>
export type PublishDocumentDTOEncoded = S.Schema.Encoded<typeof PublishDocumentDTOSchema>
