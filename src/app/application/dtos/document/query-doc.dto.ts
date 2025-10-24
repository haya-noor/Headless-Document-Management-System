import { Schema as S } from "effect"


/*
this is a search/filter dto with query parameters, not entity fields
search, tag, ownerId -> search criteria 
pageNum, pageSize -> pagination parameters 

they're used to query parameters, not domain entity fields. They're used 
to filter and paginate results, not represent entity data. 
*/
export const QueryDocumentsDTOSchema = S.Struct({
  search: S.optional(S.String),
  tag: S.optional(S.String),
  ownerId: S.optional(S.String),
  pageNum: S.optional(S.Number),
  pageSize: S.optional(S.Number)
})
export type QueryDocumentsDTO = S.Schema.Type<typeof QueryDocumentsDTOSchema>
export type QueryDocumentsDTOEncoded = S.Schema.Encoded<typeof QueryDocumentsDTOSchema>
