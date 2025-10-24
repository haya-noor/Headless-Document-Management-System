import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { AccessPolicyFields } from "@/app/domain/access-policy/schema"

export const CheckAccessDTOSchema = AccessPolicyFields
  .pick("actions")
  .pipe(S.extend(S.Struct({
    documentId: DocumentId,
    userId: UserId,
    action: S.Literal("read", "write", "delete", "manage")
  })))
export type CheckAccessDTO = S.Schema.Type<typeof CheckAccessDTOSchema>
export type CheckAccessDTOEncoded = S.Schema.Encoded<typeof CheckAccessDTOSchema>
