import { Schema as S } from "effect"

export const QueryDocumentsDTOSchema = S.Struct({
  search: S.optional(S.String),
  tag: S.optional(S.String),
  ownerId: S.optional(S.String),
  pageNum: S.optional(S.Number),
  pageSize: S.optional(S.Number)
})
export type QueryDocumentsDTO = S.Schema.Type<typeof QueryDocumentsDTOSchema>
export type QueryDocumentsDTOEncoded = S.Schema.Encoded<typeof QueryDocumentsDTOSchema>
