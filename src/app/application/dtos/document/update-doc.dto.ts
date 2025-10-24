import { Schema as S } from "effect";
import { DocumentFields } from "@/app/domain/document/schema";
import { StringToUUID } from "@/app/domain/refined/uuid";

/*
s.extend is used d to expand schemas, especially useful when direct field spreading isn’t 
sufficient, such as when you need to extend a struct with a union of other structs.
*/
export const UpdateDocumentDTOSchema = DocumentFields
  .pick("title", "description", "tags")
  // s.partialWithmeaning makes all picked fields optional
  .pipe(S.partialWith({ exact: true }))
  // s.extend is used to extend the schema with the id field (adds id field
  //  as required with the optional fields from DocumentFields)
  .pipe(S.extend(S.Struct({ id: StringToUUID })));

export type UpdateDocumentDTO = S.Schema.Type<typeof UpdateDocumentDTOSchema>;
export type UpdateDocumentDTOEncoded = S.Schema.Encoded<typeof UpdateDocumentDTOSchema>;
