import { Schema as S } from "effect"
import { DocumentGuards } from "@/app/domain/document/guards"
import { StringToUUID } from "@/app/domain/refined/uuid"

export const CreateDocumentDTOSchema = S.Struct({
  ownerId: StringToUUID,
  title: DocumentGuards.ValidTitle,
  description: S.optional(DocumentGuards.ValidDescription),
  tags: S.optional(DocumentGuards.ValidTagList)
})
export type CreateDocumentDTO = S.Schema.Type<typeof CreateDocumentDTOSchema>
export type CreateDocumentDTOEncoded = S.Schema.Encoded<typeof CreateDocumentDTOSchema>
