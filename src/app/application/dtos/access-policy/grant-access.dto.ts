import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { AccessPolicyGuards } from "@/app/domain/access-policy/guards"

export const GrantAccessDTOSchema = S.Struct({
  documentId: DocumentId,
  grantedTo: UserId,
  grantedBy: UserId,
  actions: AccessPolicyGuards.ValidActions,
  priority: AccessPolicyGuards.ValidPriority
})
export type GrantAccessDTO = S.Schema.Type<typeof GrantAccessDTOSchema>
export type GrantAccessDTOEncoded = S.Schema.Encoded<typeof GrantAccessDTOSchema>
