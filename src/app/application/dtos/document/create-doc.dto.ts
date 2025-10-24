import { Schema as S, Effect , Option as O} from "effect"
import { DocumentFields } from "@/app/domain/document/schema"
import { StringToUUID, Uuid } from "@/app/domain/refined/uuid"

// pick and omit 
export const CreateDocumentDTOSchema = DocumentFields
  .pick("ownerId", "title", "description", "tags")
  .pipe(S.extend(S.Struct({})))
export type CreateDocumentDTO = S.Schema.Type<typeof CreateDocumentDTOSchema>
export type CreateDocumentDTOEncoded = S.Schema.Encoded<typeof CreateDocumentDTOSchema>

// entity 
type document = {
  ownerId: Uuid
  title: string
  description: O.Option<string> 
  tags: string[]
}
type documentSerialized = {
  ownerId: string
  title: string
  description: string | null | undefined
  tags: string[]
}