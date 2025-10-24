import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { AccessPolicyFields } from "@/app/domain/access-policy/schema"

export const GrantAccessDTOSchema = AccessPolicyFields
  .pick("actions", "priority")
  .pipe(S.extend(S.Struct({
    documentId: DocumentId,
    grantedTo: UserId,
    grantedBy: UserId
  })))
export type GrantAccessDTO = S.Schema.Type<typeof GrantAccessDTOSchema>
export type GrantAccessDTOEncoded = S.Schema.Encoded<typeof GrantAccessDTOSchema>
