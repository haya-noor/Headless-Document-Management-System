import { Schema as S } from "effect"
import { DocumentId } from "@/app/domain/refined/uuid"

/**
 * GetLatestVersion DTO Schema
 * 
 * Input schema for getting the latest version of a document.
 */
export const GetLatestVersionDTOSchema = S.Struct({
  documentId: DocumentId
})

export type GetLatestVersionDTO = S.Schema.Type<typeof GetLatestVersionDTOSchema>
export type GetLatestVersionDTOEncoded = S.Schema.Encoded<typeof GetLatestVersionDTOSchema>

