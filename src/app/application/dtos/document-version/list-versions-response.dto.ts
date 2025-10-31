import { Schema as S } from "effect"
import { DocumentVersionResponseSchema } from "./document-version-response.dto"

/**
 * ListVersions Response DTO Schema
 * 
 * Response schema for listing document versions.
 */
export const ListVersionsResponseSchema = S.Struct({
  data: S.Array(DocumentVersionResponseSchema)
})

export type ListVersionsResponse = S.Schema.Type<typeof ListVersionsResponseSchema>
export type ListVersionsResponseEncoded = S.Schema.Encoded<typeof ListVersionsResponseSchema>

