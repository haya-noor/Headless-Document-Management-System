import { Schema as S } from "effect"
import { DocumentId } from "@/app/domain/refined/uuid"
import { DocumentVersionGuards } from "@/app/domain/d-version/guards"

/**
 * GetVersion DTO Schema
 * 
 * Input schema for getting a specific version of a document.
 */
export const GetVersionDTOSchema = S.Struct({
  documentId: DocumentId,
  version: DocumentVersionGuards.ValidVersion
})

export type GetVersionDTO = S.Schema.Type<typeof GetVersionDTOSchema>
export type GetVersionDTOEncoded = S.Schema.Encoded<typeof GetVersionDTOSchema>

