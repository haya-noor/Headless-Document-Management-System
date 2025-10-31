import { Schema as S } from "effect"
import { DocumentId } from "@/app/domain/refined/uuid"

/**
 * ListVersions DTO Schema
 * 
 * Input schema for listing all versions of a document.
 */
export const ListVersionsDTOSchema = S.Struct({
  documentId: DocumentId
})

export type ListVersionsDTO = S.Schema.Type<typeof ListVersionsDTOSchema>
export type ListVersionsDTOEncoded = S.Schema.Encoded<typeof ListVersionsDTOSchema>

