import { DocumentFields } from "@/app/domain/document/schema"
import { PaginationOptions } from "@/app/domain/shared/pagination"
import { Schema as S } from "effect"

/*
Query DTO that combines:
- DocumentFields.ownerId for filtering by owner
- PaginationOptions for pagination parameters
- Additional search/filter fields
*/
export const QueryDocumentsDTOSchema = DocumentFields
  .pick("ownerId")  
  .pipe(S.extend(PaginationOptions.pick("page", "limit")))
  .pipe(S.extend(S.Struct({
    search: S.optional(S.String),  
    tag: S.optional(S.String)
  })))
export type QueryDocumentsDTO = S.Schema.Type<typeof QueryDocumentsDTOSchema>
export type QueryDocumentsDTOEncoded = S.Schema.Encoded<typeof QueryDocumentsDTOSchema>
