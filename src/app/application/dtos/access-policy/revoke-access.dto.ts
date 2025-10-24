import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { AccessPolicyFields } from "@/app/domain/access-policy/schema"

export const RevokeAccessDTOSchema = AccessPolicyFields
  .pick("subjectId")
  .pipe(S.extend(S.Struct({
    documentId: DocumentId,
    revokedFrom: UserId,
    revokedBy: UserId
  })))
export type RevokeAccessDTO = S.Schema.Type<typeof RevokeAccessDTOSchema>
export type RevokeAccessDTOEncoded = S.Schema.Encoded<typeof RevokeAccessDTOSchema>
